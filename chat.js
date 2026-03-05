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

  function rebuildUI() {
    const oldToggle = document.getElementById(SELECTORS.toggle);
    const oldPanel = document.getElementById(SELECTORS.panel);
    if (oldToggle && oldToggle.parentElement) oldToggle.parentElement.removeChild(oldToggle);
    if (oldPanel && oldPanel.parentElement) oldPanel.parentElement.removeChild(oldPanel);
    const toggle = document.createElement('button');
    toggle.id = SELECTORS.toggle;
    toggle.className = 'fixed right-6 bottom-6 z-50 w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center shadow-soft hover:shadow-lg transition relative';
    toggle.innerHTML = '<span class="absolute inset-0 rounded-full"><span class="animate-ping absolute inset-0 rounded-full bg-accent opacity-30"></span></span><svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h8M8 14h5m-1 6l3-3h3a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4v6a4 4 0 004 4h4z"/></svg>';
    toggle.style.position = 'fixed';
    toggle.style.right = '24px';
    toggle.style.bottom = '24px';
    toggle.style.zIndex = '9999';
    toggle.style.width = '56px';
    toggle.style.height = '56px';
    const panel = document.createElement('div');
    panel.id = SELECTORS.panel;
    panel.className = 'hidden fixed right-6 bottom-28 w-[92%] max-w-[460px] rounded-2xl bg-white/95 backdrop-blur shadow-soft p-4 ring-1 ring-primary/10 z-50';
    panel.innerHTML = '<div class="flex items-center justify-between mb-3 border-b border-primary/10 pb-2"><div class="flex items-center gap-3"><img id="chat-avatar" alt="B.BLING" class="w-9 h-9 rounded-full object-cover border border-primary/10" src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=96&q=60"/><div><div class="font-semibold text-sm">Hỗ trợ B.BLING</div><div class="text-[10px] text-success flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-success"></span>Đang trực tuyến</div></div></div><button id="chat-close" class="text-primary/60 text-xl leading-none hover:shadow-lg active:scale-95 transition">&times;</button></div><div id="chat-log" class="h-72 overflow-y-auto space-y-2 text-sm p-2 bg-cream rounded-xl"></div><div class="mt-3 flex items-center gap-2"><input id="chat-input" class="flex-1 rounded-xl border border-primary/20 p-2 outline-none focus:ring-2 focus:ring-accent/60" placeholder="Nhập tin nhắn..."/><button id="chat-upload-btn" type="button" class="w-11 h-11 rounded-xl bg-primary text-cream flex items-center justify-center hover:shadow-lg transition" aria-label="Tải ảnh"><svg xmlns=\"http://www.w3.org/2000/svg\" class=\"w-5 h-5\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\" stroke-width=\"2\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M3 7h4l2-3h6l2 3h4v12H3V7z\"/><path stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M12 17a4 4 0 100-8 4 4 0 000 8z\"/></svg></button><input id=\"chat-upload\" type=\"file\" accept=\"image/*\" class=\"hidden\"/><button id=\"chat-send\" class=\"px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm hover:shadow-lg transition\">Gửi</button></div>';
    panel.style.position = 'fixed';
    panel.style.right = '24px';
    panel.style.bottom = '120px';
    panel.style.zIndex = '9999';
    panel.style.maxWidth = '460px';
    panel.style.width = '92%';
    document.body.appendChild(toggle);
    document.body.appendChild(panel);
  }

  class ChatManager {
    constructor(root) {
      rebuildUI();
      this.toggle = document.getElementById(SELECTORS.toggle);
      this.panel = document.getElementById(SELECTORS.panel);
      this.closeBtn = document.getElementById(SELECTORS.close);
      this.log = document.getElementById(SELECTORS.log);
      this.input = document.getElementById(SELECTORS.input);
      this.sendBtn = document.getElementById(SELECTORS.send);
      this.uploadBtn = document.getElementById(SELECTORS.uploadBtn);
      this.upload = document.getElementById(SELECTORS.upload);
      this.firstOpen = true;
      this.messagesUnsub = null; // Store unsubscribe function
      this.lastProcessedTime = Date.now(); // Only show messages after initialization
      if (!this.toggle || !this.panel || !this.log) {
        console.warn('[B.BLING Chat] UI elements not found. VERSION:', VERSION);
        return;
      }
      this.toggle.setAttribute('title', `B.BLING Chat ${VERSION}`);
      // Guest chat mode: use sessionId if no orderId
      this.orderId = (window.bbOrderId || new URLSearchParams(location.search).get('orderId')) || null;
      this.sessionId = this.orderId || this.getOrCreateSessionId();
      this.isGuestMode = !this.orderId;
      this.useFirebase = !!(window.bbDb);
      this.bindEvents();
      if (this.useFirebase) this.setupFirebaseChat();
      console.log('[B.BLING Chat] Initialized VERSION:', VERSION, 
        this.useFirebase ? (this.isGuestMode ? '(Firebase Guest)' : '(Firebase Order)') : '(Local)');
      // auto open from index?chat=open or session flag
      const sp = new URLSearchParams(location.search);
      const auto = sp.get('chat') === 'open' || (sessionStorage.getItem('open_chat') === '1');
      if (auto) {
        this.openOrToggle();
        try { sessionStorage.removeItem('open_chat'); } catch(_) {}
        this.pushSupportCard();
      }
    }

    bindEvents() {
      this.toggle.addEventListener('click', () => this.openOrToggle());
      this.closeBtn.addEventListener('click', () => this.hide());
      this.sendBtn.addEventListener('click', () => this.sendText());
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.sendText();
      });
      if (this.uploadBtn) this.uploadBtn.addEventListener('click', () => (this.upload || document.getElementById('chat-upload')).click());
      if (this.upload) this.upload.addEventListener('change', (e) => this.handleUpload(e));
    }

    getOrCreateSessionId() {
      const STORAGE_KEY = 'bb_chat_session';
      let sid = null;
      try {
        sid = localStorage.getItem(STORAGE_KEY);
      } catch(e) {}
      if (!sid) {
        sid = 'GUEST_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        try {
          localStorage.setItem(STORAGE_KEY, sid);
        } catch(e) {}
      }
      return sid;
    }

    setupFirebaseChat() {
      const db = window.bbDb;
      const collectionPath = this.isGuestMode ? 'guestChats' : 'orders';
      const docId = this.isGuestMode ? this.sessionId : this.orderId;
      
      // Cleanup previous listener if exists
      if (this.messagesUnsub) {
        this.messagesUnsub();
        this.messagesUnsub = null;
      }
      
      // Initialize guest chat document if needed
      if (this.isGuestMode) {
        db.collection('guestChats').doc(docId).set({
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          sessionId: docId
        }, { merge: true }).catch(e => console.warn('Init guest chat failed:', e));
      }
      
      this.messagesUnsub = db.collection(collectionPath).doc(docId).collection('messages').orderBy('createdAt').onSnapshot((snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type !== 'added') return;
          const d = ch.doc.data();
          
          // Only render messages from admin AND only new messages (after init)
          if (d.from === 'admin') {
            const msgTime = d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0;
            // Skip old messages (before this session started)
            if (msgTime > 0 && msgTime < this.lastProcessedTime) {
              return;
            }
            
            if (d.type === 'image') {
              const wrap = document.createElement('div');
              wrap.className = 'max-w-[80%] mr-auto';
              const bubble = document.createElement('div');
              bubble.className = 'bg-white px-3 py-2 rounded-2xl rounded-br-lg border border-primary/10 shadow-soft';
              const img = document.createElement('img');
              img.src = d.content;
              img.className = 'max-h-32 rounded-md';
              bubble.appendChild(img);
              wrap.appendChild(bubble);
              this.log.appendChild(wrap);
            } else {
              this.pushStoreText(d.content);
            }
            this.autoScroll();
          }
        });
      });
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
      const bubble = el('div', 'bg-accent text-white px-3 py-2 rounded-2xl rounded-bl-lg shadow-soft');
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
      const bubble = el('div', 'bg-white px-3 py-2 rounded-2xl rounded-br-lg border border-primary/10 shadow-soft');
      bubble.textContent = text;
      wrap.appendChild(bubble);
      this.log.appendChild(wrap);
      slideIn(wrap);
      this.autoScroll();
    }
    
    pushSupportCard() {
      const wrap = el('div', 'max-w-[90%] mr-auto');
      const card = el('div', 'bg-white px-3 py-2 rounded-2xl border border-primary/10 shadow-soft');
      const line1 = el('div', null, 'Xin chào! Bạn cần hỗ trợ gì không?');
      const line2 = el('div', 'text-xs text-primary/70', 'Bạn cũng có thể gọi nhanh Hotline: 0985.679.565');
      const btn = el('button', 'mt-2 px-2 py-1 rounded-lg bg-accent text-white text-xs', 'Copy số 0985.679.565');
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText('0985679565');
        btn.textContent = 'Đã sao chép';
        setTimeout(()=>btn.textContent='Copy số 0985.679.565', 1200);
      });
      card.appendChild(line1);
      card.appendChild(line2);
      card.appendChild(btn);
      wrap.appendChild(card);
      this.log.appendChild(wrap);
      slideIn(wrap);
      this.autoScroll();
    }

    sendText() {
      const text = this.input.value.trim();
      if (!text) return;
      this.input.value = '';
      if (this.useFirebase) {
        const collectionPath = this.isGuestMode ? 'guestChats' : 'orders';
        const docId = this.isGuestMode ? this.sessionId : this.orderId;
        const db = window.bbDb;
        
        // Update lastMessageAt for guest chats
        if (this.isGuestMode) {
          db.collection('guestChats').doc(docId).update({
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(() => {});
        }
        
        db.collection(collectionPath).doc(docId).collection('messages').add({
          from: 'customer', type: 'text', content: text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => alert('Gửi thất bại. Kiểm tra mạng.'));
        return;
      }
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
        img.addEventListener('error', () => img.removeAttribute('srcset'), { once: true });
        if (this.useFirebase) {
          const collectionPath = this.isGuestMode ? 'guestChats' : 'orders';
          const docId = this.isGuestMode ? this.sessionId : this.orderId;
          const db = window.bbDb;
          
          // Update lastMessageAt for guest chats
          if (this.isGuestMode) {
            db.collection('guestChats').doc(docId).update({
              lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
          }
          
          db.collection(collectionPath).doc(docId).collection('messages').add({
            from: 'customer', type: 'image', content: reader.result,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(() => alert('Gửi ảnh thất bại.'));
        } else {
          const { status } = this.pushUserBubble(img, 'Đang gửi...');
          setTimeout(() => {
            status.textContent = 'Đã gửi';
            setTimeout(() => this.pushStoreText('Đã nhận ảnh. Cảm ơn bạn!'), 500);
          }, 400);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    new ChatManager(document);
  });
})();
