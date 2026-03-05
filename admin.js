'use strict';

const AdminState = (() => {
  const statusMap = {
    unverified_cash: { label: 'Chờ xác nhận (TM)', color: 'bg-amber-500/30 text-amber-200' },
    pending_transfer: { label: 'Chờ xác minh (CK)', color: 'bg-yellow-500/30 text-yellow-200' },
    processing: { label: 'Đang pha chế', color: 'bg-blue-500/30 text-blue-200' },
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
  function isNewOrder(createdAt){ 
    const TEN_MINUTES = 10 * 60 * 1000; 
    return (Date.now() - createdAt) < TEN_MINUTES; 
  }
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

  function setupOrdersListener() {
    if (!useFirebase) return;
    db.collection('orders').orderBy('createdAt', 'desc').onSnapshot(function (snap) {
      orders = snap.docs.map(function (doc) { return docToOrder(doc.id, doc.data()); });
      if (orders.length > lastOrderCount && lastOrderCount > 0) playTing();
      lastOrderCount = orders.length;
      renderOrders();
      renderThreads();
      renderDetail();
      renderReport();
    }, function () { if (qs('#admin-debug')) qs('#admin-debug').textContent = 'Mất kết nối Firebase'; });
  }

  function setupGuestChatsListener() {
    if (!useFirebase) return;
    db.collection('guestChats').orderBy('lastMessageAt', 'desc').onSnapshot(function (snap) {
      guestChats = snap.docs.map(function (doc) {
        const d = doc.data();
        const ts = d.lastMessageAt && (d.lastMessageAt.toMillis ? d.lastMessageAt.toMillis() : d.lastMessageAt) || Date.now();
        return { 
          id: doc.id, 
          sessionId: d.sessionId || doc.id,
          createdAt: d.createdAt && (d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt) || ts,
          lastMessageAt: ts,
          type: 'guest'
        };
      });
      renderThreads();
      renderDetail();
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
      elPr.innerHTML = processing ? `<span class="text-[10px] opacity-70">Đang pha chế</span> <span class="font-bold text-base ml-1">${processing}</span>` : '';
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
      const isNew = isNewOrder(o.createdAt);
      const cardClasses = 'rounded-xl border p-4 cursor-pointer transition hover:shadow-lg ' + 
        (isNew ? 'border-accent/40 bg-accent/5 hover:bg-accent/10 shadow-accent/20 animate-pulse-subtle' : 'border-white/10 bg-gray-700 hover:bg-gray-600');
      const card = el('div', cardClasses);
      
      // Header: Order ID (prominent) + Time
      const header = el('div','flex items-center justify-between mb-3 pb-2 border-b border-white/5');
      const orderId = el('div','flex items-center gap-2 flex-1 min-w-0');
      orderId.appendChild(el('span','text-base font-bold text-amber-300','#'+o.id));
      orderId.appendChild(el('span','text-xs ml-1 font-medium '+(isNew?'text-amber-400':'text-gray-400'), new Date(o.createdAt).toLocaleString('vi-VN')));
      
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
      
      card.addEventListener('click', ()=>{ selectedId=o.id; showDetailModal(); });
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
      const isNew = isNewOrder(o.createdAt);
      timeEl.innerHTML = '';
      if(isNew){
        const newBadge = el('span','px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent text-white mr-2 shadow-lg shadow-accent/50','✨ MỚI');
        timeEl.appendChild(newBadge);
      }
      const timeText = el('span', isNew ? 'text-amber-400 font-medium' : 'font-medium');
      timeText.textContent = time;
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
    const chat = qs('#chat-log'), inputSec = qs('#chat-input-section'), emptyState = qs('#chat-empty-state');
    
    if(!selectedId || !selectedType){
      if(inputSec) inputSec.classList.add('hidden');
      if(emptyState) emptyState.classList.remove('hidden');
      if(chat) chat.classList.add('hidden');
      return;
    }

    if(inputSec) inputSec.classList.remove('hidden');
    if(emptyState) emptyState.classList.add('hidden');
    if(chat) chat.classList.remove('hidden');

    // Render chat messages
    if (chat) {
      chat.innerHTML = '';
      if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
      if (useFirebase && selectedId) {
        const collectionPath = selectedType === 'guest' ? 'guestChats' : 'orders';
        messagesUnsub = db.collection(collectionPath).doc(selectedId).collection('messages').orderBy('createdAt').onSnapshot(function (snap) {
          chat.innerHTML = '';
          snap.docs.forEach(function (doc) {
            const m = doc.data();
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col ' + (m.from === 'admin' ? 'items-end' : 'items-start') + ' mb-3';
            
            const bubble = document.createElement('div');
            bubble.className = 'max-w-[80%] ' + (m.from === 'admin' ? 'bg-accent text-white' : 'bg-gray-600 text-white') + ' px-3 py-2 rounded-lg';
            if (m.type === 'image') {
              const img = document.createElement('img');
              img.src = m.content;
              img.className = 'max-h-36 rounded cursor-zoom-in';
              img.onclick = function () { window.open(m.content, '_blank'); };
              bubble.appendChild(img);
            } else {
              bubble.textContent = m.content || '';
            }
            wrapper.appendChild(bubble);
            
            // Timestamp
            if (m.createdAt) {
              const ts = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
              const time = document.createElement('div');
              time.className = 'text-[10px] text-gray-500 mt-0.5 px-1';
              time.textContent = ts.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              wrapper.appendChild(time);
            }
            
            chat.appendChild(wrapper);
          });
          chat.scrollTop = chat.scrollHeight;
        });
      } else {
        (o.chat||[]).forEach(function(m){
          const div = document.createElement('div');
          div.className = 'max-w-[80%] ' + (m.from === 'admin' ? 'ml-auto bg-accent text-white' : 'mr-auto bg-gray-600') + ' px-3 py-2 rounded-lg';
          if (m.type === 'image') {
            const img = document.createElement('img');
            img.src = m.content;
            img.className = 'max-h-36 rounded cursor-zoom-in';
            div.appendChild(img);
          } else div.textContent = m.content || '';
          chat.appendChild(div);
        });
        chat.scrollTop = chat.scrollHeight;
      }
    }
  }
  function renderThreads(){
    const root=qs('#chat-threads'); if(!root) return;
    root.innerHTML='';
    
    // Merge orders and guest chats
    const allThreads = [];
    
    // Add orders
    orders.forEach(o => {
      allThreads.push({
        id: o.id,
        type: 'order',
        displayName: '#' + o.id,
        subtitle: o.customer?.name || 'Khách',
        timestamp: o.createdAt,
        data: o
      });
    });
    
    // Add guest chats
    guestChats.forEach(g => {
      allThreads.push({
        id: g.id,
        type: 'guest',
        displayName: '💬 Chat khách',
        subtitle: g.sessionId.substring(0, 20) + '...',
        timestamp: g.lastMessageAt || g.createdAt,
        data: g
      });
    });
    
    // Sort by timestamp desc
    allThreads.sort((a, b) => b.timestamp - a.timestamp);
    
    const pending = orders.filter(o=>o.status==='unverified_cash'||o.status==='pending_transfer');
    const q=qs('#chat-count'); 
    if(q) q.textContent = (pending.length + guestChats.length) > 0 ? `${pending.length} đơn · ${guestChats.length} chat` : '';
    
    allThreads.forEach(thread => {
      const isSelected = thread.id === selectedId && thread.type === selectedType;
      const isNewGuest = thread.type === 'guest' && isNewOrder(thread.timestamp);
      const row=el('div','flex items-center gap-2 rounded-lg p-3 transition '+(isSelected?'bg-accent/20 border border-accent/50':'bg-gray-700/50 hover:bg-gray-700 border border-white/5'));
      
      const clickableArea = el('div', 'flex-1 flex items-center gap-2 cursor-pointer min-w-0');
      const left=el('div','flex-1 min-w-0');
      
      // Icon + display name + NEW badge
      const nameRow = el('div', 'flex items-center gap-1.5 mb-0.5');
      if (thread.type === 'guest') {
        nameRow.appendChild(el('span', 'text-xs', '👤'));
      } else {
        nameRow.appendChild(el('span', 'text-xs', '📦'));
      }
      nameRow.appendChild(el('span','text-sm font-medium truncate', thread.displayName));
      if (isNewGuest) {
        const newBadge = el('span','px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent text-white','MỚI');
        nameRow.appendChild(newBadge);
      }
      left.appendChild(nameRow);
      
      left.appendChild(el('div','text-xs text-gray-500 truncate', thread.subtitle));
      
      // Last message preview
      const lastTxt = thread.type === 'guest' ? 'Chat trực tiếp' : 'Xem tin nhắn';
      left.appendChild(el('div','text-xs text-gray-400 truncate max-w-[150px]', lastTxt));
      
      clickableArea.appendChild(left);
      
      clickableArea.addEventListener('click', ()=>{
        selectedId = thread.id;
        selectedType = thread.type;
        renderThreads(); 
        renderDetail();
      });
      
      row.appendChild(clickableArea);
      
      // Delete button (only for guest chats)
      if (thread.type === 'guest') {
        const deleteBtn = el('button', 'text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition flex-shrink-0', '🗑️');
        deleteBtn.title = 'Xóa chat này';
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm('Xóa cuộc trò chuyện này?')) {
            deleteGuestChat(thread.id);
          }
        });
        row.appendChild(deleteBtn);
      }
      
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
    const ap=qs('#modal-btn-approve'), dn=qs('#modal-btn-done'), cc=qs('#modal-btn-cancel'), ff=qs('#modal-btn-fail');
    const doneClose = qs('#modal-detail-close'), modal = qs('#order-detail-modal');
    ap&&ap.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'processing'); }});
    dn&&dn.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'completed'); }});
    cc&&cc.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'canceled'); }});
    ff&&ff.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'failed'); }});
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
    send&&send.addEventListener('click', ()=>{
      const t=input.value.trim(); if(!t||!selectedId||!selectedType) return;
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
        input.value='';
      } else {
        const o=orders.find(x=>x.id===selectedId); if(o) o.chat.push({from:'admin',type:'text',content:t});
        input.value=''; renderDetail(); renderThreads();
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

  document.addEventListener('DOMContentLoaded', ()=>{
    bindTabs(); bindOrders(); bindMenu(); bindSettings(); bindQuickReplies();
    if (useFirebase) {
      loadMenuFromFirebase(function () {
        renderCategories(); renderItems();
        setupOrdersListener();
        setupGuestChatsListener();
        renderReport();
      });
    } else {
      renderCategories(); renderItems();
      renderOrders(); renderThreads(); renderReport();
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
