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
  let audioEnabled = false;
  let selectedId = null;
  let orders = [];
  let lastOrderCount = 0;
  let messagesUnsub = null;
  let menuData = getMenuForAdmin();
  let categories = menuData.categories;
  let items = menuData.items;
  const db = typeof window !== 'undefined' ? (window.bbDb || null) : null;
  const useFirebase = !!db;
  function persistMenu(){ saveMenu(categories, items); if(useFirebase) persistMenuToFirebase(); }
  function vndK(k){ return (k*1000).toLocaleString('vi-VN')+' đ'; }
  function totalK(order){ return order.items.reduce((s,i)=>s+i.qty*i.priceK,0); }
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

  function renderOrders(){
    const root = qs('#order-list'); if(!root) return;
    root.innerHTML = '';
    const fs = qs('#filter-status')?.value || '';
    const fm = qs('#filter-method')?.value || '';
    const fd = qs('#filter-date')?.value || 'all';
    const q = (qs('#filter-search')?.value||'').trim().toLowerCase();
    orders
      .filter(o => (!fs || o.status===fs) && (!fm || o.method===fm) && isInDateRange(o.createdAt, fd) && (!q || String(o.id).toLowerCase().includes(q)))
      .sort((a,b)=>b.createdAt-a.createdAt)
      .forEach(o=>{
        const card = el('div','rounded-xl border border-white/10 bg-gray-700 hover:bg-gray-600 p-3 cursor-pointer transition');
        const top = el('div','flex items-center justify-between');
        const left = el('div','');
        left.appendChild(el('div','font-semibold text-gray-100','#'+o.id));
        left.appendChild(el('div','text-xs text-gray-400', new Date(o.createdAt).toLocaleString('vi-VN')));
        const right = el('div','flex items-center gap-2');
        const methodBadge = el('span','px-2 py-1 rounded text-[10px] '+(o.method==='cash'?'bg-amber-500/30 text-amber-200':'bg-yellow-500/30 text-yellow-200'), o.method==='cash'?'TM':'CK');
        const st = el('span','px-2 py-1 rounded text-xs '+statusMap[o.status].color, statusMap[o.status].label);
        right.appendChild(el('div','text-sm text-gray-300', vndK(totalK(o))));
        right.appendChild(methodBadge); right.appendChild(st);
        top.appendChild(left); top.appendChild(right);
        card.appendChild(top);
        card.addEventListener('click', ()=>{ selectedId=o.id; renderDetail(); showTab('chat'); });
        root.appendChild(card);
      });
  }
  function renderDetail(){
    const o = orders.find(x=>x.id===selectedId);
    const title = qs('#detail-title'), body = qs('#detail-items'), chat = qs('#chat-log');
    const orderInfo = qs('#chat-order-info'), emptyHint = qs('#chat-empty');
    const custEl = qs('#detail-customer'), totalEl = qs('#detail-total');
    if(!o){
      if(orderInfo) orderInfo.classList.add('hidden');
      if(emptyHint) emptyHint.classList.remove('hidden');
      if(title) title.textContent='Chọn đơn để xem chi tiết';
      if(body) body.innerHTML='';
      if(chat) chat.innerHTML='';
      const billImg=qs('#bill-preview'); if(billImg) billImg.classList.add('hidden');
      return;
    }
    if(orderInfo) orderInfo.classList.remove('hidden');
    if(emptyHint) emptyHint.classList.add('hidden');
    if(title) title.textContent = 'Đơn #'+o.id + ' · ' + (o.method==='transfer'?'Chuyển khoản':'Tiền mặt') + ' · ' + statusMap[o.status].label;
    if(custEl){
      const c = o.customer || {};
      const parts = [c.name||'', c.phone||'', c.address||''].filter(Boolean);
      const loc = [c.city, c.district, c.ward].filter(Boolean).join(' · ');
      if(loc) parts.push(loc);
      custEl.textContent = parts.join(' · ') || 'Chưa có thông tin';
    }
    if(totalEl) totalEl.textContent = vndK(totalK(o));
    if(body){
      body.innerHTML = o.items.map(i=>`
        <div class="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2 border border-white/10 text-sm">
          <div><span class="font-medium">${i.name}</span> <span class="text-gray-500">x${i.qty} · ${vndK(i.priceK)}</span></div>
          <div>${vndK(i.qty*i.priceK)}</div>
        </div>
      `).join('');
      if(o.note) body.innerHTML += '<div class="text-xs text-gray-500 mt-1">Ghi chú: '+o.note+'</div>';
    }
    if (chat) {
      chat.innerHTML = '';
      if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
      if (useFirebase && selectedId) {
        messagesUnsub = db.collection('orders').doc(selectedId).collection('messages').orderBy('createdAt').onSnapshot(function (snap) {
          chat.innerHTML = '';
          snap.docs.forEach(function (doc) {
            const m = doc.data();
            const div = document.createElement('div');
            div.className = 'max-w-[80%] ' + (m.from === 'admin' ? 'ml-auto bg-accent text-white' : 'mr-auto bg-gray-600') + ' px-3 py-2 rounded-lg';
            if (m.type === 'image') {
              const img = document.createElement('img');
              img.src = m.content;
              img.className = 'max-h-36 rounded cursor-zoom-in';
              img.onclick = function () { window.open(m.content, '_blank'); };
              div.appendChild(img);
            } else {
              div.textContent = m.content || '';
            }
            chat.appendChild(div);
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
    const billImg = qs('#bill-preview');
    if (billImg) {
      if (o.billUrl) { billImg.src = o.billUrl; billImg.classList.remove('hidden'); }
      else {
        const bill = (o.chat||[]).filter(function(m){ return m.type==='image' && m.from!=='admin'; }).slice(-1)[0];
        if (bill) { billImg.src = bill.content; billImg.classList.remove('hidden'); }
        else billImg.classList.add('hidden');
      }
    }
    const canApprove = o.status==='unverified_cash' || o.status==='pending_transfer';
    const canComplete = o.status==='processing';
    const ap=qs('#btn-approve'), dn=qs('#btn-done');
    if(ap){ ap.disabled=!canApprove; ap.classList.toggle('opacity-50 cursor-not-allowed',!canApprove); }
    if(dn){ dn.disabled=!canComplete; dn.classList.toggle('opacity-50 cursor-not-allowed',!canComplete); }
  }
  function renderThreads(){
    const root=qs('#chat-threads'); if(!root) return;
    root.innerHTML='';
    const pending = orders.filter(o=>o.status==='unverified_cash'||o.status==='pending_transfer');
    const q=qs('#chat-count'); if(q) q.textContent = pending.length ? pending.length+' đơn chờ' : '';
    orders
      .sort((a,b)=>b.createdAt-a.createdAt)
      .forEach(o=>{
        const unread = !useFirebase && o.chat && o.chat.some(function(m){ return m.from==='customer' && !m.read; });
        const isSelected = o.id===selectedId;
        const row=el('div','flex items-center justify-between rounded-lg p-3 cursor-pointer transition '+(isSelected?'bg-accent/20 border border-accent/50':'bg-gray-700/50 hover:bg-gray-700 border border-white/5'));
        const left=el('div','');
        left.appendChild(el('div','text-sm font-medium','#'+o.id));
        const c=o.customer;
        left.appendChild(el('div','text-xs text-gray-500', c?.name||''));
        const last = (o.chat||[]).slice(-1)[0];
        const lastTxt = useFirebase ? 'Nhắn tin' : (last ? (last.type==='text'? last.content.slice(0,30)+'...' : 'Ảnh biên lai') : 'Chưa có tin nhắn');
        left.appendChild(el('div','text-xs text-gray-400 truncate max-w-[180px]', lastTxt));
        const dot = el('span','w-2 h-2 rounded-full shrink-0 '+(unread?'bg-accent animate-pulse':'bg-transparent'),'');
        row.appendChild(left); row.appendChild(dot);
        row.addEventListener('click', ()=>{
          selectedId=o.id;
          if (!useFirebase && o.chat) o.chat.forEach(function(m){ m.read=true; });
          renderThreads(); renderDetail();
        });
        root.appendChild(row);
      });
  }
  function updateStatus(id, status){
    const o = orders.find(x=>x.id===id); if(!o) return;
    if (useFirebase) {
      db.collection('orders').doc(id).update({ status: status }).then(function () {
        o.status = status;
        renderDetail();
      }).catch(function () { alert('Cập nhật trạng thái thất bại.'); });
    } else {
      o.status = status;
      renderOrders();
      renderDetail();
    }
  }
  function exportDay(){
    const rows=[]; orders.forEach(o=>{
      const time = new Date(o.createdAt).toLocaleString('vi-VN');
      const status = statusMap[o.status].label;
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
    ['#filter-status','#filter-method','#filter-search','#filter-date'].forEach(s=>{ const e=qs(s); e&&e.addEventListener('input', renderOrders); e&&e.addEventListener('change', renderOrders); });
    const ap=qs('#btn-approve'), dn=qs('#btn-done'), cc=qs('#btn-cancel'), ff=qs('#btn-fail');
    ap&&ap.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'processing'); }});
    dn&&dn.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'completed'); }});
    cc&&cc.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'canceled'); }});
    ff&&ff.addEventListener('click', ()=>{ if(selectedId){ updateStatus(selectedId,'failed'); }});
    const send=qs('#chat-send'), up=qs('#chat-upload'), input=qs('#chat-input');
    send&&send.addEventListener('click', ()=>{
      const t=input.value.trim(); if(!t||!selectedId) return;
      if (useFirebase) {
        db.collection('orders').doc(selectedId).collection('messages').add({ from:'admin', type:'text', content:t, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function(){ alert('Gửi thất bại.'); });
        input.value='';
      } else {
        const o=orders.find(x=>x.id===selectedId); if(o) o.chat.push({from:'admin',type:'text',content:t});
        input.value=''; renderDetail(); renderThreads();
      }
    });
    up&&up.addEventListener('change', (e)=>{
      const f=e.target.files&&e.target.files[0]; if(!f||!selectedId) return;
      const r=new FileReader();
      r.onload=function(){
        if (useFirebase) {
          db.collection('orders').doc(selectedId).collection('messages').add({ from:'admin', type:'image', content:r.result, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function(){ alert('Gửi ảnh thất bại.'); });
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
      const b=e.target.closest('.qr'); if(!b||!selectedId) return;
      const txt = b.textContent;
      if (useFirebase) {
        db.collection('orders').doc(selectedId).collection('messages').add({ from:'admin', type:'text', content:txt, createdAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(function(){ alert('Gửi thất bại.'); });
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
          {type:'input',id:'it-img',value:it.img||'',placeholder:'Link ảnh'},
          {type:'select',id:'it-cat',value:it.cat,options:categories.map(c=>({value:c.id,label:c.name}))}
        ], ()=>{
          it.name=qs('#it-name').value.trim()||it.name;
          const p=Number(qs('#it-price').value); it.priceK=isNaN(p)?it.priceK:Math.round(p);
          it.desc=qs('#it-desc').value.trim(); it.img=qs('#it-img').value.trim(); it.cat=qs('#it-cat').value;
          persistMenu(); renderItems();
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
    });
    m.classList.remove('hidden');
    function done(){ m.classList.add('hidden'); ok.removeEventListener('click', handler); cc.removeEventListener('click', cancel); }
    function handler(){ onOk&&onOk(); done(); }
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
      {type:'input',id:'it-img',placeholder:'Link ảnh'},
      {type:'select',id:'it-cat',options:categories.map(c=>({value:c.id,label:c.name}))}
    ], ()=>{
      const name=qs('#it-name').value.trim(); const p=Number(qs('#it-price').value||'0'); const desc=qs('#it-desc').value.trim(); const img=qs('#it-img').value.trim(); const cat=qs('#it-cat').value;
      if(!name||isNaN(p)) return;
      items.push({id:'it-'+Date.now(), name, priceK:Math.round(p), desc, img, cat, visible:true});
      persistMenu(); renderItems();
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
    const data=JSON.parse(localStorage.getItem('bb_store')||'null')||{};
    n.value=data.name||''; h.value=data.hotline||'';
    s&&s.addEventListener('click', ()=>{ localStorage.setItem('bb_store', JSON.stringify({name:n.value.trim(),hotline:h.value.trim()})); });
  }
  function testAdminFlow(){
    if(!orders.length) return console.log('Không có đơn');
    selectedId = orders[0].id;
    updateStatus(selectedId,'completed');
    const updated = orders.find(o=>o.id===selectedId);
    const ok = updated && updated.status==='completed';
    console.log(ok?'✅ Duyệt đơn chuyển xanh':'❌ Không đạt');
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
  document.addEventListener('DOMContentLoaded', ()=>{
    bindTabs(); bindOrders(); bindMenu(); bindSettings(); bindQuickReplies();
    if (useFirebase) {
      loadMenuFromFirebase(function () {
        renderCategories(); renderItems();
        setupOrdersListener();
        renderReport();
      });
    } else {
      renderCategories(); renderItems();
      renderOrders(); renderDetail(); renderReport(); renderThreads();
    }
    const dbg = document.getElementById('admin-debug');
    if (dbg) dbg.textContent = useFirebase ? 'Firebase • v20260301-4' : orders.length + ' đơn • v20260301-4';
  });
  return { orders, updateStatus, statusMap };
})();
