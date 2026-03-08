'use strict';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1500336624523-d727130c3328?auto=format&fit=crop&w=800&q=60';

const state = { cart: {} };

function formatVND(k) { return (k * 1000).toLocaleString('vi-VN') + ' đ'; }

function setImgFallback(img) {
  img.addEventListener('error', () => {
    img.src = PLACEHOLDER_IMG;
    img.removeAttribute('srcset');
    img.onerror = null;
  }, { once: true });
}

function findItemById(id) {
  const categories = getMenuForCustomer();
  for (const c of categories) {
    const f = c.items.find(i => i.id === id);
    if (f) return f;
  }
  return null;
}

const menuRoot = document.getElementById('menu-root');

function renderMenu() {
  const categories = getMenuForCustomer();
  menuRoot.innerHTML = '';
  categories.forEach(cat => {
    const section = document.createElement('div');
    section.innerHTML = `
      <h3 class="font-serif italic text-lg mb-3">${cat.name}</h3>
      <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        ${cat.items.map(i => `
          <div class="flex flex-col rounded-2xl bg-white/90 shadow-soft border border-primary/10 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow menu-item" data-card="${i.id}">
            <div class="relative aspect-[4/3] overflow-hidden bg-cream/60">
              <img src="${i.img}" alt="${i.name}" class="w-full h-full object-cover" />
              ${i.tag ? `<span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white ${i.tag === 'Mới' ? 'bg-success' : 'bg-accent'}">${i.tag}</span>` : ''}
            </div>
            <div class="p-3 flex flex-col flex-1 gap-1.5">
              <div class="font-semibold text-sm leading-snug line-clamp-2 min-h-[2.5rem]">${i.name}</div>
              ${i.desc ? `<div class="text-[11px] text-primary/50 truncate">${i.desc}</div>` : '<div></div>'}
              <div class="text-sm font-semibold text-accent">${formatVND(i.priceK)}</div>
              <button data-id="${i.id}" class="add mt-auto w-full py-3 rounded-xl bg-primary text-cream text-sm font-semibold hover:shadow-lg active:scale-95 transition min-h-[44px]">+ Thêm</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    menuRoot.appendChild(section);
    section.querySelectorAll('img').forEach(setImgFallback);
  });
  menuRoot.querySelectorAll('button.add').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProduct(btn.getAttribute('data-id'));
    });
  });
  menuRoot.querySelectorAll('[data-card]').forEach(card => {
    card.addEventListener('click', (e) => {
      const b = card.querySelector('button.add');
      if (e.target === b) return;
      openProduct(card.getAttribute('data-card'));
    });
  });
}

let modalState = { id: null, qty: 1, opts: new Set(), note: '' };
const modalEl = document.getElementById('product-modal');
const modalSheet = modalEl.querySelector('div.absolute');
const modalName = document.getElementById('modal-name');
const modalPrice = document.getElementById('modal-price');
const modalImg = document.getElementById('modal-img');
const modalDesc = document.getElementById('modal-desc');
const qtyDec = document.getElementById('qty-dec');
const qtyInc = document.getElementById('qty-inc');
const qtyVal = document.getElementById('qty-val');
const modalNote = document.getElementById('modal-note');
const modalAdd = document.getElementById('modal-add');
const modalClose = document.getElementById('modal-close');

function lockScroll() { document.body.style.overflow = 'hidden'; }
function unlockScroll() { document.body.style.overflow = ''; }

function updateModalAddText(priceK) {
  const total = Math.max(0, modalState.qty) * priceK;
  modalAdd.textContent = total > 0 ? `Thêm vào giỏ hàng - ${formatVND(total)}` : 'Thêm vào giỏ hàng';
}

