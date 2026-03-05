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
      <div class="grid grid-cols-1 gap-3">
        ${cat.items.map(i => `
          <div class="flex items-center justify-between rounded-xl bg-white/70 backdrop-blur px-4 py-4 shadow-soft border border-primary/10 hover:shadow-lg hover:transition-shadow hover:duration-200 cursor-pointer menu-item" data-card="${i.id}">
            <div class="flex items-center gap-3 w-full">
              <img src="${i.img}" alt="" class="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              <div class="flex-1">
                <div class="font-semibold">${i.name}</div>
                <div class="text-xs text-primary/70 border-t border-dashed border-primary/20 mt-1 pt-1">${i.priceK}k · ${formatVND(i.priceK)}</div>
              </div>
            </div>
            <button data-id="${i.id}" class="add ml-3 px-3 py-2 rounded-lg bg-primary text-cream hover:shadow-lg active:scale-95 transition-all duration-150">+</button>
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
  modalEl.classList.remove('pointer-events-none');
  // Use a small delay to ensure DOM is ready before animation
  setTimeout(() => {
    modalEl.classList.add('opacity-100');
    modalSheet.classList.remove('translate-y-full');
  }, 10);
}

function closeProduct() {
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
