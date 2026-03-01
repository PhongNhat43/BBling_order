'use strict';

/**
 * B.BLING - Single source of truth cho Menu
 * Lưu trữ: bb_categories, bb_items trong localStorage
 */
const MENU_KEYS = { categories: 'bb_categories', items: 'bb_items' };

const DEFAULT_CATEGORIES = [
  { id: 'cat-coffee', name: 'Coffee' },
  { id: 'cat-tea', name: 'Trà hoa quả' },
  { id: 'cat-yogurt', name: 'Sữa chua' },
  { id: 'cat-snack', name: 'Đồ ăn vặt' }
];

const DEFAULT_ITEMS = [
  { id: 'coffee-black', name: 'Black Coffee', priceK: 29, desc: 'Hương vị cổ điển, đậm đà.', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-white', name: 'White Coffee', priceK: 29, desc: 'Dịu nhẹ với sữa, cân bằng vị.', img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-salted-almond', name: 'Salted Almond Coffee', priceK: 39, desc: 'Kem muối và hạnh nhân thơm béo.', img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-coconut', name: 'Coconut Coffee', priceK: 39, desc: 'Cà phê quyện dừa mát lành.', img: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'tea-lotus-gold', name: 'Lotus Tea with Gold Jelly', priceK: 39, desc: 'Trà sen thanh mát kèm thạch vàng.', img: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=600&q=80', cat: 'cat-tea', visible: true },
  { id: 'tea-mango-cc', name: 'Mango Cream Cheese Tea', priceK: 45, desc: 'Xoài chín và kem cheese béo mịn.', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', cat: 'cat-tea', visible: true },
  { id: 'yogurt-pp', name: 'Yogurt with Peach & Passionfruit', priceK: 49, desc: 'Sữa chua sánh mịn cùng đào và chanh dây.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', cat: 'cat-yogurt', visible: true },
  { id: 'snack-sunflower', name: 'Sunflower Seeds', priceK: 20, desc: 'Hướng dương rang vị nguyên bản.', img: 'https://images.unsplash.com/photo-1505577058444-a3dab90d4253?auto=format&fit=crop&w=600&q=80', cat: 'cat-snack', visible: true },
  { id: 'snack-dried-beef', name: 'Dried Beef', priceK: 45, desc: 'Bò khô đậm vị truyền thống.', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=600&q=80', cat: 'cat-snack', visible: true }
];

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_) {}
}

function seedIfEmpty() {
  const cats = loadFromStorage(MENU_KEYS.categories, null);
  const items = loadFromStorage(MENU_KEYS.items, null);
  if (!cats || cats.length === 0) {
    saveToStorage(MENU_KEYS.categories, DEFAULT_CATEGORIES);
  }
  if (!items || items.length === 0) {
    saveToStorage(MENU_KEYS.items, DEFAULT_ITEMS);
  }
}

function getCategories() {
  seedIfEmpty();
  return loadFromStorage(MENU_KEYS.categories, DEFAULT_CATEGORIES);
}

function getItems(visibleOnly) {
  seedIfEmpty();
  const items = loadFromStorage(MENU_KEYS.items, DEFAULT_ITEMS);
  return visibleOnly ? items.filter(i => i.visible !== false) : items;
}

function loadMenuFromFirebase(cb) {
  if (typeof window === 'undefined' || !window.bbDb) { if (cb) cb(); return; }
  window.bbDb.collection('menu').doc('data').onSnapshot(function (doc) {
    if (doc.exists && doc.data()) {
      const d = doc.data();
      if (d.categories && d.categories.length) saveToStorage(MENU_KEYS.categories, d.categories);
      if (d.items && d.items.length) saveToStorage(MENU_KEYS.items, d.items);
    }
    if (cb) cb();
    try { window.dispatchEvent(new CustomEvent('bb-menu-updated')); } catch (_) {}
  }, function () { if (cb) cb(); });
}

/**
 * Trả về menu dạng nested { name, items[] } cho trang khách (chỉ món hiển thị)
 */
function getMenuForCustomer() {
  const categories = getCategories();
  const items = getItems(true);
  return categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    items: items.filter(i => i.cat === cat.id).map(i => ({
      id: i.id, name: i.name, priceK: i.priceK, desc: i.desc || '', img: i.img || ''
    }))
  })).filter(c => c.items.length > 0);
}

/**
 * Trả về categories + items cho admin (toàn bộ, kể cả ẩn)
 */
function getMenuForAdmin() {
  return { categories: getCategories(), items: getItems(false) };
}

function saveMenu(categories, items) {
  saveToStorage(MENU_KEYS.categories, categories);
  saveToStorage(MENU_KEYS.items, items);
}

(function () {
  seedIfEmpty();
  loadMenuFromFirebase();
})();