function openProduct(id) {
  const item = findItemById(id);
  if (!item) return;
  modalState = { id, qty: 1, opts: new Set(), note: '' };
  modalName.textContent = item.name;
  modalPrice.textContent = formatVND(item.priceK);
  modalImg.src = item.img;
  setImgFallback(modalImg);
  modalDesc.textContent = item.desc || '';
  qtyVal.textContent = '1';
  modalNote.value = '';
  updateModalAddText(item.priceK);
  lockScroll();
  const header = document.getElementById('main-header');
  // Only hide header on mobile (≤768px)
  if (header && window.innerWidth <= 768) header.classList.add('-translate-y-full');
  modalEl.classList.remove('pointer-events-none');
  // Use a small delay to ensure DOM is ready before animation
  setTimeout(() => {
    modalEl.classList.add('opacity-100');
    modalSheet.classList.remove('translate-y-full');
  }, 10);
}

function closeProduct() {
  const header = document.getElementById('main-header');
  // Only restore header on mobile (≤768px)
  if (header && window.innerWidth <= 768) header.classList.remove('-translate-y-full');
  modalEl.classList.remove('opacity-100');
  modalSheet.classList.add('translate-y-full');
  setTimeout(() => {
    modalEl.classList.add('pointer-events-none');
    unlockScroll();
    // Reset modal state
    modalState = { id: null, qty: 1, opts: new Set(), note: '' };
  }, 300);
}

modalEl.addEventListener('click', (e) => {
  if (e.target === modalEl) closeProduct();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modalEl.classList.contains('pointer-events-none')) {
    closeProduct();
  }
});

modalClose.addEventListener('click', closeProduct);

qtyInc.addEventListener('click', () => {
  const item = findItemById(modalState.id);
  modalState.qty += 1;
  qtyVal.textContent = String(modalState.qty);
  if (item) updateModalAddText(item.priceK);
});
qtyDec.addEventListener('click', () => {
  const item = findItemById(modalState.id);
  modalState.qty = Math.max(0, modalState.qty - 1);
  qtyVal.textContent = String(modalState.qty);
  if (item) updateModalAddText(item.priceK);
});

modalEl.querySelectorAll('.opt').forEach(btn => {
  btn.addEventListener('click', () => {
    const k = btn.dataset.opt;
    if (modalState.opts.has(k)) {
      modalState.opts.delete(k);
      btn.classList.remove('bg-primary', 'text-cream');
    } else {
      modalState.opts.add(k);
      btn.classList.add('bg-primary', 'text-cream');
    }
  });
});

modalAdd.addEventListener('click', () => {
  const item = findItemById(modalState.id);
  if (!item) return;
  if (!modalState.qty || modalState.qty <= 0) return;
  const optsArr = Array.from(modalState.opts).sort();
  const note = modalNote.value.trim();
  const key = `${item.id}|${optsArr.join(',')}|${note}`;
  if (!state.cart[key]) state.cart[key] = { ...item, qty: 0, options: optsArr, note };
  state.cart[key].qty += modalState.qty;
  closeProduct();
  syncCartUI();
});

const cartBar = document.getElementById('cart-bar');
const cartTotal = document.getElementById('cart-total');
const sheet = document.getElementById('sheet');
const sheetList = document.getElementById('sheet-list');
const sheetTotal = document.getElementById('sheet-total');
const orderNow = document.getElementById('order-now');
const closeSheet = document.getElementById('close-sheet');
const confirmOrder = document.getElementById('confirm-order');

function calcTotal() {
  return Object.values(state.cart).reduce((s, it) => s + it.priceK * it.qty, 0);
}

function syncCartUI() {
  const totalK = calcTotal();
  const totalItems = Object.values(state.cart).reduce((s, it) => s + it.qty, 0);
  const countEl = document.getElementById('cart-count');
  if (countEl) countEl.textContent = String(totalItems);
  const chatBtn = document.getElementById('chat-toggle');
  if (totalK > 0) {
    cartBar.classList.remove('hidden');
    cartTotal.textContent = formatVND(totalK);
  } else {
    cartBar.classList.add('hidden');
  }
}

