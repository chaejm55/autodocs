# 📑 스마트 견적서 자동 완성 서비스 (Auto-Docs)

> **말(음성)이나 글(메모/메일/아무말)을 입력하면 AI가 대한민국 표준 견적서 양식에 맞춰 자동으로 채워주는 순수 프론트엔드 웹 애플리케이션입니다.**

[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript%20(ES6+)-blue.svg)](#)
[![AI](https://img.shields.io/badge/AI-OpenRouter%20API-purple.svg)](#)
[![STT](https://img.shields.io/badge/STT-Web%20Speech%20API-orange.svg)](#)

---

## 🌟 주요 특징

1. **AI 기반 자연어 견적서 추출 (OpenRouter 연동)**
   - 두서없는 구어체 텍스트, 메일 본문, 메신저 대화에서 품명, 규격, 수량, 단가, 특기사항을 자동 분리/추출
   - 초저비용 가성비 모델 지원:
     - `google/gemini-2.0-flash-001` (추천: 빠른 응답 및 정밀한 JSON 추출)
     - `deepseek/deepseek-chat` (비용 절감형)
     - `meta-llama/llama-3.3-70b-instruct:free` (무료 티어 지원)
   - API 키는 브라우저 `localStorage`에 안전하게 저장되어 재입력 불필요

2. **무료 실시간 음성 인식 (STT)**
   - 브라우저 내장 `Web Speech API`를 활용하여 별도 API 비용 없이 한국어 마이크 음성을 실시간 텍스트로 변환

3. **대한민국 표준 견적서 양식 정밀 구현 (A4 규격)**
   - 실물 A4 비율 프레임 및 세련된 파스텔 톤 테마 (피치 견적금액 배너 + 소프트 블루 헤더)
   - 등록번호, 상호, 대표자명, 주소, 업태, 업종, 연락처 관리
   - 대표자명 옆 실제 직인(도장) 인영 SVG 오버레이 및 토글 지원
   - 모든 셀 직접 클릭하여 수정 가능한 인터랙티브 시트

4. **지능형 실시간 자동 계산**
   - 수량 × 단가 = 공급가액, 10% 부가세 및 총합계 자동 계산
   - 한글 금액 표기 자동 변환 (예: `일금 일십일만 원정 (부가세포함)`)
   - 빈 행 공급가액/세액 하이픈(`-`) 서식 완벽 지원

5. **인쇄 및 PDF 저장 최적화 (@media print)**
   - 인쇄(`Ctrl+P` 또는 버튼 클릭) 시 좌측 컨트롤 패널을 숨기고 A4 여백 없는 고화질 견적서만 출력

6. **순수 웹 기술 기반 배포 용이성**
   - 파이썬이나 별도 백엔드 서버 없이 HTML, CSS, Vanilla JS만으로 동작
   - GitHub Pages, Vercel, Netlify, Cloudflare Pages 등 어디든 정적 배포 가능

---

## 🚀 시작하기

### 실행 방법 1: 내장 경량 서버 실행 (Node.js)
```bash
# 로컬 서버 기동
npm start
# 또는
node server.js
```
브라우저에서 `http://localhost:3000` 접속

### 실행 방법 2: 정적 호스팅 배포
- GitHub Pages 또는 Vercel에 리포지토리를 연결하면 빌드 과정 없이 바로 배포할 수 있습니다.

---

## 📁 프로젝트 구조

```
doc_auto_fill_service/
├── index.html         # 메인 웹 페이지 (컨트롤 사이드바 & A4 견적서 시트)
├── css/
│   └── style.css      # 모던 UI 스타일링 및 A4 인쇄 전용 CSS
├── js/
│   ├── app.js         # 앱 초기화 및 이벤트 컨트롤러
│   ├── openrouter.js  # OpenRouter API 통신 및 JSON 파싱
│   ├── invoice.js     # 견적서 데이터 관리, 계산 및 한글 금액 변환
│   └── stt.js         # Web Speech API 실시간 음성 인식
├── assets/
│   └── seal.svg       # 대표자 직인 도장 벡터 리소스
├── server.js          # 무설치 순수 Node.js 로컬 정적 서버
├── package.json       # 프로젝트 설정 및 실행 스크립트
└── README.md          # 프로젝트 안내 문서
```

---

## 📄 라이선스

MIT License
