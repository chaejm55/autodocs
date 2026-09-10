// Vercel / Serverless function for /api/extract
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(500).json({ 
      error: '서버 환경변수에 OPENROUTER_API_KEY가 설정되지 않았습니다. 환경변수를 등록해 주세요.' 
    });
  }

  const { model, text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '변환할 내용(text)이 비어있습니다.' });
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
`;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const userPrompt = `오늘 날짜는 ${todayStr}입니다.\n\n[변환할 사용자 입력 내용]:\n${text.trim()}`;

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.referer || 'https://github.com/chaejm55/autodocs',
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
      return res.status(openRouterResponse.status).json({ 
        error: `OpenRouter API 오류 (${openRouterResponse.status}): ${errText}` 
      });
    }

    const data = await openRouterResponse.json();
    const rawContent = data.choices?.[0]?.message?.content || '{}';
    const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json({
      parsedData: parsed,
      usage: data.usage || null,
      modelUsed: data.model || model
    });
  } catch (err) {
    console.error('Serverless API Error:', err);
    return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
  }
}