function changeQty(key, delta) {
  const e = state.cart[key];
  if (!e) return;
  e.qty += delta;
  if (e.qty <= 0) delete state.cart[key];
  renderSheet();
  syncCartUI();
}

function renderSheet() {
  const entries = Object.entries(state.cart);
  const items = entries.map(([key, it]) => ({ key, ...it }));
  sheetList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'py-6 text-center text-sm text-primary/70';
    empty.textContent = 'Chưa có món nào';
    sheetList.appendChild(empty);
  } else {
    items.forEach(it => {
      const row = document.createElement('div');
      row.className = 'py-3 flex items-center justify-between';

      const left = document.createElement('div');
      left.className = 'flex items-center gap-3';
      const thumb = document.createElement('img');
      thumb.src = it.img || '';
      thumb.alt = '';
      thumb.className = 'w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-primary/10';
      setImgFallback(thumb);
      const textCol = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'font-medium';
      const nameText = it.options && it.options.length ? `${it.name} · ${it.options.join(', ')}` : it.name;
      name.textContent = nameText;

      const sub = document.createElement('div');
      sub.className = 'text-xs text-primary/70';
      sub.textContent = `${formatVND(it.priceK)} x ${it.qty}`;

      textCol.appendChild(name);
      textCol.appendChild(sub);

      if (it.note) {
        const note = document.createElement('div');
        note.className = 'text-xs text-primary/50';
        note.textContent = `Ghi chú: ${it.note}`;
        textCol.appendChild(note);
      }
      left.appendChild(thumb);
      left.appendChild(textCol);

      const right = document.createElement('div');
      right.className = 'flex items-center gap-2';

      const dec = document.createElement('button');
      dec.className = 'dec w-8 h-8 rounded-lg bg-primary/10 hover:shadow-lg active:scale-95 transition';
      dec.textContent = '-';
      dec.addEventListener('click', () => changeQty(it.key, -1));

      const qty = document.createElement('div');
      qty.className = 'w-6 text-center';
      qty.textContent = String(it.qty);

      const inc = document.createElement('button');
      inc.className = 'inc w-8 h-8 rounded-lg bg-primary text-cream hover:shadow-lg active:scale-95 transition';
      inc.textContent = '+';
      inc.addEventListener('click', () => changeQty(it.key, 1));

      right.appendChild(dec);
      right.appendChild(qty);
      right.appendChild(inc);

      row.appendChild(left);
      row.appendChild(right);
      sheetList.appendChild(row);
    });
  }
  sheetTotal.textContent = formatVND(calcTotal());
}

function openSheet() {
  renderSheet();
  sheet.classList.remove('translate-y-full');
}
function closeSheetFn() {
  sheet.classList.add('translate-y-full');
}

orderNow.addEventListener('click', openSheet);
closeSheet.addEventListener('click', closeSheetFn);
confirmOrder.addEventListener('click', () => {
  const note = document.getElementById('note').value.trim();
  const items = Object.values(state.cart).map(({ id, name, priceK, qty, img }) => ({ id, name, priceK, qty, img }));
  if (!items.length) { closeSheetFn(); return; }
  const bill = 'BILL' + Date.now().toString().slice(-6);
  const totalK = calcTotal();
  const totalVND = totalK * 1000;
  sessionStorage.setItem('order_' + bill, JSON.stringify({ items, note, totalK, totalVND }));
  const qs = new URLSearchParams({ bill, amount: String(totalVND), content: 'PAY ' + bill }).toString();
  location.href = 'payment.html?' + qs;
});

renderMenu();
syncCartUI();
window.addEventListener('bb-menu-updated', function () { renderMenu(); });

