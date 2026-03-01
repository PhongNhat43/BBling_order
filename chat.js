'use strict';

(function () {
  const VERSION = '2026.03.01-1';
  const SELECTORS = {
    toggle: 'chat-toggle',
    panel: 'chat-panel',
    close: 'chat-close',
    log: 'chat-log',
    input: 'chat-input',
    send: 'chat-send',
    uploadBtn: 'chat-upload-btn',
    upload: 'chat-upload',
  };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function slideIn(node) {
    node.classList.add('opacity-0', 'translate-y-2');
    node.style.transition = 'all 200ms ease';
    requestAnimationFrame(() => {
      node.classList.remove('opacity-0', 'translate-y-2');
    });
  }

  class ChatManager {
    constructor(root) {
      this.toggle = document.getElementById(SELECTORS.toggle);
      this.panel = document.getElementById(SELECTORS.panel);
      this.closeBtn = document.getElementById(SELECTORS.close);
      this.log = document.getElementById(SELECTORS.log);
      this.input = document.getElementById(SELECTORS.input);
      this.sendBtn = document.getElementById(SELECTORS.send);
      this.uploadBtn = document.getElementById(SELECTORS.uploadBtn);
      this.upload = document.getElementById(SELECTORS.upload);
      this.firstOpen = true;
      if (!this.toggle || !this.panel || !this.log) {
        console.warn('[B.BLING Chat] UI elements not found. VERSION:', VERSION);
        return;
      }
      this.toggle.setAttribute('title', `B.BLING Chat ${VERSION}`);
      this.bindEvents();
      console.log('[B.BLING Chat] Initialized VERSION:', VERSION);
    }

    bindEvents() {
      this.toggle.addEventListener('click', () => this.openOrToggle());
      this.closeBtn.addEventListener('click', () => this.hide());
      this.sendBtn.addEventListener('click', () => this.sendText());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendText();
      });
      this.uploadBtn.addEventListener('click', () => this.upload.click());
      this.upload.addEventListener('change', (e) => this.handleUpload(e));
    }

    openOrToggle() {
      const hidden = this.panel.classList.contains('hidden');
      if (hidden) {
        this.panel.classList.remove('hidden');
        if (this.firstOpen) {
          this.pushStoreText('Chào bạn! B.BLING có thể giúp gì cho bạn? Nếu bạn đã thanh toán, hãy gửi ảnh biên lai tại đây nhé!');
          this.firstOpen = false;
        }
      } else {
        this.panel.classList.add('hidden');
      }
    }

    hide() {
      this.panel.classList.add('hidden');
    }

    autoScroll() {
      this.log.scrollTop = this.log.scrollHeight;
    }

    pushUserBubble(contentNode, statusText) {
      const wrap = el('div', 'max-w-[80%] ml-auto');
      const bubble = el('div', 'bg-accent text-white px-3 py-2 rounded-tl-lg rounded-tr-lg rounded-bl-lg');
      bubble.appendChild(contentNode);
      const status = el('div', 'mt-1 text-[10px] text-primary/70 text-right', statusText || '');
      wrap.appendChild(bubble);
      wrap.appendChild(status);
      this.log.appendChild(wrap);
      slideIn(wrap);
      this.autoScroll();
      return { wrap, bubble, status };
    }

    pushStoreText(text) {
      const wrap = el('div', 'max-w-[80%] mr-auto');
      const bubble = el('div', 'bg-white px-3 py-2 rounded-tr-lg rounded-br-lg rounded-tl-lg');
      bubble.textContent = text;
      wrap.appendChild(bubble);
      this.log.appendChild(wrap);
      slideIn(wrap);
      this.autoScroll();
    }

    sendText() {
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = '';
      const node = el('div', null, text);
      const { status } = this.pushUserBubble(node, 'Đang gửi...');
      setTimeout(() => {
        status.textContent = 'Đã gửi';
        setTimeout(() => this.pushStoreText('Cảm ơn bạn! Nhân viên sẽ phản hồi sớm.'), 400);
      }, 300);
    }

    handleUpload(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = el('img');
        img.src = reader.result;
        img.className = 'max-h-32 rounded-md';
        img.addEventListener('error', () => {
          img.removeAttribute('srcset');
        }, { once: true });
        const { status } = this.pushUserBubble(img, 'Đang gửi...');
        setTimeout(() => {
          status.textContent = 'Đã gửi';
          setTimeout(() => this.pushStoreText('Đã nhận ảnh. Cảm ơn bạn!'), 500);
        }, 400);
      };
      reader.readAsDataURL(file);
      // reset input value to allow re-upload same file
      e.target.value = '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new ChatManager(document);
  });
})();
