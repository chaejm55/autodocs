# 📑 스마트 견적서 자동 완성 서비스 (Auto-Docs)

> **말(음성)이나 글(메모/메일/아무말)을 입력하면 AI가 대한민국 표준 견적서 양식에 맞춰 자동으로 채워주는 웹 서비스입니다.**  
> **OpenRouter API Key는 서버 환경변수로 안전하게 보호되어 클라이언트에 절대 노출되지 않습니다.**

[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20JavaScript%20(ES6+)-blue.svg)](#)
[![Security](https://img.shields.io/badge/Security-Environment%20Variables-green.svg)](#)
[![AI](https://img.shields.io/badge/AI-OpenRouter%20API-purple.svg)](#)
[![STT](https://img.shields.io/badge/STT-Web%20Speech%20API-orange.svg)](#)

---

## 🌟 주요 특징

1. **보안 강화: 환경변수(`OPENROUTER_API_KEY`) 기반 키 은닉**
   - 사용자가 화면에서 API 키를 직접 입력할 필요가 없습니다.
   - 서버의 `.env` 파일 또는 호스팅 플랫폼(Vercel, Cloudflare, Netlify 등)의 환경변수로 안전하게 관리됩니다.
   - 클라이언트 화면에는 초저비용 가성비 모델 선택창만 표시됩니다.

2. **AI 기반 자연어 견적서 추출 (OpenRouter 연동)**
   - 두서없는 구어체 텍스트, 메일 본문, 메신저 대화에서 품명, 규격, 수량, 단가, 특기사항을 자동 분리/추출
   - 초저비용 가성비 모델 기본 지원:
     - `google/gemini-2.0-flash-001` (기본 추천: 빠른 응답 및 정밀한 JSON 추출)
     - `deepseek/deepseek-chat` (비용 절감형)
     - `meta-llama/llama-3.3-70b-instruct:free` (무료 티어 지원)

3. **무료 실시간 음성 인식 (STT)**
   - 브라우저 내장 `Web Speech API`를 활용하여 별도 API 비용 없이 한국어 마이크 음성을 실시간 텍스트로 변환

4. **대한민국 표준 견적서 양식 정밀 구현 (A4 규격)**
   - 실물 A4 비율 프레임 및 세련된 파스텔 톤 테마 (피치 견적금액 배너 + 소프트 블루 헤더)
   - 등록번호, 상호, 대표자명, 주소, 업태, 업종, 연락처 관리
   - 대표자명 옆 실제 직인(도장) 인영 SVG 오버레이 및 토글 지원
   - 모든 셀 직접 클릭하여 수정 가능한 인터랙티브 시트

5. **지능형 실시간 자동 계산**
   - 수량 × 단가 = 공급가액, 10% 부가세 및 총합계 자동 계산
   - 한글 금액 표기 자동 변환 (예: `일금 일십일만 원정 (부가세포함)`)
   - 빈 행 공급가액/세액 하이픈(`-`) 서식 완벽 지원

6. **인쇄 및 PDF 저장 최적화 (@media print)**
   - 인쇄(`Ctrl+P` 또는 버튼 클릭) 시 좌측 컨트롤 패널을 숨기고 A4 여백 없는 고화질 견적서만 출력

---

## 🚀 환경 설정 및 로컬 실행

### 1. 환경변수 설정
프로젝트 루트의 `.env` 파일에 OpenRouter API 키를 설정합니다:
```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
PORT=3000
```
> *(참고: `.env` 파일은 `.gitignore`에 등록되어 있어 GitHub에 절대 노출되지 않습니다)*

### 2. 서버 실행
```bash
# 내장 로컬 서버 기동
npm start
# 또는
node server.js
```
브라우저에서 `http://localhost:3000` 접속

---

## 🌐 배포 가이드 (Vercel 등 서버리스 배포)

1. GitHub 저장소(`https://github.com/chaejm55/autodocs`)를 Vercel / Netlify / Render 등에 연동합니다.
2. 배포 대시보드의 **Environment Variables (환경변수)** 설정에서 아래 값을 등록합니다:
   - Key: `OPENROUTER_API_KEY`
   - Value: `[귀하의 OpenRouter API Key]`
3. 본 프로젝트에 포함된 `api/extract.js`가 자동으로 서버리스 함수로 작동하여 키 노출 없이 안전하게 서비스됩니다.

---

## 📁 프로젝트 구조

```
doc_auto_fill_service/
├── api/
│   └── extract.js     # Vercel 등 서버리스 배포용 프록시 API 엔드포인트
├── index.html         # 메인 웹 페이지 (컨트롤 사이드바 & A4 견적서 시트)
├── css/
│   └── style.css      # 모던 UI 스타일링 및 A4 인쇄 전용 CSS
├── js/
│   ├── app.js         # 앱 초기화 및 이벤트 컨트롤러
│   ├── openrouter.js  # 서버 프록시 API 통신 모듈
│   ├── invoice.js     # 견적서 데이터 관리, 계산 및 한글 금액 변환
│   └── stt.js         # Web Speech API 실시간 음성 인식
├── assets/
│   └── seal.svg       # 대표자 직인 도장 벡터 리소스
├── server.js          # 순수 Node.js 로컬 정적 서버 및 프록시 API
├── package.json       # 프로젝트 설정 및 실행 스크립트
├── .env.example       # 환경변수 예시 파일
└── README.md          # 프로젝트 안내 문서
```

---

## 📄 라이선스

MIT License
