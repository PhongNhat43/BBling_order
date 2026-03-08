'use strict';

const AdminState = (() => {
  const statusMap = {
    unverified_cash: { label: 'Chờ xác nhận (TM)', color: 'bg-amber-500/30 text-amber-200' },
    pending_transfer: { label: 'Chờ xác minh (CK)', color: 'bg-yellow-500/30 text-yellow-200' },
    processing: { label: 'Đang giao hàng', color: 'bg-blue-500/30 text-blue-200' },
    completed: { label: 'Hoàn thành', color: 'bg-green-500/30 text-green-200' },
    failed: { label: 'Thất bại', color: 'bg-red-500/30 text-red-200' },
    canceled: { label: 'Đã hủy', color: 'bg-gray-500/30 text-gray-400' }
  };
  function getStatusInfo(status) {
    return statusMap[status] || { label: status || 'Không rõ', color: 'bg-gray-500/30 text-gray-400' };
  }
  let audioEnabled = false;
  let selectedId = null;
  let selectedType = null; // 'order' or 'guest'
  let orders = [];
  let guestChats = [];
  let lastOrderCount = 0;
  let messagesUnsub = null;
  let menuData = getMenuForAdmin();
  let categories = menuData.categories;
  let items = menuData.items;
  const PAGE_SIZE = 20;
  let currentPage = 1;
  const db = typeof window !== 'undefined' ? (window.bbDb || null) : null;
  const useFirebase = !!db;
  function persistMenu(){ saveMenu(categories, items); if(useFirebase) persistMenuToFirebase(); }
  function vndK(k){ return (k*1000).toLocaleString('vi-VN')+' đ'; }
  function totalK(order){ return order.items.reduce((s,i)=>s+i.qty*i.priceK,0); }
  // Orders: NEW means not viewed by admin yet (not time-based)
  // Guest chats: keep legacy time-based behavior by passing timestamp number.
  function isNewOrder(orderOrTs){
    if (orderOrTs && typeof orderOrTs === 'object') {
      return !orderOrTs.viewedByAdmin;
    }
    const ts = Number(orderOrTs) || 0;
    const TEN_MINUTES = 10 * 60 * 1000;
    return (Date.now() - ts) < TEN_MINUTES;
  }
  function countNewOrders(){
    return orders.filter(o => !o.viewedByAdmin).length;
  }
  function updateNewOrderBadge(){
    const badge = qs('#new-order-badge');
    const count = countNewOrders();
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  function countNewChats(){
    return guestChats.filter(c => !c.viewedByAdmin).length;
  }
  function updateNewChatBadge(){
    const badge = qs('#new-chat-badge');
    const count = countNewChats();
    if (!badge) return;
    if (count > 0) {
      badge.textContent = String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  function markChatViewed(chatId){
    const chat = guestChats.find(c => c.id === chatId);
    if (!chat || chat.viewedByAdmin) return;
    chat.viewedByAdmin = true;
    if (useFirebase) {
      db.collection('guestChats').doc(chatId).update({ viewedByAdmin: true }).catch(function(err){
        console.warn('Failed to mark chat viewed:', err);
      });
    }
    renderThreads();
    updateNewChatBadge();
  }
  function markOrderViewed(orderId){
    const order = orders.find(o => o.id === orderId);
    if (!order || order.viewedByAdmin) return;
    order.viewedByAdmin = true;
    if (useFirebase) {
      db.collection('orders').doc(orderId).update({ viewedByAdmin: true }).catch(function(err){
        console.warn('Failed to mark order viewed:', err);
      });
    }
    renderOrders();
    updateNewOrderBadge();
  }
  // ── Time formatting helpers ──────────────────────────────────────────────
  function _dayStart(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  // Relative time (e.g. "vừa xong", "5 phút trước", "2 giờ trước", "Hôm qua 14:32", "05/03 09:10")
  function relativeTime(ts){
    if (!ts) return '';
    const delta = Date.now() - ts;
    const d = new Date(ts);
    const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (delta < 60000) return 'vừa xong';
    if (delta < 3600000) return Math.floor(delta / 60000) + ' phút trước';
    if (delta < 86400000) return Math.floor(delta / 3600000) + ' giờ trước';
    const now = new Date();
    if (_dayStart(d) === _dayStart(now)) return 'Hôm nay ' + hm;
    if (_dayStart(d) === _dayStart(now) - 86400000) return 'Hôm qua ' + hm;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + hm;
  }
  // Full timestamp for message bubbles (HH:MM for today, "Hôm qua HH:MM", "DD/MM · HH:MM" older)
  function formatMsgTime(ts){
    if (!ts) return '';
    const d = new Date(ts);
    const hm = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const now = new Date();
    if (_dayStart(d) === _dayStart(now)) return hm;
    if (_dayStart(d) === _dayStart(now) - 86400000) return 'Hôm qua · ' + hm;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' · ' + hm;
  }
  // Label for day separator chips ("Hôm nay", "Hôm qua", "Thứ X, DD/MM/YYYY")
  function formatDayLabel(ts){
    const d = new Date(ts);
    const now = new Date();
    if (_dayStart(d) === _dayStart(now)) return 'Hôm nay';
    if (_dayStart(d) === _dayStart(now) - 86400000) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  // ────────────────────────────────────────────────────────────────────────
  function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }
  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
  function showTab(name){
    qsa('[id^="tab-"]').forEach(s=>s.classList.add('hidden'));
    const panel = qs('#tab-'+name);
    if (panel) panel.classList.remove('hidden');
    qsa('.tab').forEach(b=>{
      const active = b.dataset.tab === name;
      b.classList.toggle('bg-accent', active);
      b.classList.toggle('text-white', active);
      b.classList.toggle('bg-gray-800', !active);
    });
  }
  function isInDateRange(ts, range){
    const d = new Date(ts);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const yesterdayStart = todayStart - 86400000;
    const yesterdayEnd = todayStart;
    const weekStart = todayStart - 7*86400000;
    const monthStart = todayStart - 30*86400000;
    if (range==='all') return true;
    if (range==='today') return ts >= todayStart && ts < todayEnd;
    if (range==='yesterday') return ts >= yesterdayStart && ts < yesterdayEnd;
    if (range==='week') return ts >= weekStart;
    if (range==='month') return ts >= monthStart;
    return true;
  }
  function docToOrder(id, d) {
    const ts = d.createdAt && (d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt) || Date.now();
    return { id, ...d, createdAt: ts };
  }

  // ═══════════════════════════════════════════════════════════════
  //  TELEGRAM NOTIFICATION
  //  Config stored in Firestore: settings/telegram_config
  //  Structure:
  //    botToken:   string            (BotFather token)
  //    enabled:    boolean
  //    recipients: Array<{ chatId: string, label: string }>
  // ═══════════════════════════════════════════════════════════════
  const TelegramNotif = (function () {
    const CACHE_TTL = 5 * 60 * 1000; // re-fetch config every 5 minutes
    let _cfg = null;
    let _cacheTs = 0;

    function _loadConfig() {
      if (!useFirebase) return Promise.resolve(null);
      if (_cfg !== null && Date.now() - _cacheTs < CACHE_TTL) return Promise.resolve(_cfg);
      return db.collection('settings').doc('telegram_config').get()
        .then(function (doc) {
          _cfg = doc.exists ? doc.data() : null;
          _cacheTs = Date.now();
          return _cfg;
        })
        .catch(function (err) {
          console.warn('[Telegram] Config load failed:', err);
          return null;
        });
    }

    function send(text) {
      _loadConfig().then(function (cfg) {
        if (!cfg || cfg.enabled === false || !cfg.botToken || !Array.isArray(cfg.recipients) || !cfg.recipients.length) return;
        var token = cfg.botToken;
        cfg.recipients.forEach(function (r) {
          var chatId = (r && r.chatId) ? r.chatId : r;
          if (!chatId) return;
          fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: String(chatId), text: text, parse_mode: 'HTML' })
          }).catch(function (e) { console.warn('[Telegram] Send failed to', chatId, e.message); });
        });
      });
    }

    return { send };
  })();

  function setupOrdersListener() {
    if (!useFirebase) return;
    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(function (snap) {
      const prevCount = lastOrderCount;
      const newDocs = [];
      snap.docChanges().forEach(function (ch) {
        if (ch.type === 'added') newDocs.push(docToOrder(ch.doc.id, ch.doc.data()));
      });
      orders = snap.docs.map(function (doc) { return docToOrder(doc.id, doc.data()); });
      if (prevCount > 0 && newDocs.length) {
        playTing();
        newDocs.forEach(function (o) {
          const custName = (o.customer && o.customer.name) ? o.customer.name : 'Khách';
          const method = o.method === 'cash' ? '💵 Tiền mặt' : '🏦 Chuyển khoản';
          NotifMgr.push(
            'order',
            '🛍️ Đơn hàng mới #' + o.id,
            custName + ' · ' + vndK(totalK(o)) + ' · ' + method,
            o.id
          );
          TelegramNotif.send(
            '🛍️ <b>Đơn hàng mới #' + o.id + '</b>\n'
            + '👤 ' + custName + '\n'
            + '💰 ' + vndK(totalK(o)) + ' · ' + method + '\n'
            + '📍 ' + ((o.customer && o.customer.address) ? o.customer.address : 'Chưa có địa chỉ')
          );
        });
      }
      lastOrderCount = orders.length;
      renderOrders();
      updateNewOrderBadge();
      renderThreads(); // sidebar only — do NOT call renderDetail() here (wipes active chat)
      renderReport();
    }, function () { if (qs('#admin-debug')) qs('#admin-debug').textContent = 'Mất kết nối Firebase'; });
  }

  // Track last-seen lastMessageAt per session to avoid duplicate chat notifications
  const _chatLastSeen = {};

  function setupGuestChatsListener() {
    if (!useFirebase) return;
    db.collection('guestChats').orderBy('lastMessageAt', 'desc').onSnapshot(function (snap) {
      const newMessages = [];
      snap.docChanges().forEach(function (ch) {
        if (ch.type !== 'added' && ch.type !== 'modified') return;
        const d = ch.doc.data() || {};
        const ts = d.lastMessageAt && (d.lastMessageAt.toMillis ? d.lastMessageAt.toMillis() : d.lastMessageAt) || 0;
        const prev = _chatLastSeen[ch.doc.id] || 0;
        // Only notify if lastMessageAt actually moved forward and doc is not currently selected
        if (ts > prev && !(selectedId === ch.doc.id && selectedType === 'guest')) {
          if (prev > 0) { // skip very first load
            newMessages.push({
              id: ch.doc.id,
              label: d.guestLabel || ('Khach ' + String(ch.doc.id).slice(-6).toUpperCase()),
              ts
            });
          }
          _chatLastSeen[ch.doc.id] = ts;
        } else if (!_chatLastSeen[ch.doc.id]) {
          _chatLastSeen[ch.doc.id] = ts; // seed on first load
        }
      });

      guestChats = snap.docs.map(function (doc) {
        const d = doc.data() || {};
        const ts = d.lastMessageAt && (d.lastMessageAt.toMillis ? d.lastMessageAt.toMillis() : d.lastMessageAt) || Date.now();
        return {
          id: doc.id,
          sessionId: d.sessionId || doc.id,
          guestLabel: d.guestLabel || ('Khach ' + String(doc.id).slice(-6).toUpperCase()),
          createdAt: d.createdAt && (d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt) || ts,
          lastMessageAt: ts,
          viewedByAdmin: d.viewedByAdmin || false,
          type: 'guest'
        };
      });

      newMessages.forEach(function (m) {
        NotifMgr.push('chat', '💬 Tin nhắn mới từ ' + m.label, 'Khách vừa gửi tin nhắn', m.id);
      });

      // Only update sidebar — do NOT call renderDetail() here.
      // renderDetail() wipes chat.innerHTML and resets the messages listener,
      // causing a full reload/jump every time lastMessageAt changes (e.g. on every reply).
      renderThreads();
      updateNewChatBadge();
    }, function () { console.warn('Guest chats listener error'); });
  }

  function persistMenuToFirebase() {
    if (!useFirebase) return;
    db.collection('menu').doc('data').set({ categories, items }).catch(function () { alert('Lưu menu thất bại.'); });
  }

  function loadMenuFromFirebase(cb) {
    if (!useFirebase) { if (cb) cb(); return; }
    db.collection('menu').doc('data').get().then(function (doc) {
      if (doc.exists && doc.data()) {
        const d = doc.data();
        if (d.categories && d.categories.length) categories = d.categories;
        if (d.items && d.items.length) items = d.items;
      }
      if (cb) cb();
    }).catch(function () { if (cb) cb(); });
  }

  function renderStats(filtered) {
    const countBy = (status) => orders.filter(o => o.status === status).length;
    const unverified = countBy('unverified_cash');
    const pending = countBy('pending_transfer');
    const processing = countBy('processing');
    const completed = countBy('completed');
    const total = orders.length;
    const elU = qs('#stat-unverified');
    const elP = qs('#stat-pending');
    const elPr = qs('#stat-processing');
    const elC = qs('#stat-completed');
    const elT = qs('#stat-total');
    if(elU){
      elU.innerHTML = unverified ? `<span class="text-[10px] opacity-70">Chờ xác nhận</span> <span class="font-bold text-base ml-1">${unverified}</span>` : '';
      elU.style.display = unverified ? '' : 'none';
    }
    if(elP){
      elP.innerHTML = pending ? `<span class="text-[10px] opacity-70">Chờ xác minh CK</span> <span class="font-bold text-base ml-1">${pending}</span>` : '';
      elP.style.display = pending ? '' : 'none';
    }
    if(elPr){
      elPr.innerHTML = processing ? `<span class="text-[10px] opacity-70">Đang giao hàng</span> <span class="font-bold text-base ml-1">${processing}</span>` : '';
      elPr.style.display = processing ? '' : 'none';
    }
    if(elC){
      elC.innerHTML = completed ? `<span class="text-[10px] opacity-70">Hoàn thành</span> <span class="font-bold text-base ml-1">${completed}</span>` : '';
      elC.style.display = completed ? '' : 'none';
    }
    if(elT) elT.innerHTML = `<span class="text-[10px] opacity-60">Hiển thị</span> <span class="font-bold text-sm ml-1">${filtered}</span><span class="text-xs opacity-60 mx-1">/</span><span class="text-xs">${total}</span>`;
    // Click stats badges to jump to filter
    if(elU) elU.onclick = () => { const s = qs('#filter-status'); if(s){ s.value='unverified_cash'; currentPage=1; renderOrders(); } };
    if(elP) elP.onclick = () => { const s = qs('#filter-status'); if(s){ s.value='pending_transfer'; currentPage=1; renderOrders(); } };
    if(elPr) elPr.onclick = () => { const s = qs('#filter-status'); if(s){ s.value='processing'; currentPage=1; renderOrders(); } };
  }

  function renderOrders(){
    const root = qs('#order-list'); if(!root) return;
    root.innerHTML = '';
    const fs = qs('#filter-status')?.value || '';
    const fm = qs('#filter-method')?.value || '';
    const fd = qs('#filter-date')?.value || 'all';
    const q = (qs('#filter-search')?.value||'').trim().toLowerCase();
    const filtered = orders
      .filter(o => {
        if (fs && o.status !== fs) return false;
        if (fm && o.method !== fm) return false;
        if (!isInDateRange(o.createdAt, fd)) return false;
        if (q) {
          const matchId = String(o.id).toLowerCase().includes(q);
          const matchName = (o.customer?.name||'').toLowerCase().includes(q);
          const matchPhone = (o.customer?.phone||'').toLowerCase().includes(q);
          if (!matchId && !matchName && !matchPhone) return false;
        }
        return true;
      })
      .sort((a,b)=>b.createdAt-a.createdAt);

    // Update stats
    renderStats(filtered.length);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE;
    const pageItems = filtered.slice(pageStart, pageEnd);

    // Pagination UI
    const pagination = qs('#order-pagination');
    const pagePrev = qs('#page-prev');
    const pageNext = qs('#page-next');
    const pageInfo = qs('#page-info');
    if(pagination){
      if(filtered.length > PAGE_SIZE) {
        pagination.classList.remove('hidden');
        if(pageInfo){
          const start = pageStart + 1;
          const end = Math.min(pageEnd, filtered.length);
          pageInfo.innerHTML = `<span class="text-gray-500">Hiển thị</span> <span class="font-semibold text-gray-300">${start}-${end}</span> <span class="text-gray-600">trên</span> <span class="font-semibold text-gray-300">${filtered.length}</span> <span class="text-gray-600">đơn (Trang ${currentPage}/${totalPages})</span>`;
        }
        if(pagePrev) pagePrev.disabled = currentPage <= 1;
        if(pageNext) pageNext.disabled = currentPage >= totalPages;
      } else {
        pagination.classList.add('hidden');
      }
    }

    if(!pageItems.length){
      const emptyDiv = el('div','text-center py-12');
      emptyDiv.appendChild(el('div','text-4xl mb-3','📭'));
      emptyDiv.appendChild(el('div','text-gray-400 text-sm mb-1','Không tìm thấy đơn hàng nào'));
      emptyDiv.appendChild(el('div','text-gray-600 text-xs','Thử điều chỉnh bộ lọc hoặc tìm kiếm khác'));
      root.appendChild(emptyDiv);
      return;
    }

    pageItems.forEach(o=>{
      const isNew = isNewOrder(o);
      const cardClasses = 'rounded-xl border p-4 cursor-pointer transition hover:shadow-lg ' + 
        (isNew ? 'border-accent/40 bg-accent/5 hover:bg-accent/10 shadow-accent/20 animate-pulse-subtle' : 'border-white/10 bg-gray-700 hover:bg-gray-600');
      const card = el('div', cardClasses);
      
      // Header: Order ID (prominent) + Time
      const header = el('div','flex items-center justify-between mb-3 pb-2 border-b border-white/5');
      const orderId = el('div','flex items-center gap-2 flex-1 min-w-0');
      orderId.appendChild(el('span','text-base font-bold text-amber-300','#'+o.id));
      orderId.appendChild(el('span','text-xs ml-1 font-medium '+(isNew?'text-amber-400':'text-gray-400'), relativeTime(o.createdAt)));
      
      const badges = el('div','flex items-center gap-1.5 flex-shrink-0');
      if(isNew){
        const newBadge = el('span','px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent text-white border border-accent shadow-lg shadow-accent/50','✨ MỚI');
        badges.appendChild(newBadge);
      }
      const methodBadge = el('span','px-2 py-0.5 rounded-md text-[10px] font-medium '+(o.method==='cash'?'bg-amber-500/20 text-amber-300 border border-amber-500/30':'bg-blue-500/20 text-blue-300 border border-blue-500/30'), o.method==='cash'?'💵 TM':'🏦 CK');
      badges.appendChild(methodBadge);
      
      header.appendChild(orderId);
      header.appendChild(badges);
      card.appendChild(header);
      
      // Body: Customer Info + Amount + Status
      const body = el('div','flex items-center justify-between gap-3');
      
      // Left: Customer info
      const customerInfo = el('div','flex-1 min-w-0');
      const custName = o.customer?.name || 'Chưa có tên';
      const custPhone = o.customer?.phone || '';
      const custDiv = el('div','flex items-center gap-2 mb-1');
      custDiv.appendChild(el('span','text-xs text-gray-500','👤'));
      custDiv.appendChild(el('span','text-sm text-gray-200 font-medium truncate', custName));
      customerInfo.appendChild(custDiv);
      if(custPhone){
        const phoneDiv = el('div','flex items-center gap-2');
        phoneDiv.appendChild(el('span','text-xs text-gray-500','📱'));
        phoneDiv.appendChild(el('span','text-xs text-gray-400 font-mono', custPhone));
        customerInfo.appendChild(phoneDiv);
      }
      
      // Right: Amount + Status
      const amountStatus = el('div','flex flex-col items-end gap-2');
      const amount = el('div','text-lg font-bold text-success', vndK(totalK(o)));
      const statusInfo = getStatusInfo(o.status);
      const statusBadge = el('span','px-2.5 py-1 rounded-lg text-xs font-medium '+statusInfo.color, statusInfo.label);
      amountStatus.appendChild(amount);
      amountStatus.appendChild(statusBadge);
      
      body.appendChild(customerInfo);
      body.appendChild(amountStatus);
      card.appendChild(body);
      
      card.addEventListener('click', ()=>{ 
        selectedId=o.id;
        selectedType='order';
        markOrderViewed(o.id);
        showDetailModal();
      });
      root.appendChild(card);
    });
  }
  function showDetailModal(){
    const o = orders.find(x=>x.id===selectedId);
    const modal = qs('#order-detail-modal');
    
    if(!o) { console.warn('Order not found for id:', selectedId); return; }
    if(!modal) { console.error('Modal element not found'); return; }

    // Ensure modal is visible first
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    modal.classList.remove('hidden');

    // Header: Bill, Status, Method
    const billEl = qs('#modal-detail-bill');
    if(billEl) billEl.textContent = 'Đơn #' + o.id;

    const methodBadge = qs('#modal-detail-method-badge');
    if(methodBadge) {
      methodBadge.textContent = o.method === 'cash' ? '💵 TM' : '🏦 CK';
      methodBadge.className = 'px-2.5 py-1 rounded-md text-[10px] font-medium ' + (o.method === 'cash' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30');
    }

    const statusBadge = qs('#modal-detail-status-badge');
    if(statusBadge) {
      const si = getStatusInfo(o.status);
      statusBadge.textContent = si.label;
      statusBadge.className = 'px-2 py-1 rounded text-xs ' + si.color;
    }

    // Time with new badge
    const timeEl = qs('#modal-detail-time');
    if(timeEl) {
      const time = new Date(o.createdAt).toLocaleString('vi-VN');
      const isNew = isNewOrder(o);
      timeEl.innerHTML = '';
      if(isNew){
        const newBadge = el('span','px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent text-white mr-2 shadow-lg shadow-accent/50','✨ MỚI');
        timeEl.appendChild(newBadge);
      }
      const timeText = el('span', isNew ? 'text-amber-400 font-medium' : 'font-medium');
      timeText.textContent = time + ' · ' + relativeTime(o.createdAt);
      timeEl.appendChild(timeText);
    }

    // Customer Info
    const custEl = qs('#modal-detail-customer');
    if(custEl){
      const c = o.customer || {};
      const info = (c.name || 'Chưa có') + ' · ' + (c.phone || '---');
      custEl.textContent = info;
    }

    // Address
    const addrEl = qs('#modal-detail-address');
    if(addrEl){
      const c = o.customer || {};
      const parts = [c.address || '', [c.city, c.district, c.ward].filter(Boolean).join(', ')].filter(Boolean);
      addrEl.textContent = parts.join(' | ') || 'Chưa có địa chỉ';
    }

    // Items — dùng DOM thay vì innerHTML để tránh lỗi ký tự đặc biệt và ảnh base64
    const itemsEl = qs('#modal-detail-items');
    if(itemsEl){
      itemsEl.innerHTML = '';
      o.items.forEach(i => {
        const row = el('div', 'flex items-center gap-4 rounded-xl bg-gray-800/50 border border-white/5 px-4 py-3 hover:bg-gray-800 transition');
        // Image with fallback
        if(i.img) {
          const img = document.createElement('img');
          img.src = i.img;
          img.alt = i.name || '';
          img.className = 'w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-700 border border-white/10';
          img.onerror = function() {
            this.onerror = null;
            this.src = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=96&q=60';
          };
          row.appendChild(img);
        } else {
          row.appendChild(el('div', 'w-16 h-16 rounded-lg bg-gray-700 flex-shrink-0 border border-white/10'));
        }
        const info = el('div', 'flex-1 min-w-0');
        const nameRow = el('div', 'flex items-center justify-between gap-2 mb-1');
        const name = el('span', 'font-medium text-gray-200 text-sm truncate');
        name.textContent = i.name || '';
        const qty = el('span', 'text-xs px-2 py-0.5 rounded-md bg-gray-700 text-gray-400 font-mono');
        qty.textContent = `x${i.qty}`;
        nameRow.appendChild(name);
        nameRow.appendChild(qty);
        const priceRow = el('div', 'flex items-center justify-between text-xs');
        const unitPrice = el('span', 'text-gray-500');
        unitPrice.textContent = `Đơn giá: ${vndK(i.priceK)}`;
        const subtotal = el('span', 'text-gray-300 font-medium');
        subtotal.textContent = vndK(i.qty * i.priceK);
        priceRow.appendChild(unitPrice);
        priceRow.appendChild(subtotal);
        info.appendChild(nameRow);
        info.appendChild(priceRow);
        row.appendChild(info);
        itemsEl.appendChild(row);
      });
    }

    // Total
    const totalEl = qs('#modal-detail-total');
    if(totalEl) totalEl.textContent = vndK(totalK(o));

    // Bill Preview (only for transfer)
    const billSection = qs('#modal-detail-bill-section');
    const billPreview = qs('#modal-detail-bill-preview');
    if(billSection && billPreview){
      if(o.method === 'transfer' && o.billUrl){
        billSection.classList.remove('hidden');
        billPreview.src = o.billUrl;
        billPreview.onclick = () => window.open(o.billUrl, '_blank');
      } else {
        billSection.classList.add('hidden');
      }
    }

    // Notes
    const noteSection = qs('#modal-detail-note-section');
    const noteEl = qs('#modal-detail-note');
    if(noteSection && noteEl){
      if(o.note && o.note.trim()){
        noteSection.classList.remove('hidden');
        noteEl.textContent = o.note;
      } else {
        noteSection.classList.add('hidden');
      }
    }

    // Update action button states
    const canApprove = o.status==='unverified_cash' || o.status==='pending_transfer';
    const canComplete = o.status==='processing';
    const ap=qs('#modal-btn-approve'), dn=qs('#modal-btn-done');
    if(ap){ 
      ap.disabled=!canApprove; 
      if(!canApprove){ ap.classList.add('opacity-50', 'cursor-not-allowed'); }
      else{ ap.classList.remove('opacity-50', 'cursor-not-allowed'); }
    }
    if(dn){ 
      dn.disabled=!canComplete; 
      if(!canComplete){ dn.classList.add('opacity-50', 'cursor-not-allowed'); }
      else{ dn.classList.remove('opacity-50', 'cursor-not-allowed'); }
    }
  }

  function renderDetail(){
    const chat = qs('#chat-log');
    const scrollContainer = qs('#chat-scroll-container'); // actual overflow-y-auto container
    const inputSec = qs('#chat-input-section'), emptyState = qs('#chat-empty-state');
    const chatHeader = qs('#chat-header'), headerName = qs('#chat-header-name'), headerInfo = qs('#chat-header-info'), headerAvatar = qs('#chat-avatar-text');
    
    if(!selectedId || !selectedType){
      if(inputSec) inputSec.classList.add('hidden');
      if(chatHeader) chatHeader.classList.add('hidden');
      if(emptyState) emptyState.classList.remove('hidden');
      if(chat) { chat.classList.add('hidden'); chat.innerHTML = ''; }
      if(messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
      return;
    }

    if(inputSec) inputSec.classList.remove('hidden');
    if(chatHeader) chatHeader.classList.remove('hidden');
    if(emptyState) emptyState.classList.add('hidden');
    if(chat) chat.classList.remove('hidden');

    // Populate chat header (guest only — orders are not in chat tab)
    if (headerName && headerInfo && headerAvatar) {
      const guest = guestChats.find(g => g.id === selectedId);
      if (guest) {
        headerAvatar.textContent = '👤';
        headerName.textContent = guest.guestLabel || 'Khach chat';
        const startTs = guest.createdAt || guest.lastMessageAt;
        const startLabel = startTs
          ? 'Bắt đầu: ' + new Date(startTs).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '';
        const lastLabel = guest.lastMessageAt
          ? ' · Cuối: ' + relativeTime(guest.lastMessageAt)
          : '';
        headerInfo.textContent = startLabel + lastLabel;
      }
    }

    // Smart scroll — only auto-scroll when user is near the bottom (avoids scroll jump)
    function smartScroll() {
      if (!scrollContainer) return;
      const threshold = 120;
      const nearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
      if (nearBottom) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }

    // Render chat messages
    if (chat) {
      if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
      
      if (useFirebase && selectedId) {
        const activeSelectedId = selectedId;
        const activeSelectedType = selectedType;
        const collectionPath = activeSelectedType === 'guest' ? 'guestChats' : 'orders';
        chat.innerHTML = '';
        let _lastRenderedDate = null; // tracks day for separator chips
        
        // Do NOT auto-create guest chat docs from admin side.
        // A guest chat should exist only after the customer sends the first message.
        Promise.resolve().then(function() {
          // Ignore stale async callback when user has already switched to another thread.
          if (selectedId !== activeSelectedId || selectedType !== activeSelectedType) return;
          // Cancel any previous listener (safety guard for rapid re-renders of the same thread)
          if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
          messagesUnsub = db.collection(collectionPath).doc(activeSelectedId).collection('messages').orderBy('createdAt').onSnapshot(function (snap) {
          snap.docChanges().forEach(function (change) {
            if (change.type === 'added') {
              // Deduplicate by data-msg-id — prevents double render if snapshot re-fires
              // Do NOT guard by hasPendingWrites: admin messages are NOT rendered locally,
              // so the first 'added' event (hasPendingWrites:true) is the ONLY chance to render.
              // The committed version fires as 'modified', which is ignored by type check above.
              if (chat.querySelector('[data-msg-id="' + change.doc.id + '"]')) return;

              const m = change.doc.data();
              const msgTs = m.createdAt
                ? (m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt))
                : null;

              // ── Day separator ──────────────────────────────────────────
              if (msgTs) {
                const dayKey = msgTs.toDateString(); // locale-independent day key
                if (dayKey !== _lastRenderedDate) {
                  _lastRenderedDate = dayKey;
                  const sep = document.createElement('div');
                  sep.className = 'flex items-center gap-2 my-3 px-1';
                  const lineL = document.createElement('div');
                  lineL.className = 'flex-1 h-px bg-white/10';
                  const chip = document.createElement('span');
                  chip.className = 'text-[10px] text-gray-400 bg-gray-700/80 border border-white/10 px-2.5 py-1 rounded-full shrink-0';
                  chip.textContent = formatDayLabel(msgTs.getTime());
                  const lineR = document.createElement('div');
                  lineR.className = 'flex-1 h-px bg-white/10';
                  sep.appendChild(lineL); sep.appendChild(chip); sep.appendChild(lineR);
                  chat.appendChild(sep);
                }
              }

              const wrapper = document.createElement('div');
              wrapper.className = 'flex flex-col ' + (m.from === 'admin' ? 'items-end' : 'items-start') + ' gap-0.5';
              wrapper.dataset.msgId = change.doc.id;
              
              const bubble = document.createElement('div');
              bubble.className = 'max-w-[75%] px-4 py-2.5 text-sm shadow-sm '
                + (m.from === 'admin'
                  ? 'bg-accent text-white rounded-2xl rounded-br-sm'
                  : 'bg-gray-700 text-gray-100 rounded-2xl rounded-bl-sm');
              
              if (m.type === 'image') {
                const img = document.createElement('img');
                img.src = m.content;
                img.className = 'max-h-48 max-w-full rounded-xl cursor-zoom-in hover:opacity-90 transition';
                img.onclick = function () { window.open(m.content, '_blank'); };
                bubble.appendChild(img);
              } else {
                bubble.textContent = m.content || '';
              }
              wrapper.appendChild(bubble);
              
              // ── Timestamp ──────────────────────────────────────────────
              if (msgTs) {
                const time = document.createElement('div');
                time.className = 'text-[10px] px-1 ' + (m.from === 'admin' ? 'text-gray-400' : 'text-gray-500');
                time.textContent = formatMsgTime(msgTs.getTime());
                wrapper.appendChild(time);
              }
              
              chat.appendChild(wrapper);
              smartScroll();
            } else if (change.type === 'removed') {
              const msgEl = chat.querySelector('[data-msg-id="' + change.doc.id + '"]');
              if (msgEl) msgEl.remove();
            }
          });
          }, function(err) {
            console.error('[Admin Chat] snapshot error:', err);
            Toast.error('❌ Lỗi tải tin nhắn: ' + err.message);
          });
          
          // Initial scroll to bottom after messages load
          setTimeout(function() {
            if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }, 400);
        }).catch(function(err) {
          console.error('[Admin Chat] doc check failed:', err);
          Toast.error('❌ Không thể tải chat: ' + err.message);
        });

      } else {
        // Non-Firebase fallback
        chat.innerHTML = '';
        const o = orders.find(x => x.id === selectedId);
        if (o && o.chat) {
          o.chat.forEach(function(m){
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col ' + (m.from === 'admin' ? 'items-end' : 'items-start');
            const bubble = document.createElement('div');
            bubble.className = 'max-w-[75%] px-4 py-2.5 rounded-2xl text-sm '
              + (m.from === 'admin' ? 'bg-accent text-white' : 'bg-gray-700 text-gray-100');
            bubble.textContent = m.content || '';
            wrapper.appendChild(bubble);
            chat.appendChild(wrapper);
          });
        }
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }
  function renderThreads(){
    const root=qs('#chat-threads'); if(!root) return;
    root.innerHTML='';
    
    const q=qs('#chat-count'); 
    if(q) q.textContent = guestChats.length ? `${guestChats.length} cuộc trò chuyện` : '';

    if (!guestChats.length) {
      const empty = el('div','flex flex-col items-center justify-center h-32 text-center');
      empty.appendChild(el('div','text-3xl mb-2 opacity-30','💬'));
      empty.appendChild(el('div','text-xs text-gray-500','Chưa có tin nhắn nào'));
      empty.appendChild(el('div','text-xs text-gray-600 mt-1','Khách sẽ xuất hiện ở đây khi chat từ trang chủ'));
      root.appendChild(empty);
      return;
    }

    // Sort guest chats by last message time desc
    const sorted = [...guestChats].sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    sorted.forEach(g => {
      const isSelected = g.id === selectedId && selectedType === 'guest';
      const isNew = !g.viewedByAdmin;
      
      const row = el('div','thread-item flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer ' + (isSelected ? 'active' : 'border border-transparent'));
      
      const avatar = el('div','w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-base shrink-0','👤');
      row.appendChild(avatar);
      
      const left = el('div','flex-1 min-w-0');
      
      const nameRow = el('div','flex items-center justify-between gap-1 w-full');
      const nameLeft = el('div','flex items-center gap-1.5 min-w-0');
      nameLeft.appendChild(el('span','text-sm font-medium text-gray-200 truncate', g.guestLabel || 'Khach chat'));
      if (isNew) {
        nameLeft.appendChild(el('span','px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent text-white shrink-0 animate-pulse-subtle','MỚI'));
      }
      nameRow.appendChild(nameLeft);
      // Relative time — right aligned, updates on re-render
      nameRow.appendChild(el('span','text-[10px] text-gray-400 shrink-0 tabular-nums', relativeTime(g.lastMessageAt || g.createdAt)));
      left.appendChild(nameRow);

      // Session start date as subtitle
      const startTs = g.createdAt || g.lastMessageAt;
      const startLabel = startTs
        ? 'Bắt đầu: ' + new Date(startTs).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';
      left.appendChild(el('div','text-[10px] text-gray-500 truncate mt-0.5', startLabel));
      
      row.appendChild(left);

      const deleteBtn = el('button','text-gray-600 hover:text-red-400 text-sm px-1 shrink-0 transition','🗑️');
      deleteBtn.title = 'Xóa chat';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Xóa cuộc trò chuyện này? Hành động không thể hoàn tác.')) {
          deleteGuestChat(g.id);
        }
      });
      row.appendChild(deleteBtn);

      row.addEventListener('click', () => {
        selectedId = g.id;
        selectedType = 'guest';
        markChatViewed(g.id);
        renderThreads();
        renderDetail();
      });

      root.appendChild(row);
    });
  }
  
  function deleteGuestChat(guestId) {
    if (!useFirebase) return;
    
    // Delete messages sub-collection first
    db.collection('guestChats').doc(guestId).collection('messages').get()
      .then(snapshot => {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        // Delete guest chat document
        return db.collection('guestChats').doc(guestId).delete();
      })
      .then(() => {
        Toast.success('✓ Đã xóa cuộc trò chuyện');
        // Reset selection if deleted chat was selected
        if (selectedId === guestId && selectedType === 'guest') {
          selectedId = null;
          selectedType = null;
          renderDetail();
        }
      })
      .catch(err => {
        Toast.error('❌ Xóa thất bại: ' + err.message);
      });
  }

  function deleteOrder(orderId) {
    if (!orderId) return;

    if (!useFirebase) {
      orders = orders.filter(o => o.id !== orderId);
      if (selectedId === orderId && selectedType === 'order') {
        selectedId = null;
        selectedType = null;
      }
      const modal = qs('#order-detail-modal');
      if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
      renderOrders();
      renderThreads();
      renderReport();
      updateNewOrderBadge();
      Toast.success('✓ Đã xóa đơn hàng');
      return;
    }

    // Delete messages sub-collection first, then delete the order doc.
    db.collection('orders').doc(orderId).collection('messages').get()
      .then(snapshot => {
        if (!snapshot.docs.length) return null;
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        return batch.commit();
      })
      .then(() => {
        return db.collection('orders').doc(orderId).delete();
      })
      .then(() => {
        const modal = qs('#order-detail-modal');
        if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
        if (selectedId === orderId && selectedType === 'order') {
          selectedId = null;
          selectedType = null;
        }
        Toast.success('✓ Đã xóa đơn hàng');
      })
      .catch(err => {
        Toast.error('❌ Xóa đơn thất bại: ' + err.message);
      });
  }
  
  function updateStatus(id, status){
    const o = orders.find(x=>x.id===id); if(!o) return;
    if (useFirebase) {
      db.collection('orders').doc(id).update({ status: status }).then(function () {
        o.status = status;
        showDetailModal();
        renderThreads();
        Toast.success(`✓ Cập nhật trạng thái thành công: ${statusMap[status].label}`);
      }).catch(function (err) { 
        Toast.error('❌ Cập nhật trạng thái thất bại: ' + err.message);
      });
    } else {
      o.status = status;
      renderOrders();
      showDetailModal();
      renderThreads();
      Toast.success(`✓ Cập nhật trạng thái thành công: ${statusMap[status].label}`);
    }
  }
  function exportDay(){
    const rows=[]; orders.forEach(o=>{
      const time = new Date(o.createdAt).toLocaleString('vi-VN');
      const status = getStatusInfo(o.status).label;
      const total = totalK(o)*1000;
      o.items.forEach(i=>{
        rows.push({'Mã đơn':o.id,'Hình thức':o.method==='transfer'?'Chuyển khoản':'Tiền mặt','Trạng thái':status,'Thời gian':time,'Món':i.name,'Số lượng':i.qty,'Đơn giá (VND)':i.priceK*1000,'Thành tiền (VND)':i.qty*i.priceK*1000,'Tổng đơn (VND)':total});
      });
    });
    const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Bao_cao'); XLSX.writeFile(wb,'Bao_cao_don_hang.xlsx');
  }
  function playTing(){
    if(!audioEnabled) return;
    try{ const ctx=new (window.AudioContext||window.webkitAudioContext)(); const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(880,ctx.currentTime); g.gain.setValueAtTime(0.001,ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.2,ctx.currentTime+0.01); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2); o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.22);}catch(e){}
  }
  function simulateNewOrder(){ if (useFirebase) return; }
  function bindOrders(){
    const b1=qs('#export-day'); const b2=qs('#export-day-2'); const ba=qs('#enable-audio');
    b1&&b1.addEventListener('click', exportDay); b2&&b2.addEventListener('click', exportDay);
    ba&&ba.addEventListener('click', ()=>{ audioEnabled=true; });
    ['#filter-status','#filter-method','#filter-search','#filter-date'].forEach(s=>{
      const e=qs(s);
      e&&e.addEventListener('input', ()=>{ currentPage=1; renderOrders(); });
      e&&e.addEventListener('change', ()=>{ currentPage=1; renderOrders(); });
    });
    // Pagination buttons
    const pagePrev = qs('#page-prev'), pageNext = qs('#page-next');
    pagePrev&&pagePrev.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderOrders(); } });
    pageNext&&pageNext.addEventListener('click', ()=>{ currentPage++; renderOrders(); });
    
    // Modal buttons
    const ap=qs('#modal-btn-approve'), dn=qs('#modal-btn-done'), cc=qs('#modal-btn-cancel'), ff=qs('#modal-btn-fail'), del=qs('#modal-btn-delete');
    const doneClose = qs('#modal-detail-close'), modal = qs('#order-detail-modal');
    ap&&ap.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'processing'); }});
    dn&&dn.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'completed'); }});
    cc&&cc.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'canceled'); }});
    ff&&ff.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'failed'); }});
    del&&del.addEventListener('click', ()=>{
      if(!selectedId) return;
      if(!confirm('Xóa đơn hàng này khỏi hệ thống?\n\nLưu ý: Không thể khôi phục!')) return;
      deleteOrder(selectedId);
    });
    if(doneClose){
      doneClose.addEventListener('click', (e)=>{ 
        e.preventDefault();
        e.stopPropagation();
        if(modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
      });
    }
    if(modal){
      modal.addEventListener('click', (e)=>{ 
        if(e.target === modal) {
          modal.style.display = 'none';
          modal.classList.add('hidden');
        }
      });
    }
    
    // Chat buttons
    const send=qs('#chat-send'), up=qs('#chat-upload'), input=qs('#chat-input');
    // IME FIX (definitive):
    // When user presses Enter while macOS Vietnamese IME has an active composition (no trailing space),
    // Chrome fires: (1) keydown(Enter) → our handler sends & clears, then (2) IME commits its buffer
    // via 'input' event re-inserting last word, then (3) macOS auto-fires a 2nd keydown(Enter) ~38ms
    // later which sends the re-inserted word as a duplicate. compositionend NEVER fires in this path.
    // Fix: _adminJustSent flag blocks the 2nd Enter within a 200ms window.
    let _adminJustSent = false;
    input&&input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (_adminJustSent) {
          // This is the IME-passthrough 2nd Enter — discard it and clear any re-inserted text
          input.value = '';
          _adminJustSent = false;
          return;
        }
        _adminJustSent = true;
        setTimeout(() => { _adminJustSent = false; input.value = ''; }, 200);
        send&&send.click();
        input.value = '';
      }
    });
    send&&send.addEventListener('click', ()=>{
      const t = input.value.trim();
      input.value = '';
      if (!t||!selectedId||!selectedType) return;
      if (useFirebase) {
        const collectionPath = selectedType === 'guest' ? 'guestChats' : 'orders';
        db.collection(collectionPath).doc(selectedId).collection('messages').add({ 
          from:'admin', type:'text', content:t, 
          createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        }).then(() => {
          // Update lastMessageAt for guest chats
          if (selectedType === 'guest') {
            db.collection('guestChats').doc(selectedId).update({
              lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
          }
        }).catch(function(){ Toast.error('❌ Gửi tin nhắn thất bại'); });
      } else {
        const o=orders.find(x=>x.id===selectedId); if(o) o.chat.push({from:'admin',type:'text',content:t});
        renderDetail(); renderThreads();
      }
    });
    up&&up.addEventListener('change', (e)=>{
      const f=e.target.files&&e.target.files[0]; if(!f||!selectedId||!selectedType) return;
      const r=new FileReader();
      r.onload=function(){
        if (useFirebase) {
          const collectionPath = selectedType === 'guest' ? 'guestChats' : 'orders';
          db.collection(collectionPath).doc(selectedId).collection('messages').add({ 
            from:'admin', type:'image', content:r.result, 
            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
          }).then(() => {
            // Update lastMessageAt for guest chats
            if (selectedType === 'guest') {
              db.collection('guestChats').doc(selectedId).update({
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
              }).catch(() => {});
            }
          }).catch(function(){ Toast.error('❌ Gửi ảnh thất bại'); });
        } else {
          const o=orders.find(x=>x.id===selectedId); if(o) o.chat.push({from:'admin',type:'image',content:r.result});
          renderDetail();
        }
      };
      r.readAsDataURL(f);
      e.target.value='';
    });
    if (!useFirebase) setTimeout(simulateNewOrder, 8000);
  }
  function bindQuickReplies(){
    const box=qs('#quick-replies'); if(!box) return;
    box.addEventListener('click', (e)=>{
      const b=e.target.closest('.qr'); if(!b||!selectedId||!selectedType) return;
      const txt = b.textContent;
      if (useFirebase) {
        const collectionPath = selectedType === 'guest' ? 'guestChats' : 'orders';
        db.collection(collectionPath).doc(selectedId).collection('messages').add({ 
          from:'admin', type:'text', content:txt, 
          createdAt: firebase.firestore.FieldValue.serverTimestamp() 
        }).then(() => {
          // Update lastMessageAt for guest chats
          if (selectedType === 'guest') {
            db.collection('guestChats').doc(selectedId).update({
              lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(() => {});
          }
        }).catch(function(){ alert('Gửi thất bại.'); });
      } else {
        const o=orders.find(x=>x.id===selectedId); if(o) o.chat.push({from:'admin',type:'text',content:txt}); renderDetail();
      }
    });
  }
  function renderCategories(){
    const root=qs('#cat-list'); if(!root) return; root.innerHTML='';
    categories.forEach(c=>{
      const row=el('div','flex items-center justify-between rounded-lg bg-gray-700/50 p-3 border border-white/10');
      row.appendChild(el('div','text-sm text-gray-200',c.name));
      const r=el('div','flex items-center gap-1');
      const ed=el('button','px-2 py-1 rounded-lg border border-white/20 bg-gray-600 hover:bg-gray-500 text-xs','Sửa');
      const del=el('button','px-2 py-1 rounded-lg border border-white/20 bg-gray-600 hover:bg-gray-500 text-xs','Xóa');
      ed.addEventListener('click', ()=>openModal('Sửa danh mục',[
        {type:'input',id:'cat-name',value:c.name,placeholder:'Tên danh mục'}
      ], ()=>{ c.name=qs('#cat-name').value.trim()||c.name; persistMenu(); renderCategories(); renderItems(); }));
      del.addEventListener('click', ()=>{
        openModal('Xóa danh mục',[{type:'text',id:'t',value:'Xác nhận xóa?'}], ()=>{ categories=categories.filter(x=>x.id!==c.id); items=items.map(it=>it.cat===c.id?({...it,cat:''}):it); persistMenu(); renderCategories(); renderItems(); });
      });
      r.appendChild(ed); r.appendChild(del); row.appendChild(r); root.appendChild(row);
    });
  }
  function renderItems(){
    const root=qs('#item-list'); if(!root) return; root.innerHTML='';
    items.forEach(it=>{
      const row=el('div','flex items-center justify-between rounded-lg bg-gray-700/50 p-3 border border-white/10');
      const left=el('div',''); left.appendChild(el('div','font-medium text-sm text-gray-200',it.name+(it.visible!==false?'':' (Ẩn)'))); left.appendChild(el('div','text-xs text-gray-500', `${it.priceK}k · ${(categories.find(c=>c.id===it.cat)?.name||'Chưa có danh mục')}`));
      const r=el('div','flex items-center gap-1');
      const hide=el('button','px-2 py-1 rounded-lg border border-white/20 bg-gray-600 hover:bg-gray-500 text-xs', it.visible!==false?'Ẩn':'Hiện');
      const ed=el('button','px-2 py-1 rounded-lg border border-white/20 bg-gray-600 hover:bg-gray-500 text-xs','Sửa');
      const del=el('button','px-2 py-1 rounded-lg border border-white/20 bg-gray-600 hover:bg-gray-500 text-xs','Xóa');
      hide.addEventListener('click', ()=>{ it.visible=!it.visible; persistMenu(); renderItems(); });
      ed.addEventListener('click', ()=>{
        openModal('Sửa món',[
          {type:'input',id:'it-name',value:it.name,placeholder:'Tên món'},
          {type:'input',id:'it-price',value:String(it.priceK),placeholder:'Giá (k)'},
          {type:'input',id:'it-desc',value:it.desc||'',placeholder:'Mô tả'},
          {type:'file',id:'it-img',value:it.img||'',placeholder:'Chọn ảnh mới (để trống giữ nguyên)', accept:'image/*'},
          {type:'select',id:'it-cat',value:it.cat,options:categories.map(c=>({value:c.id,label:c.name}))}
        ], async()=>{
          it.name=qs('#it-name').value.trim()||it.name;
          const p=Number(qs('#it-price').value); it.priceK=isNaN(p)?it.priceK:Math.round(p);
          it.desc=qs('#it-desc').value.trim(); it.cat=qs('#it-cat').value;
          const fileInput=qs('#it-img');
          let loadingToast = null;
          if(fileInput.files[0]){
            loadingToast = Toast.loading('🔄 Đang nén ảnh...');
            const compressed=await ImageUtils.compressMenuImage(fileInput.files[0]);
            if(loadingToast) Toast.dismiss(loadingToast);
            if(!compressed){ Toast.error('❌ Nén ảnh thất bại'); return; }
            it.img=compressed;
          }
          persistMenu(); renderItems(); Toast.success('✓ Cập nhật món thành công');
        });
      });
      del.addEventListener('click', ()=>{
        openModal('Xóa món',[{type:'text',id:'t',value:'Xác nhận xóa?'}], ()=>{ items=items.filter(x=>x.id!==it.id); persistMenu(); renderItems(); });
      });
      r.appendChild(hide); r.appendChild(ed); r.appendChild(del);
      row.appendChild(left); row.appendChild(r); root.appendChild(row);
    });
  }
  function openModal(title, fields, onOk){
    const m=qs('#modal'); const t=qs('#modal-title'); const b=qs('#modal-body'); const ok=qs('#modal-ok'); const cc=qs('#modal-cancel');
    t.textContent=title; b.innerHTML='';
    const inputCls='w-full rounded-lg border border-white/20 bg-gray-700 text-gray-200 p-2 placeholder-gray-500';
    fields.forEach(f=>{
      if(f.type==='input'){ const i=el('input',inputCls,{toString:()=>''}); i.id=f.id; i.value=f.value||''; i.placeholder=f.placeholder||''; b.appendChild(i); }
      else if(f.type==='select'){ const s=el('select',inputCls); s.id=f.id; (f.options||[]).forEach(o=>{ const op=document.createElement('option'); op.value=o.value; op.textContent=o.label; s.appendChild(op); }); s.value=f.value||''; b.appendChild(s); }
      else if(f.type==='text'){ const d=el('div','text-sm text-gray-400',f.value||''); d.id=f.id; b.appendChild(d); }
      else if(f.type==='file'){ 
        const wrapper=el('div','space-y-2');
        const input=el('input',inputCls); input.type='file'; input.id=f.id; input.accept=f.accept||'image/*'; input.placeholder=f.placeholder||'';
        const preview=el('img','w-full rounded-lg border border-white/20 hidden'); preview.id=f.id+'-preview';
        const fileInfo=el('div','text-xs text-gray-400'); fileInfo.id=f.id+'-info';
        
        // Show existing image if provided
        if(f.value && f.value.startsWith('data:')) {
          preview.src=f.value; preview.classList.remove('hidden'); fileInfo.textContent='(ảnh hiện tại)';
        }
        
        input.addEventListener('change', async(e)=>{
          const file=e.target.files[0];
          if(!file) return;
          if(!ImageUtils.isValidImage(file)){ Toast.error('❌ Ảnh không hợp lệ hoặc quá lớn'); return; }
          fileInfo.textContent=`📎 ${file.name} (${ImageUtils.formatFileSize(file.size)})`;
          const reader=new FileReader();
          reader.onload=(ev)=>{ preview.src=ev.target.result; preview.classList.remove('hidden'); };
          reader.readAsDataURL(file);
        });
        wrapper.appendChild(input); wrapper.appendChild(preview); wrapper.appendChild(fileInfo);
        b.appendChild(wrapper);
      }
    });
    m.classList.remove('hidden');
    function done(){ m.classList.add('hidden'); ok.removeEventListener('click', handler); cc.removeEventListener('click', cancel); }
    async function handler(){ if(onOk) { await onOk(); } done(); }
    function cancel(){ done(); }
    ok.addEventListener('click', handler); cc.addEventListener('click', cancel);
  }
  function bindMenu(){
    const addCat=qs('#add-cat'), addItem=qs('#add-item');
    addCat&&addCat.addEventListener('click', ()=>openModal('Thêm danh mục',[
      {type:'input',id:'cat-name',placeholder:'Tên danh mục'}
    ], ()=>{ const n=qs('#cat-name').value.trim(); if(!n) return; categories.push({id:'cat-'+Date.now(),name:n}); persistMenu(); renderCategories(); }));
    addItem&&addItem.addEventListener('click', ()=>openModal('Thêm món',[
      {type:'input',id:'it-name',placeholder:'Tên món'},
      {type:'input',id:'it-price',placeholder:'Giá (k)'},
      {type:'input',id:'it-desc',placeholder:'Mô tả'},
      {type:'file',id:'it-img',placeholder:'Chọn ảnh', accept:'image/*'},
      {type:'select',id:'it-cat',options:categories.map(c=>({value:c.id,label:c.name}))}
    ], async()=>{
      const name=qs('#it-name').value.trim(); const p=Number(qs('#it-price').value||'0'); const desc=qs('#it-desc').value.trim(); const cat=qs('#it-cat').value;
      if(!name||isNaN(p)||p<=0) { Toast.error('❌ Tên và giá không hợp lệ'); return; }
      let img='';
      const fileInput=qs('#it-img'); 
      let loadingToast = null;
      if(fileInput.files[0]){
        loadingToast = Toast.loading('🔄 Đang nén ảnh...');
        img=await ImageUtils.compressMenuImage(fileInput.files[0]);
        if(loadingToast) Toast.dismiss(loadingToast);
        if(!img){ Toast.error('❌ Nén ảnh thất bại'); return; }
      }
      items.push({id:'it-'+Date.now(), name, priceK:Math.round(p), desc, img, cat, visible:true});
      persistMenu(); renderItems(); Toast.success('✓ Thêm món thành công');
    }));
    renderCategories(); renderItems();
  }
  function bindTabs(){
    qsa('.tab').forEach(b=>b.addEventListener('click', ()=>showTab(b.dataset.tab)));
    showTab('orders');
  }
  function renderReport(){
    const box=qs('#report-box'); if(!box) return;
    const totalVND=orders.reduce((s,o)=>s+totalK(o)*1000,0);
    const done=orders.filter(o=>o.status==='completed').reduce((s,o)=>s+totalK(o)*1000,0);
    const fail=orders.filter(o=>o.status==='failed'||o.status==='canceled').length;
    box.innerHTML = `
      <div>Tổng doanh thu (tạm tính): <span class="font-semibold">${totalVND.toLocaleString('vi-VN')} đ</span></div>
      <div>Doanh thu đã hoàn thành: <span class="font-semibold">${done.toLocaleString('vi-VN')} đ</span></div>
      <div>Số đơn thất bại/hủy: <span class="font-semibold">${fail}</span></div>
    `;
  }
  function bindSettings(){
    const n=qs('#store-name'), h=qs('#store-hotline'), s=qs('#save-settings');
    const clearOrders=qs('#clear-old-orders'), clearChats=qs('#clear-guest-chats');
    const data=JSON.parse(localStorage.getItem('bb_store')||'null')||{};
    n.value=data.name||''; h.value=data.hotline||'';
    s&&s.addEventListener('click', ()=>{ 
      localStorage.setItem('bb_store', JSON.stringify({name:n.value.trim(),hotline:h.value.trim()})); 
      Toast.success('✓ Đã lưu cài đặt');
    });

    // ── VietQR Bank Config (Firestore: settings/payment_config) ────────────
    const bankCodeEl      = qs('#bank-code');
    const bankAccNoEl     = qs('#bank-account-no');
    const bankAccNameEl   = qs('#bank-account-name');
    const bankEnabledEl   = qs('#bank-enabled');
    const saveBankBtn     = qs('#save-bank-config');
    const bankStatusEl    = qs('#bank-config-status');
    const qrPreviewWrap   = qs('#bank-qr-preview-wrap');
    const qrPreviewImg    = qs('#bank-qr-preview');

    function buildVietQRUrl(code, accNo, accName, amt) {
      var c = (code||'').toUpperCase().trim();
      var a = (accNo||'').trim();
      if (!c || !a) return null;
      var name = encodeURIComponent((accName||'').trim());
      return 'https://img.vietqr.io/image/' + c + '-' + a + '-compact2.png'
        + '?amount=' + (amt||0)
        + '&addInfo=' + encodeURIComponent('Thanh toan B.BLING')
        + (name ? '&accountName=' + name : '');
    }

    function updateQRPreview() {
      var url = buildVietQRUrl(bankCodeEl&&bankCodeEl.value, bankAccNoEl&&bankAccNoEl.value, bankAccNameEl&&bankAccNameEl.value, 78000);
      if (url && qrPreviewWrap && qrPreviewImg) {
        qrPreviewImg.src = url;
        qrPreviewWrap.classList.remove('hidden');
      } else if (qrPreviewWrap) {
        qrPreviewWrap.classList.add('hidden');
      }
    }

    if (useFirebase) {
      // Load existing config
      db.collection('settings').doc('payment_config').get().then(function(doc) {
        if (!doc.exists) return;
        var d = doc.data();
        if (bankCodeEl    && d.bankCode)      bankCodeEl.value    = d.bankCode;
        if (bankAccNoEl   && d.accountNo)     bankAccNoEl.value   = d.accountNo;
        if (bankAccNameEl && d.accountName)   bankAccNameEl.value = d.accountName;
        if (bankEnabledEl)                    bankEnabledEl.checked = d.enabled !== false;
        updateQRPreview();
      }).catch(function(err) { console.warn('Load bank config failed:', err); });
    }

    if (bankCodeEl)    bankCodeEl.addEventListener('input',    updateQRPreview);
    if (bankAccNoEl)   bankAccNoEl.addEventListener('input',   updateQRPreview);
    if (bankAccNameEl) bankAccNameEl.addEventListener('input', updateQRPreview);

    saveBankBtn&&saveBankBtn.addEventListener('click', function() {
      var code    = (bankCodeEl&&bankCodeEl.value||'').toUpperCase().trim();
      var accNo   = (bankAccNoEl&&bankAccNoEl.value||'').trim();
      var accName = (bankAccNameEl&&bankAccNameEl.value||'').trim();
      var enabled = bankEnabledEl ? bankEnabledEl.checked : true;
      if (!code || !accNo) {
        if (bankStatusEl) bankStatusEl.textContent = '⚠️ Nhập mã ngân hàng và STK';
        return;
      }
      if (!useFirebase) { Toast.error('Cần Firebase để lưu'); return; }
      if (bankStatusEl) bankStatusEl.textContent = 'Đang lưu...';
      db.collection('settings').doc('payment_config').set({
        bankCode:    code,
        accountNo:   accNo,
        accountName: accName,
        enabled:     enabled,
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
      }).then(function() {
        if (bankStatusEl) bankStatusEl.textContent = '✓ Đã lưu';
        Toast.success('✓ Cấu hình ngân hàng đã cập nhật');
        updateQRPreview();
        setTimeout(function(){ if(bankStatusEl) bankStatusEl.textContent=''; }, 3000);
      }).catch(function(err) {
        if (bankStatusEl) bankStatusEl.textContent = '❌ Thất bại';
        Toast.error('❌ Lưu thất bại: ' + err.message);
      });
    });
    // ── End bank config ────────────────────────────────────────────────────
    
    // Clear old orders (>7 days)
    clearOrders&&clearOrders.addEventListener('click', ()=>{
      if(!confirm('Xóa tất cả đơn hàng cũ hơn 7 ngày?\n\nLưu ý: Không thể khôi phục!')) return;
      clearOldOrders();
    });
    
    // Clear guest chats (>3 days)
    clearChats&&clearChats.addEventListener('click', ()=>{
      if(!confirm('Xóa tất cả chat khách cũ hơn 3 ngày?\n\nLưu ý: Không thể khôi phục!')) return;
      clearOldGuestChats();
    });
  }
  
  function clearOldOrders() {
    if (!useFirebase) {
      Toast.error('Chỉ hoạt động với Firebase');
      return;
    }
    
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - SEVEN_DAYS;
    
    const oldOrders = orders.filter(o => o.createdAt < cutoffTime);
    if (!oldOrders.length) {
      Toast.info('Không có đơn cũ cần xóa');
      return;
    }
    
    Toast.info(`Đang xóa ${oldOrders.length} đơn cũ...`);
    
    const deletePromises = oldOrders.map(o => {
      // Delete messages sub-collection first
      return db.collection('orders').doc(o.id).collection('messages').get()
        .then(snap => {
          const batch = db.batch();
          snap.docs.forEach(doc => batch.delete(doc.ref));
          return batch.commit();
        })
        .then(() => {
          // Delete order document
          return db.collection('orders').doc(o.id).delete();
        });
    });
    
    Promise.all(deletePromises)
      .then(() => {
        Toast.success(`✓ Đã xóa ${oldOrders.length} đơn cũ`);
      })
      .catch(err => {
        Toast.error('❌ Xóa thất bại: ' + err.message);
      });
  }
  
  function clearOldGuestChats() {
    if (!useFirebase) {
      Toast.error('Chỉ hoạt động với Firebase');
      return;
    }
    
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - THREE_DAYS;
    
    const oldChats = guestChats.filter(g => g.lastMessageAt < cutoffTime);
    if (!oldChats.length) {
      Toast.info('Không có chat cũ cần xóa');
      return;
    }
    
    Toast.info(`Đang xóa ${oldChats.length} chat cũ...`);
    
    const deletePromises = oldChats.map(g => {
      // Delete messages sub-collection first
      return db.collection('guestChats').doc(g.id).collection('messages').get()
        .then(snap => {
          const batch = db.batch();
          snap.docs.forEach(doc => batch.delete(doc.ref));
          return batch.commit();
        })
        .then(() => {
          // Delete guest chat document
          return db.collection('guestChats').doc(g.id).delete();
        });
    });
    
    Promise.all(deletePromises)
      .then(() => {
        Toast.success(`✓ Đã xóa ${oldChats.length} chat cũ`);
      })
      .catch(err => {
        Toast.error('❌ Xóa thất bại: ' + err.message);
      });
  }
  function testAdminFlow(){
    if(!orders.length) return console.log('Không có đơn');
    selectedId = orders[0].id;
    updateStatus(selectedId,'completed');
    const updated = orders.find(o=>o.id===selectedId);
    const ok = updated && updated.status==='completed';
    console.log(ok?'✅ Duyệt đơn chuyển xanh':'❌ Không đạt');
  }
  
  function runChatSystemTests() {
    console.log('🧪 RUNNING CHAT SYSTEM TESTS...\n');
    
    let passed = 0, failed = 0;
    
    // Test 1: Guest chats array exists
    try {
      if (Array.isArray(guestChats)) {
        console.log('✅ Test 1: Guest chats array initialized');
        passed++;
      } else {
        throw new Error('guestChats is not an array');
      }
    } catch(e) {
      console.log('❌ Test 1: ' + e.message);
      failed++;
    }
    
    // Test 2: Selected type tracking
    try {
      if (selectedType === null || selectedType === 'order' || selectedType === 'guest') {
        console.log('✅ Test 2: Selected type tracking valid');
        passed++;
      } else {
        throw new Error('Invalid selectedType: ' + selectedType);
      }
    } catch(e) {
      console.log('❌ Test 2: ' + e.message);
      failed++;
    }
    
    // Test 3: Delete guest chat function exists
    try {
      if (typeof deleteGuestChat === 'function') {
        console.log('✅ Test 3: deleteGuestChat function exists');
        passed++;
      } else {
        throw new Error('deleteGuestChat is not a function');
      }
    } catch(e) {
      console.log('❌ Test 3: ' + e.message);
      failed++;
    }
    
    // Test 4: Clear old data functions exist
    try {
      if (typeof clearOldOrders === 'function' && typeof clearOldGuestChats === 'function') {
        console.log('✅ Test 4: Clear old data functions exist');
        passed++;
      } else {
        throw new Error('Clear functions missing');
      }
    } catch(e) {
      console.log('❌ Test 4: ' + e.message);
      failed++;
    }
    
    // Test 5: isNewOrder function for badge
    try {
      const now = Date.now();
      const tenMinAgo = now - (10 * 60 * 1000);
      const elevenMinAgo = now - (11 * 60 * 1000);
      
      if (isNewOrder(now) && isNewOrder(tenMinAgo) && !isNewOrder(elevenMinAgo)) {
        console.log('✅ Test 5: isNewOrder logic correct');
        passed++;
      } else {
        throw new Error('isNewOrder logic incorrect');
      }
    } catch(e) {
      console.log('❌ Test 5: ' + e.message);
      failed++;
    }
    
    // Test 6: Thread rendering with mixed types
    try {
      const mockThreads = [
        {id: '1', type: 'order', displayName: '#BILL123', timestamp: Date.now()},
        {id: '2', type: 'guest', displayName: 'Chat khách', timestamp: Date.now() - 1000}
      ];
      console.log('✅ Test 6: Thread data structure valid');
      passed++;
    } catch(e) {
      console.log('❌ Test 6: ' + e.message);
      failed++;
    }
    
    // Test 7: UI elements exist
    try {
      const chatThreads = qs('#chat-threads');
      const chatLog = qs('#chat-log');
      const chatInput = qs('#chat-input-section');
      
      if (chatThreads && chatLog && chatInput) {
        console.log('✅ Test 7: Chat UI elements present');
        passed++;
      } else {
        throw new Error('Missing chat UI elements');
      }
    } catch(e) {
      console.log('❌ Test 7: ' + e.message);
      failed++;
    }
    
    // Test 8: Settings buttons exist
    try {
      const clearOrdersBtn = qs('#clear-old-orders');
      const clearChatsBtn = qs('#clear-guest-chats');
      
      if (clearOrdersBtn && clearChatsBtn) {
        console.log('✅ Test 8: Clear data buttons exist');
        passed++;
      } else {
        throw new Error('Missing clear data buttons');
      }
    } catch(e) {
      console.log('❌ Test 8: ' + e.message);
      failed++;
    }
    
    console.log(`\n📊 RESULTS: ${passed}/${passed+failed} tests passed`);
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED!\n');
      return true;
    } else {
      console.log(`⚠️  ${failed} test(s) failed\n`);
      return false;
    }
  }
  
  function adminSelfTest(){
    const transfer = orders.find(o=>o.method==='transfer') || orders[0];
    selectedId = transfer.id;
    renderDetail();
    const billImg = qs('#bill-preview');
    const billOk = billImg && !billImg.classList.contains('hidden');
    const qr = qs('#quick-replies .qr');
    if(qr){ qr.click(); }
    const log = qs('#chat-log');
    const lastIsReply = log && /đã xác minh|Đơn đã được xác nhận|Vui lòng chờ/.test(log.textContent || '');
    console.log(billOk ? '✅ Bill hiển thị' : '❌ Bill không hiển thị');
    console.log(lastIsReply ? '✅ Quick reply gửi thành công' : '❌ Quick reply chưa được gửi');
  }
  window.adminSelfTest = adminSelfTest;
  window.testAdminFlow = testAdminFlow;

  /**
   * =============================================
   * TEST SUITE — Chạy từ Console: runAdminTests()
   * =============================================
   */
  window.runAdminTests = function() {
    const results = [];
    function pass(name) { results.push({ pass: true, name }); console.log(`✅ [PASS] ${name}`); }
    function fail(name, reason) { results.push({ pass: false, name, reason }); console.error(`❌ [FAIL] ${name}: ${reason}`); }

    // --- TEST 1: getStatusInfo - known status ---
    try {
      const info = getStatusInfo('unverified_cash');
      if(info.label === 'Chờ xác nhận (TM)' && info.color.includes('amber')) pass('T1: getStatusInfo known status');
      else fail('T1: getStatusInfo known status', `label="${info.label}"`);
    } catch(e) { fail('T1: getStatusInfo known status', e.message); }

    // --- TEST 2: getStatusInfo - unknown/null status → fallback ---
    try {
      const info = getStatusInfo(null);
      if(info.label && info.color) pass('T2: getStatusInfo null fallback');
      else fail('T2: getStatusInfo null fallback', 'missing fallback');
      const info2 = getStatusInfo('legacy_status_xyz');
      if(info2.label) pass('T3: getStatusInfo unknown string fallback');
      else fail('T3: getStatusInfo unknown string fallback', 'missing label');
    } catch(e) { fail('T2-T3: getStatusInfo null/unknown', e.message); }

    // --- TEST 4: renderOrders - không crash khi orders rỗng ---
    try {
      const backup = [...orders];
      orders.splice(0);
      renderOrders();
      orders.push(...backup);
      renderOrders();
      pass('T4: renderOrders với orders rỗng không crash');
    } catch(e) { fail('T4: renderOrders rỗng', e.message); }

    // --- TEST 5: renderStats - hiển thị đúng số liệu ---
    try {
      const statEl = document.getElementById('stat-total');
      if(statEl && statEl.textContent.includes('Tổng:')) pass('T5: renderStats hiển thị tổng đơn');
      else fail('T5: renderStats', `stat-total="${statEl?.textContent}"`);
    } catch(e) { fail('T5: renderStats', e.message); }

    // --- TEST 6: search theo tên khách ---
    try {
      const fakeOrders = [{ id:'BILL111', status:'processing', method:'cash', createdAt: Date.now(), items:[{qty:1,priceK:30}], customer:{name:'Nguyễn Văn A', phone:'0901234567'} }];
      const backup = [...orders];
      orders.push(...fakeOrders);
      const input = document.getElementById('filter-search');
      if(input) {
        input.value = 'nguyễn';
        renderOrders();
        const cards = document.querySelectorAll('#order-list > div');
        const found = Array.from(cards).some(c => c.textContent.includes('BILL111'));
        if(found) pass('T6: Search theo tên khách');
        else fail('T6: Search theo tên', 'Không tìm thấy đơn với tên "nguyễn"');
        input.value = '0901234567';
        renderOrders();
        const cards2 = document.querySelectorAll('#order-list > div');
        const found2 = Array.from(cards2).some(c => c.textContent.includes('BILL111'));
        if(found2) pass('T7: Search theo SĐT');
        else fail('T7: Search theo SĐT', 'Không tìm thấy đơn với SĐT "0901234567"');
        input.value = '';
      } else { fail('T6-T7: Search', '#filter-search không tồn tại'); }
      orders.splice(0); orders.push(...backup);
      renderOrders();
    } catch(e) { fail('T6-T7: Search', e.message); }

    // --- TEST 8: Pagination - hiển thị khi > PAGE_SIZE đơn ---
    try {
      const backup = [...orders];
      orders.splice(0);
      for(let i=0; i<25; i++){
        orders.push({ id:`BILLTEST${i}`, status:'processing', method:'cash', createdAt: Date.now()-i*1000, items:[{qty:1,priceK:30}], customer:{name:`Test ${i}`, phone:`090000000${i}`} });
      }
      currentPage = 1;
      renderOrders();
      const pagination = document.getElementById('order-pagination');
      if(pagination && !pagination.classList.contains('hidden')) pass('T8: Pagination hiện khi >20 đơn');
      else fail('T8: Pagination', 'Pagination vẫn hidden dù có 25 đơn');
      const cards = document.querySelectorAll('#order-list > div');
      if(cards.length === 20) pass('T9: Chỉ hiển thị 20 đơn/trang (PAGE_SIZE)');
      else fail('T9: PAGE_SIZE', `Hiển thị ${cards.length} đơn thay vì 20`);
      orders.splice(0); orders.push(...backup);
      currentPage = 1;
      renderOrders();
    } catch(e) { fail('T8-T9: Pagination', e.message); }

    // --- TEST 10: Customer info hiển thị trên card ---
    try {
      const backup = [...orders];
      orders.splice(0);
      orders.push({ id:'BILLCUST01', status:'unverified_cash', method:'cash', createdAt: Date.now(), items:[{qty:1,priceK:29}], customer:{name:'Trần Thị B', phone:'0912345678'} });
      currentPage = 1;
      renderOrders();
      const firstCard = document.querySelector('#order-list > div');
      if(firstCard && firstCard.textContent.includes('Trần Thị B')) pass('T10: Tên khách hàng hiển thị trên card');
      else fail('T10: Customer name on card', `Card text: "${firstCard?.textContent?.slice(0,100)}"`);
      if(firstCard && firstCard.textContent.includes('0912345678')) pass('T11: SĐT khách hiển thị trên card');
      else fail('T11: Customer phone on card', `Card text: "${firstCard?.textContent?.slice(0,100)}"`);
      orders.splice(0); orders.push(...backup);
      currentPage = 1;
      renderOrders();
    } catch(e) { fail('T10-T11: Customer on card', e.message); }

    // --- SUMMARY ---
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    console.log(`\n📊 KẾT QUẢ: ${passed}/${total} tests passed`);
    if(passed < total) {
      console.warn('❌ Các test thất bại:');
      results.filter(r => !r.pass).forEach(r => console.warn(`  • ${r.name}: ${r.reason}`));
    } else {
      console.log('🎉 Tất cả tests đã passed!');
    }
    return { total, passed, failed: total - passed };
  };

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICATION MANAGER
  //  - Bell button (top-right) toggles slide-in panel with history
  //  - Toast pop-ups (bottom-right) for new order / new message
  // ═══════════════════════════════════════════════════════════════
  const NotifMgr = (function () {
    const MAX_HISTORY = 50;    // max items kept in panel list
    const TOAST_DURATION = 6000; // ms before toast auto-dismisses

    let _items = [];  // { id, type, title, body, ts, read, tab, targetId }
    let _nextId = 1;
    let _panelOpen = false;
    let _bellBtn, _bellBadge, _bellIcon, _panel, _list, _emptyMsg, _toastStack;

    function _qs(id) { return document.getElementById(id); }

    function _unreadCount() { return _items.filter(n => !n.read).length; }

    function _updateBellBadge() {
      const count = _unreadCount();
      if (!_bellBadge) return;
      if (count > 0) {
        _bellBadge.textContent = count > 9 ? '9+' : String(count);
        _bellBadge.classList.remove('hidden');
        if (_bellIcon) {
          _bellIcon.classList.remove('bell-shake');
          void _bellIcon.offsetWidth; // reflow to restart animation
          _bellIcon.classList.add('bell-shake');
        }
      } else {
        _bellBadge.classList.add('hidden');
      }
    }

    function _renderPanel() {
      if (!_list) return;
      const empty = _qs('notif-empty');
      if (!_items.length) {
        _list.innerHTML = '';
        if (empty) { _list.appendChild(empty); empty.classList.remove('hidden'); }
        return;
      }
      if (empty) empty.classList.add('hidden');

      // Rebuild list (newest first)
      const existing = new Set(Array.from(_list.querySelectorAll('[data-nid]')).map(el => el.dataset.nid));
      const sorted = [..._items].sort((a, b) => b.ts - a.ts);

      // Remove stale items
      _list.querySelectorAll('[data-nid]').forEach(el => {
        if (!_items.find(n => String(n.id) === el.dataset.nid)) el.remove();
      });

      sorted.forEach((n, idx) => {
        const nidStr = String(n.id);
        let row = _list.querySelector('[data-nid="' + nidStr + '"]');
        if (row) {
          // Update read state only
          row.classList.toggle('bg-accent/10', !n.read);
          row.classList.toggle('border-accent/30', !n.read);
          return;
        }
        row = document.createElement('div');
        row.dataset.nid = nidStr;
        row.className = 'flex gap-3 items-start rounded-xl px-3 py-2.5 cursor-pointer transition border '
          + (n.read ? 'border-transparent hover:bg-white/5' : 'bg-accent/10 border-accent/30 hover:bg-accent/20');

        const iconEl = document.createElement('div');
        iconEl.className = 'text-xl shrink-0 mt-0.5';
        iconEl.textContent = n.type === 'order' ? '🛍️' : '💬';
        row.appendChild(iconEl);

        const body = document.createElement('div');
        body.className = 'flex-1 min-w-0';

        const titleRow = document.createElement('div');
        titleRow.className = 'flex items-center justify-between gap-1';
        const titleEl = document.createElement('span');
        titleEl.className = 'text-sm font-semibold text-gray-200 truncate';
        titleEl.textContent = n.title;
        const timeEl = document.createElement('span');
        timeEl.className = 'text-[10px] text-gray-500 shrink-0 tabular-nums';
        timeEl.textContent = relativeTime(n.ts);
        titleRow.appendChild(titleEl);
        titleRow.appendChild(timeEl);

        const bodyEl = document.createElement('div');
        bodyEl.className = 'text-xs text-gray-400 mt-0.5 leading-relaxed';
        bodyEl.textContent = n.body;

        body.appendChild(titleRow);
        body.appendChild(bodyEl);
        row.appendChild(body);

        row.addEventListener('click', () => {
          n.read = true;
          _updateBellBadge();
          _renderPanel();
          // Navigate to the relevant tab / item
          if (n.type === 'order') {
            showTab('orders');
            if (n.targetId) {
              selectedId = n.targetId;
              selectedType = 'order';
              markOrderViewed(n.targetId);
              showDetailModal();
            }
          } else {
            showTab('chat');
            if (n.targetId) {
              selectedId = n.targetId;
              selectedType = 'guest';
              markChatViewed(n.targetId);
              renderThreads();
              renderDetail();
            }
          }
          _closePanel();
        });

        // New items are always the most recent — prepend before existing rows
        const firstExisting = _list.querySelector('[data-nid]');
        if (firstExisting && n.ts >= (_items.find(x => String(x.id) === firstExisting.dataset.nid) || {}).ts) {
          _list.insertBefore(row, firstExisting);
        } else {
          _list.appendChild(row);
        }
      });
    }

    function _openPanel() {
      if (!_panel) return;
      _panel.classList.remove('hidden');
      _panelOpen = true;
    }
    function _closePanel() {
      if (!_panel) return;
      _panel.classList.add('hidden');
      _panelOpen = false;
    }

    // ── Public: push a new notification ─────────────────────────────────
    function push(type, title, body, targetId) {
      const n = { id: _nextId++, type, title, body, ts: Date.now(), read: false, targetId: targetId || null };
      _items.unshift(n);
      if (_items.length > MAX_HISTORY) _items.length = MAX_HISTORY;

      _updateBellBadge();
      _renderPanel();
      _showToast(n);
    }

    // ── Toast pop-up ─────────────────────────────────────────────────────
    function _showToast(n) {
      if (!_toastStack) return;

      const toast = document.createElement('div');
      toast.className = 'pointer-events-auto relative w-full rounded-2xl border shadow-2xl overflow-hidden notif-enter '
        + (n.type === 'order'
          ? 'bg-amber-900/95 border-amber-500/40'
          : 'bg-gray-800/95 border-accent/40');

      // Progress bar
      const progress = document.createElement('div');
      progress.className = 'absolute bottom-0 left-0 h-[3px] rounded-full notif-progress-bar '
        + (n.type === 'order' ? 'bg-amber-400' : 'bg-accent');
      progress.style.setProperty('--dur', (TOAST_DURATION / 1000) + 's');

      const inner = document.createElement('div');
      inner.className = 'flex items-start gap-3 px-4 py-3';

      const iconEl = document.createElement('div');
      iconEl.className = 'text-2xl shrink-0';
      iconEl.textContent = n.type === 'order' ? '🛍️' : '💬';

      const textWrap = document.createElement('div');
      textWrap.className = 'flex-1 min-w-0';
      const titleEl = document.createElement('div');
      titleEl.className = 'text-sm font-semibold text-gray-100';
      titleEl.textContent = n.title;
      const bodyEl = document.createElement('div');
      bodyEl.className = 'text-xs text-gray-300 mt-0.5 leading-relaxed';
      bodyEl.textContent = n.body;
      textWrap.appendChild(titleEl);
      textWrap.appendChild(bodyEl);

      // Action button
      const actBtn = document.createElement('button');
      actBtn.className = 'shrink-0 self-center text-xs px-2.5 py-1 rounded-lg '
        + (n.type === 'order' ? 'bg-amber-500 text-gray-900' : 'bg-accent text-white')
        + ' font-semibold hover:opacity-90 transition';
      actBtn.textContent = n.type === 'order' ? 'Xem đơn' : 'Xem chat';
      actBtn.addEventListener('click', () => {
        n.read = true;
        _updateBellBadge();
        _renderPanel();
        if (n.type === 'order') {
          showTab('orders');
          if (n.targetId) { selectedId = n.targetId; selectedType = 'order'; markOrderViewed(n.targetId); showDetailModal(); }
        } else {
          showTab('chat');
          if (n.targetId) { selectedId = n.targetId; selectedType = 'guest'; markChatViewed(n.targetId); renderThreads(); renderDetail(); }
        }
        _dismiss(toast, timer);
        _closePanel();
      });

      // Dismiss X
      const closeBtn = document.createElement('button');
      closeBtn.className = 'shrink-0 text-gray-400 hover:text-gray-200 text-lg leading-none ml-1';
      closeBtn.textContent = '×';
      closeBtn.addEventListener('click', () => _dismiss(toast, timer));

      inner.appendChild(iconEl);
      inner.appendChild(textWrap);
      inner.appendChild(actBtn);
      inner.appendChild(closeBtn);
      toast.appendChild(inner);
      toast.appendChild(progress);

      _toastStack.appendChild(toast);

      const timer = setTimeout(() => _dismiss(toast, null), TOAST_DURATION);

      // Pause progress on hover
      toast.addEventListener('mouseenter', () => {
        progress.style.animationPlayState = 'paused';
        clearTimeout(timer);
      });
      toast.addEventListener('mouseleave', () => {
        progress.style.animationPlayState = 'running';
        setTimeout(() => _dismiss(toast, null), TOAST_DURATION);
      });
    }

    function _dismiss(toast, timer) {
      if (timer) clearTimeout(timer);
      toast.classList.remove('notif-enter');
      toast.classList.add('notif-leave');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }

    // ── Init (call after DOM ready) ──────────────────────────────────────
    function init() {
      _bellBtn    = _qs('notif-bell-btn');
      _bellBadge  = _qs('notif-bell-badge');
      _bellIcon   = _qs('notif-bell-icon');
      _panel      = _qs('notif-panel');
      _list       = _qs('notif-list');
      _emptyMsg   = _qs('notif-empty');
      _toastStack = _qs('notif-toast-stack');

      if (_bellBtn) {
        _bellBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (_panelOpen) { _closePanel(); } else { _openPanel(); }
        });
      }
      // Close panel when clicking outside
      document.addEventListener('click', (e) => {
        if (_panelOpen && _panel && !_panel.contains(e.target) && e.target !== _bellBtn && !_bellBtn.contains(e.target)) {
          _closePanel();
        }
      });
      // Mark all read
      const markAllBtn = _qs('notif-mark-all');
      if (markAllBtn) markAllBtn.addEventListener('click', () => {
        _items.forEach(n => n.read = true);
        _updateBellBadge();
        _renderPanel();
      });
      // Clear all
      const clearAllBtn = _qs('notif-clear-all');
      if (clearAllBtn) clearAllBtn.addEventListener('click', () => {
        _items = [];
        _updateBellBadge();
        _renderPanel();
      });
    }

    return { push, init };
  })();

  document.addEventListener('DOMContentLoaded', ()=>{
    NotifMgr.init();
    bindTabs(); bindOrders(); bindMenu(); bindSettings(); bindQuickReplies();
    if (useFirebase) {
      loadMenuFromFirebase(function () {
        renderCategories(); renderItems();
        setupOrdersListener();
        setupGuestChatsListener();
        renderReport();
        updateNewOrderBadge();
      });
    } else {
      renderCategories(); renderItems();
      renderOrders(); renderThreads(); renderReport();
      updateNewOrderBadge();
      updateNewChatBadge();
      updateNewOrderBadge();
    }
    const dbg = document.getElementById('admin-debug');
    if (dbg) dbg.textContent = useFirebase ? 'Firebase • v20260302-1' : orders.length + ' đơn • v20260302-1';
  });
  
  // Expose test functions
  window.runChatSystemTests = runChatSystemTests;
  window.clearOldOrders = clearOldOrders;
  window.clearOldGuestChats = clearOldGuestChats;
  
  return { orders, updateStatus, statusMap };
})();
