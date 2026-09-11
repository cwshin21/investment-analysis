/**
 * sidebarUI.js — 상단 GNB 드롭다운, 우측 하단 "AI 투자 도우미" 플로팅 위젯,
 * 엔터프라이즈 안내 모달의 공통 로직. index.html(SPA)과 pages/*.html 정적
 * 페이지 양쪽에서 공유한다. (좌측 사이드바는 제거되어 이 파일 이름과 달리
 * 더 이상 사이드바를 다루지 않는다 — GNB로 전면 대체되었다.)
 */
const DESKTOP_BREAKPOINT = 1024;

// ── 상단 GNB 드롭다운 ──
function closeAllGnb(except) {
  document.querySelectorAll('.gnb-item.open').forEach((item) => {
    if (item === except) return;
    item.classList.remove('open');
    item.querySelector('.gnb-link[aria-haspopup]')?.setAttribute('aria-expanded', 'false');
  });
}
window._closeGnb = () => closeAllGnb();

function initGnb() {
  const nav = document.querySelector('.gnb');
  if (!nav) return;

  nav.querySelectorAll('.gnb-item').forEach((item) => {
    const link = item.querySelector('.gnb-link[aria-haspopup]');
    if (!link) return; // 드롭다운이 없는 항목(대시보드)은 일반 링크 클릭으로 처리된다.
    link.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !item.classList.contains('open');
      closeAllGnb();
      if (willOpen) {
        item.classList.add('open');
        link.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.addEventListener('click', () => closeAllGnb());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllGnb();
  });
}

function ensureSidebarChatbot() {
  if (document.getElementById('floating-chatbot')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <section class="floating-chatbot" id="floating-chatbot" aria-label="AI 투자 도우미">
      <div class="floating-chatbot-panel" id="floating-chatbot-panel" hidden>
        <header class="floating-chatbot-head">
          <span><i class="fa-solid fa-robot"></i> AI 투자 도우미</span>
          <button type="button" id="floating-chatbot-close" aria-label="대화창 닫기"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="floating-chatbot-messages" id="floating-chatbot-messages" aria-live="polite">
          <p class="floating-chatbot-welcome">투자와 종목에 관한 궁금한 내용을 입력해 보세요.</p>
        </div>
        <form class="floating-chatbot-form" id="floating-chatbot-form">
          <input id="floating-chatbot-input" type="text" maxlength="300" placeholder="질문을 입력하세요" aria-label="챗봇 질문" />
          <button type="submit" aria-label="질문 보내기"><i class="fa-solid fa-paper-plane"></i></button>
        </form>
      </div>
      <button type="button" class="floating-chatbot-trigger" id="floating-chatbot-trigger" aria-label="AI 투자 도우미 열기" aria-expanded="false">
        <i class="fa-solid fa-comment-dots"></i><span>AI 투자 도우미</span>
      </button>
    </section>`);

  const panel = document.getElementById('floating-chatbot-panel');
  const trigger = document.getElementById('floating-chatbot-trigger');
  const close = document.getElementById('floating-chatbot-close');
  const form = document.getElementById('floating-chatbot-form');
  const input = document.getElementById('floating-chatbot-input');
  const submit = form?.querySelector('button[type="submit"]');
  const messages = document.getElementById('floating-chatbot-messages');
  const sessionKey = 'investment_analysis_lex_session_id';
  const makeSessionId = () => `web-${window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  let sessionId = localStorage.getItem(sessionKey) || makeSessionId();
  localStorage.setItem(sessionKey, sessionId);
  const appendMessage = (text, className) => {
    const message = document.createElement('p');
    message.className = `floating-chatbot-message ${className}`;
    message.textContent = text;
    messages?.append(message);
    messages?.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  };
  const setOpen = (open) => {
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? 'AI 투자 도우미 닫기' : 'AI 투자 도우미 열기');
    if (open) input?.focus();
  };
  trigger?.addEventListener('click', () => setOpen(panel.hidden));
  close?.addEventListener('click', () => setOpen(false));

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const question = input?.value.trim();
    if (!question || !messages) return;

    appendMessage(question, 'is-user');
    input.value = '';
    input.disabled = true;
    if (submit) submit.disabled = true;
    try {
      const response = await fetch('/api/lex/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, session_id: sessionId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || '투자 도우미 응답을 받지 못했습니다.');
      sessionId = payload.session_id || sessionId;
      localStorage.setItem(sessionKey, sessionId);
      (payload.messages || []).forEach((message) => appendMessage(message, 'is-enterprise'));
    } catch (error) {
      appendMessage(error.message || '투자 도우미 연결에 실패했습니다.', 'is-enterprise');
    } finally {
      input.disabled = false;
      if (submit) submit.disabled = false;
      input.focus();
    }
  });
}
window._ensureSidebarChatbot = ensureSidebarChatbot;

// ── Enterprise 안내 모달 (회원가입/로그인 클릭 시) ──
function openEnterpriseModal() {
  const overlay = document.getElementById('enterprise-modal-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  document.body.classList.add('modal-open');
}
function closeEnterpriseModal() {
  const overlay = document.getElementById('enterprise-modal-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.classList.remove('modal-open');
}
window.closeEnterpriseModal = closeEnterpriseModal;

document.querySelectorAll('.js-enterprise-gate').forEach((el) => {
  el.addEventListener('click', (event) => {
    event.preventDefault();
    openEnterpriseModal();
  });
});
document.getElementById('enterprise-modal-overlay')?.addEventListener('click', (event) => {
  if (event.target.id === 'enterprise-modal-overlay') closeEnterpriseModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeEnterpriseModal();
});

initGnb();
ensureSidebarChatbot();
