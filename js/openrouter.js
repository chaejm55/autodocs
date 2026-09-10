/**
 * openrouter.js - 서버 프록시 API(/api/extract)를 통한 안전한 견적서 데이터 추출 모듈
 * (OpenRouter API Key는 서버 환경변수로 관리되어 클라이언트에 노출되지 않습니다)
 */

export const AVAILABLE_MODELS = [
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (추천 · 초고속/초저비용)', cost: '약 ₩0.14 / 1천토큰' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (가성비 최강)', cost: '약 ₩0.20 / 1천토큰' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash (초경량)', cost: '약 ₩0.10 / 1천토큰' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (무료 모델)', cost: '무료 (Free Tier)' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (한국어 우수)', cost: '약 ₩0.40 / 1천토큰' }
];

/**
 * 서버 환경변수 기반 /api/extract 호출
 * @param {string} model 
 * @param {string} userText 
 * @returns {Promise<Object>}
 */
export async function extractQuotationData(model, userText) {
  if (!userText || !userText.trim()) {
    throw new Error('견적서로 변환할 내용(텍스트 또는 음성)을 입력해 주세요.');
  }

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'google/gemini-2.0-flash-001',
      text: userText.trim()
    })
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || JSON.stringify(errJson);
    } catch (e) {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail || `서버 요청 실패 (상태 코드: ${response.status})`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }

  return {
    parsedData: result.parsedData,
    usage: result.usage || null,
    modelUsed: result.modelUsed || model
  };
}
