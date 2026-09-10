/**
 * stt.js - 브라우저 Web Speech API 기반 실시간 한국어 음성 인식 모듈
 */

export class SpeechRecognitionHandler {
  constructor(options = {}) {
    this.onTextChunk = options.onTextChunk || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onError = options.onError || (() => {});

    this.recognition = null;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';

    this.checkSupport();
  }

  checkSupport() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'ko-KR';

    this.bindEvents();
    return true;
  }

  bindEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChange({ status: 'listening', message: '마이크 활성화됨: 음성을 말씀하세요...' });
    };

    this.recognition.onresult = (event) => {
      let currentInterim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += result[0].transcript + ' ';
        } else {
          currentInterim += result[0].transcript;
        }
      }

      this.transcript += currentFinal;
      this.interimTranscript = currentInterim;

      const combinedText = (this.transcript + this.interimTranscript).trim();
      this.onTextChunk(combinedText);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let userMsg = '음성 인식 중 오류가 발생했습니다.';
      if (event.error === 'not-allowed') {
        userMsg = '마이크 접근 권한이 차단되었습니다. 브라우저 주소창 좌측 자물쇠 아이콘에서 마이크를 허용해 주세요.';
      } else if (event.error === 'no-speech') {
        userMsg = '음성이 감지되지 않았습니다.';
      } else if (event.error === 'network') {
        userMsg = '음성 인식 네트워크 연결에 문제가 발생했습니다.';
      }

      this.onError(userMsg, event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChange({ status: 'idle', message: '마이크 대기 중' });
    };
  }

  toggle(baseText = '') {
    if (!this.recognition) {
      this.onError('현재 브라우저에서는 Web Speech API(음성인식)를 지원하지 않습니다. Chrome 또는 Edge 브라우저를 권장합니다.');
      return false;
    }

    if (this.isListening) {
      this.stop();
      return false;
    } else {
      this.start(baseText);
      return true;
    }
  }

  start(baseText = '') {
    if (!this.recognition || this.isListening) return;
    this.transcript = baseText ? baseText.trim() + ' ' : '';
    this.interimTranscript = '';
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition already started or error:', e);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (e) {
      console.warn('Error stopping recognition:', e);
    }
  }
}
