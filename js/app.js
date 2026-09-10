/**
 * app.js - 스마트 견적서 자동 생성기 메인 앱 엔트리포인트
 */

import { AVAILABLE_MODELS, extractQuotationData } from './openrouter.js';
import { InvoiceManager, getSupplierInfo, saveSupplierInfo } from './invoice.js';
import { SpeechRecognitionHandler } from './stt.js';

// 견적서 샘플 프롬프트
const SAMPLE_PROMPTS = {
  sample_img: `제품1 규격1 3개 단가 2만원, 제품2 규격2 4개 단가 1만원으로 견적서 작성해줘. 견적유효기간 30일 이내, 결제방식 : 현금결제.`,
  office: `서초구청 전산실에 납품할 데스크탑 본체(Core i7 32GB) 3대 대당 95만원, 27인치 UHD 모니터 3대 대당 32만원, 무선 키보드 마우스 세트 3개 개당 4만 5천원, 현장 설치 및 세팅 공임비 1식 15만원으로 견적서 작성해줘. 납기일은 발주일로부터 7일 이내이며 견적 유효기간은 15일입니다.`,
  cafe: `(주)블루웨이브 카페에 보낼 정기 공급 견적입니다. 에티오피아 스페셜티 원두 1kg 10봉 봉당 35,000원, 16온스 친환경 종이컵 500개입 4박스 박스당 48,000원, 생분해 PLA 빨대 1,000개입 2박스 박스당 15,000원 납품 견적서 부탁드립니다. 결제 조건은 익월 10일 현금 결제입니다.`,
  interior: `판교 테크노밸리 회의실 영상 시공 견적입니다. 엡손 고화질 레이저 프로젝터 1대 1,850,000원, 120인치 전동 매립형 스크린 1대 480,000원, HDMI 광케이블 20m 2개 개당 65,000원, 천장 배선 및 브라켓 시공 설치비 1식 300,000원으로 견적서 뽑아주세요. 공사 예정일은 10월 5일입니다.`
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM 요소 취득
  const apiKeyInput = document.getElementById('api-key-input');
  const btnToggleKey = document.getElementById('btn-toggle-key');
  const modelSelect = document.getElementById('model-select');
  const promptInput = document.getElementById('prompt-input');
  const btnMicToggle = document.getElementById('btn-mic-toggle');
  const micBtnLabel = document.getElementById('mic-btn-label');
  const micStatusBox = document.getElementById('mic-status-box');
  const micStatusText = document.getElementById('mic-status-text');
  const btnProcessAi = document.getElementById('btn-process-ai');
  const btnProcessSpinner = document.getElementById('btn-process-spinner');
  const btnProcessText = document.getElementById('btn-process-text');
  const btnClearPrompt = document.getElementById('btn-clear-prompt');
  const statusLogBox = document.getElementById('status-log-box');
  const btnHeaderPrint = document.getElementById('btn-header-print');
  const btnToggleSeal = document.getElementById('btn-toggle-seal');
  const btnResetInvoice = document.getElementById('btn-reset-invoice');
  const sealStamp = document.getElementById('seal-stamp');

  // 견적서 테이블 요소
  const itemsTableBody = document.getElementById('invoice-items-body');
  const totalElements = {
    totalKorean: document.getElementById('total-korean'),
    totalNumber: document.getElementById('total-number'),
    totalQuantity: document.getElementById('summary-quantity'),
    totalSupply: document.getElementById('summary-supply'),
    totalVat: document.getElementById('summary-vat')
  };

  // 2. 견적서 관리자 초기화
  const invoiceManager = new InvoiceManager(itemsTableBody, totalElements);

  // 오늘 날짜 기본 세팅 (4자리 연도)
  const now = new Date();
  document.getElementById('doc-date-year').textContent = String(now.getFullYear());
  document.getElementById('doc-date-month').textContent = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('doc-date-day').textContent = String(now.getDate()).padStart(2, '0');

  // 3. 공급자 정보 초기 로드 및 반영
  function renderSupplierInfo() {
    const info = getSupplierInfo();
    document.getElementById('sup-reg-no').value = info.regNo;
    document.getElementById('sup-company').value = info.company;
    document.getElementById('sup-ceo').value = info.ceo;
    document.getElementById('sup-address').value = info.address;
    document.getElementById('sup-biz-type').value = info.bizType;
    document.getElementById('sup-biz-item').value = info.bizItem;
    document.getElementById('sup-contact').value = info.contact;

    document.getElementById('cell-sup-regno').textContent = info.regNo;
    document.getElementById('cell-sup-company').textContent = info.company;
    document.getElementById('cell-sup-ceo').textContent = info.ceo;
    document.getElementById('cell-sup-address').textContent = info.address;
    document.getElementById('cell-sup-biztype').textContent = info.bizType;
    document.getElementById('cell-sup-bizitem').textContent = info.bizItem;
    document.getElementById('cell-sup-contact').textContent = info.contact;
  }
  renderSupplierInfo();

  // 공급자 정보 저장 이벤트
  document.getElementById('btn-save-supplier').addEventListener('click', () => {
    const updated = {
      regNo: document.getElementById('sup-reg-no').value.trim(),
      company: document.getElementById('sup-company').value.trim(),
      ceo: document.getElementById('sup-ceo').value.trim(),
      address: document.getElementById('sup-address').value.trim(),
      bizType: document.getElementById('sup-biz-type').value.trim(),
      bizItem: document.getElementById('sup-biz-item').value.trim(),
      contact: document.getElementById('sup-contact').value.trim()
    };
    saveSupplierInfo(updated);
    renderSupplierInfo();
    showStatus('공급자 정보가 성공적으로 저장되었습니다.', 'success');
  });

  // 공급자 정보 아코디언 토글
  const supplierTrigger = document.getElementById('supplier-collapsible-trigger');
  const supplierContent = document.getElementById('supplier-collapsible-content');
  supplierTrigger.addEventListener('click', () => {
    supplierContent.classList.toggle('open');
  });

  // 4. OpenRouter 모델 목록 채우기 및 로컬스토리지 복원
  AVAILABLE_MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} [${m.cost}]`;
    modelSelect.appendChild(opt);
  });

  const savedKey = localStorage.getItem('openrouter_api_key');
  if (savedKey) apiKeyInput.value = savedKey;

  const savedModel = localStorage.getItem('openrouter_selected_model');
  if (savedModel) modelSelect.value = savedModel;

  apiKeyInput.addEventListener('input', () => {
    localStorage.setItem('openrouter_api_key', apiKeyInput.value.trim());
  });

  modelSelect.addEventListener('change', () => {
    localStorage.setItem('openrouter_selected_model', modelSelect.value);
  });

  // API 키 보이기/숨기기 토글
  btnToggleKey.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      apiKeyInput.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // 5. 음성 인식 (STT) 모듈 연동
  const speechHandler = new SpeechRecognitionHandler({
    onTextChunk: (recognizedText) => {
      promptInput.value = recognizedText;
      promptInput.scrollTop = promptInput.scrollHeight;
    },
    onStateChange: ({ status, message }) => {
      if (status === 'listening') {
        btnMicToggle.classList.add('active');
        micBtnLabel.textContent = '음성 인식 중지';
        micStatusBox.classList.add('listening');
        micStatusText.textContent = '듣고 있습니다... 말씀하세요';
      } else {
        btnMicToggle.classList.remove('active');
        micBtnLabel.textContent = '음성으로 말하기';
        micStatusBox.classList.remove('listening');
        micStatusText.textContent = '마이크 대기 중';
      }
    },
    onError: (errMsg) => {
      showStatus(errMsg, 'error');
    }
  });

  btnMicToggle.addEventListener('click', () => {
    speechHandler.toggle(promptInput.value);
  });

  // 6. 샘플 칩 클릭 이벤트
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sampleKey = chip.dataset.sample;
      if (SAMPLE_PROMPTS[sampleKey]) {
        promptInput.value = SAMPLE_PROMPTS[sampleKey];
        promptInput.focus();
        showStatus('샘플 텍스트가 입력되었습니다. "견적서 자동 채우기"를 눌러보세요.', 'info');
      }
    });
  });

  // 프롬프트 비우기
  btnClearPrompt.addEventListener('click', () => {
    promptInput.value = '';
    promptInput.focus();
    hideStatus();
  });

  // 7. AI 자동 변환 실행
  btnProcessAi.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const model = modelSelect.value;
    const text = promptInput.value.trim();

    if (!apiKey) {
      showStatus('⚠️ OpenRouter API 키를 먼저 입력해 주세요. (openrouter.ai 에서 무료/유료 발급 가능)', 'error');
      apiKeyInput.focus();
      return;
    }

    if (!text) {
      showStatus('⚠️ 견적서로 변환할 내용(음성 또는 텍스트)을 입력해 주세요.', 'error');
      promptInput.focus();
      return;
    }

    // 마이크가 켜져있다면 중지
    speechHandler.stop();

    // 로딩 상태 돌입
    setLoadingState(true);
    showStatus('🤖 AI가 내용을 분석하여 견적서 항목을 추출하고 있습니다...', 'info');

    const startTime = performance.now();

    try {
      const result = await extractQuotationData(apiKey, model, text);
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(1);

      // 견적서 데이터 채우기
      invoiceManager.fillFromAIData(result.parsedData);

      const usageInfo = result.usage ? ` (사용 토큰: ${result.usage.total_tokens || 0})` : '';
      showStatus(`✅ 견적서 자동 채우기 완료! [소요 시간: ${elapsedSec}초, 모델: ${result.modelUsed}]${usageInfo}`, 'success');

      // 견적서 영역으로 부드럽게 스크롤
      document.getElementById('invoice-sheet').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error(err);
      showStatus(`❌ ${err.message}`, 'error');
    } finally {
      setLoadingState(false);
    }
  });

  function setLoadingState(isLoading) {
    if (isLoading) {
      btnProcessAi.disabled = true;
      btnProcessSpinner.style.display = 'inline-block';
      btnProcessText.textContent = 'AI 변환 중...';
    } else {
      btnProcessAi.disabled = false;
      btnProcessSpinner.style.display = 'none';
      btnProcessText.textContent = '✨ 견적서 자동 채우기';
    }
  }

  function showStatus(msg, type = 'info') {
    statusLogBox.className = `status-log visible ${type}`;
    statusLogBox.textContent = msg;
  }

  function hideStatus() {
    statusLogBox.className = 'status-log';
    statusLogBox.textContent = '';
  }

  // 8. 견적서 부가 기능
  // 직인 표시/숨김 토글
  btnToggleSeal.addEventListener('click', () => {
    sealStamp.classList.toggle('hidden');
    const isHidden = sealStamp.classList.contains('hidden');
    btnToggleSeal.textContent = isHidden ? '⚪ 직인(도장) 표시' : '🔴 직인(도장) 숨김';
  });

  // 견적서 초기화
  btnResetInvoice.addEventListener('click', () => {
    if (confirm('견적서 내용을 모두 초기화하시겠습니까?')) {
      invoiceManager.clearAll();
      showStatus('견적서가 초기화되었습니다.', 'info');
    }
  });

  // 인쇄 및 PDF 저장
  btnHeaderPrint.addEventListener('click', () => {
    window.print();
  });
});
