/**
 * Cloudflare Pages Functions - /api/extract 엔드포인트
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return new Response(JSON.stringify({
      error: 'Cloudflare Pages 환경변수에 OPENROUTER_API_KEY가 설정되지 않았습니다. 대시보드 Settings > Environment Variables에 등록해 주세요.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const { model, text } = body;
  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ error: '변환할 내용(text)이 비어있습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const SYSTEM_PROMPT = `
당신은 사용자의 비정형 구어체 텍스트(메모, 메일, 메신저 대화, 음성 녹취록 등)를 분석하여 대한민국 표준 견적서 항목에 맞춰 정밀하게 JSON 데이터로 변환하는 전문 AI 어시스턴트입니다.

[출력 형식 가이드]
반드시 다음 JSON 규격으로만 응답해야 합니다. 마크다운(\`\`\`json)이나 다른 설명글 없이 오직 순수한 JSON 문자열만 반환하세요:

{
  "client_name": "수신 업체명 또는 고객 이름 (언급 없으면 빈 문자열)",
  "date": "YYYY-MM-DD 형식 (언급 없으면 오늘 날짜)",
  "doc_no": "견적 번호 (언급 없으면 빈 문자열)",
  "items": [
    {
      "name": "품목명 (간결하고 명확하게)",
      "spec": "규격 또는 모델 사양 (언급 없으면 빈 문자열)",
      "quantity": 수량 (숫자, 기본값 1),
      "unit_price": 공급단가 (부가세 제외된 1개당 단가, 숫자),
      "note": "비고 (특이사항 없으면 빈 문자열)"
    }
  ],
  "notes": "특기사항, 결제 조건, 납기일, 유효기간 등 (언급 없으면 빈 문자열)"
}

[추출 및 정제 규칙]
1. 단가(unit_price)와 수량(quantity):
   - 금액은 모두 원(KRW) 단위의 순수 정수 숫자로 추출합니다. (예: 50000)
   - "3개에 30만원"처럼 총액으로 언급된 경우: quantity=3, unit_price=100000 (300000 / 3)으로 계산합니다.
   - "만원", "천원" 등 한국어 수사 단위를 정확히 숫자로 변환합니다 (예: "25만원" -> 250000, "150만원" -> 1500000).
   - 수량이 명시되지 않은 경우 1로 간주합니다.
2. 부가세 처리:
   - 한국 견적서는 통상 '공급단가'를 적고 부가세(10%)는 서식에서 자동으로 덧붙입니다.
   - 만약 입력에 'VAT 포함 11만원'이라고 명시된 경우 공급가 100000원으로 역산하고, 일반적인 언급인 경우 언급된 금액을 공급단가로 취급하세요.
3. 품목 분리:
   - 문장 속에 나열된 여러 제품/서비스를 각각 개별 품목 아이템으로 분리하세요.
   - 배송비나 설치비, 공임비 등이 포함되어 있다면 독립된 품목(예: "설치 및 세팅비", "운송비")으로 분리하세요.
4. 특기사항:
   - "다음 주 수요일까지 납품 희망", "견적 유효기간 15일", "세금계산서 발행 요청" 등의 조건은 "notes" 필드에 정리해 주세요.
`;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userPrompt = `오늘 날짜는 ${todayStr}입니다.\n\n[변환할 사용자 입력 내용]:\n${text.trim()}`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || 'https://autodocs.pages.dev',
        'X-Title': 'Doc Auto Fill Service'
      },
      body: JSON.stringify({
        model: model || 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!openRouterResponse.ok) {
      const errText = await openRouterResponse.text();
      return new Response(JSON.stringify({
        error: `OpenRouter API 오류 (${openRouterResponse.status}): ${errText}`
      }), {
        status: openRouterResponse.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    const data = await openRouterResponse.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify({
      parsedData: parsed,
      usage: data.usage || null,
      modelUsed: data.model || model
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || '서버 내부 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}
