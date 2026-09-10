/**
 * invoice.js - 견적서 데이터 관리, 실시간 계산 및 한글 금액 변환
 */

// 숫자 -> 한글 금액 변환 함수
export function numberToKorean(number) {
  if (!number || isNaN(number) || number <= 0) {
    return '영';
  }

  const units = ['', '십', '백', '천'];
  const bigUnits = ['', '만', '억', '조'];
  const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

  let numStr = Math.floor(number).toString();
  let result = '';
  let chunkCount = Math.ceil(numStr.length / 4);

  for (let i = 0; i < chunkCount; i++) {
    const chunk = numStr.slice(Math.max(0, numStr.length - (i + 1) * 4), numStr.length - i * 4);
    let chunkResult = '';

    for (let j = 0; j < chunk.length; j++) {
      const digit = parseInt(chunk[chunk.length - 1 - j], 10);
      if (digit > 0) {
        chunkResult = digits[digit] + units[j] + chunkResult;
      }
    }

    if (chunkResult.length > 0) {
      result = chunkResult + bigUnits[i] + ' ' + result;
    }
  }

  return result.trim();
}

// 콤마 포맷터
export function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('ko-KR');
}

// 콤마 제거 후 정수 변환
export function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// 기본 공급자 정보
export const DEFAULT_SUPPLIER = {
  regNo: '568-19-00059',
  company: '안물마켓',
  ceo: '신청미',
  address: '경기도 용인시 처인구 중부대로 519번길 13',
  bizType: '도·소매',
  bizItem: '생활용품',
  contact: '010-2241-1337'
};

// 공급자 정보 불러오기
export function getSupplierInfo() {
  const saved = localStorage.getItem('quotation_supplier');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved supplier info', e);
    }
  }
  return { ...DEFAULT_SUPPLIER };
}

// 공급자 정보 저장
export function saveSupplierInfo(info) {
  localStorage.setItem('quotation_supplier', JSON.stringify(info));
}

// 견적서 상태 관리 클래스
export class InvoiceManager {
  constructor(tableBodyEl, totalElements) {
    this.tableBodyEl = tableBodyEl;
    this.totalElements = totalElements; // { totalKorean, totalNumber, totalQuantity, totalSupply, totalVat }
    this.maxRows = 14; // 신규 양식 맞춤 14행
    this.items = [];
    this.init();
  }

  init() {
    this.renderBlankRows();
    this.bindTableEvents();
    this.updateTotals();
  }

  // 빈 행 렌더링
  renderBlankRows() {
    this.tableBodyEl.innerHTML = '';
    const rowCount = Math.max(this.items.length, this.maxRows);

    for (let i = 0; i < rowCount; i++) {
      const item = this.items[i] || {};
      const tr = document.createElement('tr');
      tr.dataset.index = i;

      const qty = item.quantity !== undefined && item.quantity !== null && item.quantity !== '' ? item.quantity : '';
      const unitPrice = item.unit_price !== undefined && item.unit_price !== null && item.unit_price !== '' ? item.unit_price : '';
      const hasAmount = (qty !== '' && unitPrice !== '' && (qty > 0 || unitPrice > 0));
      const supplyAmount = hasAmount ? qty * unitPrice : '';
      const vat = hasAmount ? Math.round(supplyAmount * 0.1) : '';

      tr.innerHTML = `
        <td class="col-name" contenteditable="true" data-field="name">${item.name || ''}</td>
        <td class="col-spec" contenteditable="true" data-field="spec">${item.spec || ''}</td>
        <td class="col-qty text-center" contenteditable="true" data-field="quantity">${qty ? formatCurrency(qty) : ''}</td>
        <td class="col-price text-right" contenteditable="true" data-field="unit_price">${unitPrice ? formatCurrency(unitPrice) : ''}</td>
        <td class="col-supply ${hasAmount ? 'text-right' : 'text-center text-muted-dash'}" data-field="supply_amount">${hasAmount ? formatCurrency(supplyAmount) : '-'}</td>
        <td class="col-vat ${hasAmount ? 'text-right' : 'text-center text-muted-dash'}" data-field="vat">${hasAmount ? formatCurrency(vat) : '-'}</td>
        <td class="col-note" contenteditable="true" data-field="note">${item.note || ''}</td>
      `;
      this.tableBodyEl.appendChild(tr);
    }
  }

