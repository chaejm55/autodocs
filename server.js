const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. 순수 Node.js 무의존성 .env 파일 로더
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) {
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

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

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const reqPath = urlParts[0];

  // API Route: POST /api/extract (OpenRouter Proxy)
  if (req.method === 'POST' && reqPath === '/api/extract') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey || !apiKey.trim()) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ 
            error: '서버 환경변수에 OPENROUTER_API_KEY가 설정되지 않았습니다. .env 파일에 OPENROUTER_API_KEY를 입력해 주세요.' 
          }));
          return;
        }

        const { model, text } = JSON.parse(body || '{}');
        if (!text || !text.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '변환할 내용(text)이 비어있습니다.' }));
          return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const userPrompt = `오늘 날짜는 ${todayStr}입니다.\n\n[변환할 사용자 입력 내용]:\n${text.trim()}`;

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': req.headers.origin || `http://localhost:${PORT}`,
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
          res.writeHead(openRouterResponse.status, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `OpenRouter API 오류 (${openRouterResponse.status}): ${errText}` }));
          return;
        }

        const data = await openRouterResponse.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          parsedData: parsed,
          usage: data.usage || null,
          modelUsed: data.model || model
        }));
      } catch (err) {
        console.error('API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message || '서버 내부 오류가 발생했습니다.' }));
      }
    });
    return;
  }

  // Static File Serving
  let reqUrl = reqPath;
  if (reqUrl === '/') reqUrl = '/index.html';

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Smart Quotation Service running at: http://localhost:${PORT}`);
});