// ── Draggable chat toggle ────────────────────────────────────────────────────
(function () {
  var btn = document.getElementById('chat-toggle');
  if (!btn) return;

  var dragging = false, moved = false;
  var ox, oy, bx, by;
  const STORAGE_KEY = 'bb_chat_btn_pos';

  function clampPos(left, top) {
    var W = window.innerWidth, H = window.innerHeight;
    var bw = btn.offsetWidth || 48, bh = btn.offsetHeight || 48;
    return {
      left: Math.max(8, Math.min(W - bw - 8, Number(left) || 8)),
      top: Math.max(8, Math.min(H - bh - 8, Number(top) || 8))
    };
  }

  function pointerStart(cx, cy) {
    // Always read live rendered position — never trust btn.style.left/top
    var r = btn.getBoundingClientRect();
    bx = r.left;
    by = r.top;
    console.log('[DRAG] pointerStart - screen position:', { left: bx, top: by });
    // Lock position to left/top so future style writes work
    btn.style.position = 'fixed';
    btn.style.left = bx + 'px';
    btn.style.top = by + 'px';
    btn.style.right = 'auto';
    btn.style.bottom = 'auto';
    ox = cx; oy = cy;
    dragging = true; moved = false;
    btn.style.transition = 'none';
  }

  function pointerMove(cx, cy) {
    if (!dragging) return;
    var dx = cx - ox, dy = cy - oy;
    if (!moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    moved = true;
    var W = window.innerWidth, H = window.innerHeight;
    var bw = btn.offsetWidth, bh = btn.offsetHeight;
    btn.style.left = Math.max(8, Math.min(W - bw - 8, bx + dx)) + 'px';
    btn.style.top = Math.max(8, Math.min(H - bh - 8, by + dy)) + 'px';
    btn.dataset.dragged = '1';
  }

  function pointerEnd() {
    if (!dragging) return;
    dragging = false;
    btn.style.transition = 'left 0.2s, top 0.2s, box-shadow 0.2s';
    if (!moved) {
      console.log('[DRAG] pointerEnd - skipped save (not moved)');
      return;
    }
    // Keep exact dropped position (no snap-to-edge) and clamp to viewport
    var rawLeft = parseFloat(btn.style.left) || 8;
    var rawTop = parseFloat(btn.style.top) || 120;
    var final = clampPos(rawLeft, rawTop);
    var finalLeft = final.left;
    var finalTop = final.top;
    btn.style.left = finalLeft + 'px';
    btn.style.top = finalTop + 'px';
    // Save position to localStorage for persistence
    console.log('[DRAG] pointerEnd - saving position:', { left: finalLeft, top: finalTop });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: finalLeft, top: finalTop }));
      console.log('[DRAG] Position saved to localStorage');
    } catch (e) {
      console.error('[DRAG] localStorage save error:', e);
    }
  }

  // Restore saved position on page load
  function restoreSavedPosition() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      console.log('[DRAG] restoreSavedPosition - saved data:', saved);
      if (saved) {
        var pos = JSON.parse(saved);
        var safe = clampPos(pos.left, pos.top);
        btn.style.position = 'fixed';
        btn.style.left = safe.left + 'px';
        btn.style.top = safe.top + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
        console.log('[DRAG] Restored position:', safe);
      } else {
        console.log('[DRAG] No saved position in localStorage, using defaults');
      }
    } catch (e) {
      console.error('[DRAG] restoreSavedPosition error:', e);
    }
  }

  // Restore on init
  console.log('[DRAG] App.js drag setup started for button:', btn.id);
  restoreSavedPosition();

  // Mouse
  btn.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    pointerStart(e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', function (e) {
    if (dragging) pointerMove(e.clientX, e.clientY);
  });
  document.addEventListener('mouseup', function () {
    if (dragging) pointerEnd();
  });

  // Touch
  btn.addEventListener('touchstart', function (e) {
    pointerStart(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (dragging && moved) e.preventDefault();
    if (dragging) pointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });
  document.addEventListener('touchend', function () {
    if (dragging) pointerEnd();
  });

  // Block click when drag just finished
  btn.addEventListener('click', function (e) {
    if (moved) { e.stopImmediatePropagation(); moved = false; }
  }, true);
})();