  // 테이블 내 편집 이벤트 바인딩
  bindTableEvents() {
    this.tableBodyEl.addEventListener('input', (e) => {
      const target = e.target;
      const tr = target.closest('tr');
      if (!tr) return;

      const index = parseInt(tr.dataset.index, 10);
      const field = target.dataset.field;
      
      if (!this.items[index]) {
        this.items[index] = { name: '', spec: '', quantity: 0, unit_price: 0, note: '' };
      }

      if (field === 'quantity' || field === 'unit_price') {
        const rawVal = parseCurrency(target.textContent);
        this.items[index][field] = rawVal;

        // 행 계산
        const qty = this.items[index].quantity || 0;
        const price = this.items[index].unit_price || 0;
        const hasAmount = qty > 0 && price > 0;
        const supply = hasAmount ? qty * price : 0;
        const vat = hasAmount ? Math.round(supply * 0.1) : 0;

        const supplyEl = tr.querySelector('[data-field="supply_amount"]');
        const vatEl = tr.querySelector('[data-field="vat"]');

        if (supplyEl) {
          if (hasAmount) {
            supplyEl.textContent = formatCurrency(supply);
            supplyEl.className = 'col-supply text-right';
          } else {
            supplyEl.textContent = '-';
            supplyEl.className = 'col-supply text-center text-muted-dash';
          }
        }

        if (vatEl) {
          if (hasAmount) {
            vatEl.textContent = formatCurrency(vat);
            vatEl.className = 'col-vat text-right';
          } else {
            vatEl.textContent = '-';
            vatEl.className = 'col-vat text-center text-muted-dash';
          }
        }

        this.updateTotals();
      } else if (field) {
        this.items[index][field] = target.textContent.trim();
      }
    });

    // 숫자 필드 포커스 벗어날 때 포맷팅
    this.tableBodyEl.addEventListener('blur', (e) => {
      const target = e.target;
      const field = target.dataset.field;
      if (field === 'quantity' || field === 'unit_price') {
        const val = parseCurrency(target.textContent);
        target.textContent = val > 0 ? formatCurrency(val) : '';
      }
    }, true);
  }

  // 합계 재계산 및 UI 갱신
  updateTotals() {
    let totalQty = 0;
    let totalSupply = 0;
    let totalVat = 0;

    this.items.forEach(item => {
      if (item && (item.name || item.unit_price || item.quantity)) {
        const qty = item.quantity || 0;
        const price = item.unit_price || 0;
        const supply = qty * price;
        const vat = Math.round(supply * 0.1);

        totalQty += qty;
        totalSupply += supply;
        totalVat += vat;
      }
    });

    const grandTotal = totalSupply + totalVat;

    if (this.totalElements.totalKorean) {
      const koreanText = grandTotal > 0 ? `${numberToKorean(grandTotal)} 원정 (부가세포함)` : '영 원정 (부가세포함)';
      this.totalElements.totalKorean.textContent = koreanText;
    }

    if (this.totalElements.totalNumber) {
      this.totalElements.totalNumber.textContent = formatCurrency(grandTotal);
    }

    if (this.totalElements.totalQuantity) {
      this.totalElements.totalQuantity.textContent = totalQty > 0 ? formatCurrency(totalQty) : '';
    }

    if (this.totalElements.totalSupply) {
      this.totalElements.totalSupply.textContent = totalSupply > 0 ? formatCurrency(totalSupply) : '0';
    }

    if (this.totalElements.totalVat) {
      this.totalElements.totalVat.textContent = totalVat > 0 ? formatCurrency(totalVat) : '0';
    }
  }

  // AI 추출 데이터로 폼 전체 채우기
  fillFromAIData(data) {
    if (!data) return;

    // 1. 견적일자 (YYYY년 MM월 DD일)
    if (data.date) {
      const dateParts = data.date.split('-');
      if (dateParts.length === 3) {
        const yearEl = document.getElementById('doc-date-year');
        const monthEl = document.getElementById('doc-date-month');
        const dayEl = document.getElementById('doc-date-day');
        if (yearEl) yearEl.textContent = dateParts[0];
        if (monthEl) monthEl.textContent = String(parseInt(dateParts[1], 10)).padStart(2, '0');
        if (dayEl) dayEl.textContent = String(parseInt(dateParts[2], 10)).padStart(2, '0');
      }
    }

    // 2. 수신인(귀하)
    if (data.client_name) {
      const recipientEl = document.getElementById('recipient-name');
      if (recipientEl) recipientEl.textContent = data.client_name;
    }

    // 3. 문서 번호
    if (data.doc_no) {
      const docNoEl = document.getElementById('doc-no');
      if (docNoEl) docNoEl.textContent = data.doc_no;
    }

    // 4. 품목 리스트
    if (Array.isArray(data.items) && data.items.length > 0) {
      this.items = data.items.map(item => ({
        name: item.name || '',
        spec: item.spec || '',
        quantity: parseCurrency(item.quantity) || 1,
        unit_price: parseCurrency(item.unit_price) || 0,
        note: item.note || ''
      }));
    } else {
      this.items = [];
    }

    // 5. 비고/특기사항
    if (data.notes) {
      const notesEl = document.getElementById('doc-notes');
      if (notesEl) {
        notesEl.innerHTML = data.notes.replace(/\n/g, '<br>');
      }
    }

    // 리렌더링 및 계산
    this.renderBlankRows();
    this.updateTotals();
  }

  // 초기화
  clearAll() {
    this.items = [];
    this.renderBlankRows();
    this.updateTotals();

    const recipientEl = document.getElementById('recipient-name');
    if (recipientEl) recipientEl.textContent = '';

    const notesEl = document.getElementById('doc-notes');
    if (notesEl) notesEl.innerHTML = '견적유효기간 30일 이내<br>결제방식 : 현금결제';

    // 오늘 날짜로 재설정
    const today = new Date();
    const yearEl = document.getElementById('doc-date-year');
    const monthEl = document.getElementById('doc-date-month');
    const dayEl = document.getElementById('doc-date-day');
    if (yearEl) yearEl.textContent = String(today.getFullYear());
    if (monthEl) monthEl.textContent = String(today.getMonth() + 1).padStart(2, '0');
    if (dayEl) dayEl.textContent = String(today.getDate()).padStart(2, '0');
  }
}
