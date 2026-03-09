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
  { id: 'coffee-black', name: 'Black Coffee', priceK: 35, hasSizes: true, availableSizes: [{ label: 'Ly nhỏ', priceK: 29, isDefault: false }, { label: 'Ly vừa', priceK: 35, isDefault: true }, { label: 'Ly lớn', priceK: 39, isDefault: false }], desc: 'Hương vị cổ điển, đậm đà.', img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-white', name: 'White Coffee', priceK: 35, hasSizes: true, availableSizes: [{ label: 'Ly nhỏ', priceK: 29, isDefault: false }, { label: 'Ly vừa', priceK: 35, isDefault: true }, { label: 'Ly lớn', priceK: 39, isDefault: false }], desc: 'Dịu nhẹ với sữa, cân bằng vị.', img: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-salted-almond', name: 'Salted Almond Coffee', priceK: 45, hasSizes: true, availableSizes: [{ label: 'Ly nhỏ', priceK: 39, isDefault: false }, { label: 'Ly vừa', priceK: 45, isDefault: true }, { label: 'Ly lớn', priceK: 49, isDefault: false }], desc: 'Kem muối và hạnh nhân thơm béo.', img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'coffee-coconut', name: 'Coconut Coffee', priceK: 45, hasSizes: true, availableSizes: [{ label: 'Ly nhỏ', priceK: 39, isDefault: false }, { label: 'Ly vừa', priceK: 45, isDefault: true }, { label: 'Ly lớn', priceK: 49, isDefault: false }], desc: 'Cà phê quyện dừa mát lành.', img: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80', cat: 'cat-coffee', visible: true },
  { id: 'tea-lotus-gold', name: 'Lotus Tea with Gold Jelly', priceK: 45, hasSizes: true, availableSizes: [{ label: 'Ly nhỏ', priceK: 39, isDefault: false }, { label: 'Ly vừa', priceK: 45, isDefault: true }, { label: 'Ly lớn', priceK: 49, isDefault: false }], desc: 'Trà sen thanh mát kèm thạch vàng.', img: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=600&q=80', cat: 'cat-tea', visible: true },
  { id: 'tea-mango-cc', name: 'Mango Cream Cheese Tea', priceK: 52, hasSizes: true, availableSizes: [{ label: '350ml', priceK: 45, isDefault: false }, { label: '500ml', priceK: 52, isDefault: true }, { label: '700ml', priceK: 58, isDefault: false }], desc: 'Xoài chín và kem cheese béo mịn.', img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80', cat: 'cat-tea', visible: true },
  { id: 'yogurt-pp', name: 'Yogurt with Peach & Passionfruit', priceK: 56, hasSizes: true, availableSizes: [{ label: 'Cốc nhỏ', priceK: 49, isDefault: false }, { label: 'Cốc vừa', priceK: 56, isDefault: true }, { label: 'Cốc lớn', priceK: 62, isDefault: false }], desc: 'Sữa chua sánh mịn cùng đào và chanh dây.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80', cat: 'cat-yogurt', visible: true },
  { id: 'snack-sunflower', name: 'Sunflower Seeds', priceK: 20, hasSizes: false, availableSizes: [], desc: 'Hướng dương rang vị nguyên bản.', img: 'https://images.unsplash.com/photo-1505577058444-a3dab90d4253?auto=format&fit=crop&w=600&q=80', cat: 'cat-snack', visible: true },
  { id: 'snack-dried-beef', name: 'Dried Beef', priceK: 45, hasSizes: false, availableSizes: [], desc: 'Bò khô đậm vị truyền thống.', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=600&q=80', cat: 'cat-snack', visible: true }
];

function getItemAvailableSizes(item) {
  if (!item || item.hasSizes === false) return [];
  if (Array.isArray(item.availableSizes) && item.availableSizes.length) {
    const normalized = item.availableSizes
      .map(function (s) {
        const label = String((s && s.label) || '').trim();
        const priceK = Number(s && s.priceK);
        return label && Number.isFinite(priceK) ? { label: label, priceK: Math.round(priceK), isDefault: !!(s && s.isDefault) } : null;
      })
      .filter(Boolean);
    if (!normalized.length) return [];
    if (!normalized.some(function (s) { return s.isDefault; })) normalized[0].isDefault = true;
    return normalized;
  }

  // Backward compatibility for legacy shape: sizes {S,M,L} + defaultSize
  if (item.sizes && typeof item.sizes === 'object') {
    const legacy = [];
    const defaultLabel = String(item.defaultSize || '').trim();
    const keys = Object.keys(item.sizes || {});
    if (defaultLabel && keys.includes(defaultLabel)) {
      keys.splice(keys.indexOf(defaultLabel), 1);
      keys.unshift(defaultLabel);
    }
    keys.forEach(function (k) {
      const price = Number(item.sizes[k]);
      if (!Number.isFinite(price)) return;
      legacy.push({ label: k, priceK: Math.round(price), isDefault: defaultLabel ? k === defaultLabel : legacy.length === 0 });
    });
    return legacy;
  }

  return [];
}

function getItemPriceK(item, label) {
  if (!item) return 0;

  const availableSizes = getItemAvailableSizes(item);
  if (availableSizes.length) {
    const requested = label ? availableSizes.find(function (s) { return s.label === label; }) : null;
    if (requested) return requested.priceK;
    const defaultEntry = availableSizes.find(function (s) { return s.isDefault; }) || availableSizes[0];
    return defaultEntry.priceK;
  }

  return Number(item.priceK) || 0;
}

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
    items: items.filter(i => i.cat === cat.id).map(i => {
      const availableSizes = getItemAvailableSizes(i);
      const defaultEntry = availableSizes.find(function (s) { return s.isDefault; }) || availableSizes[0] || null;
      const legacySizes = {};
      availableSizes.forEach(function (s) { legacySizes[s.label] = s.priceK; });
      return {
        id: i.id,
        name: i.name,
        priceK: getItemPriceK(i, defaultEntry ? defaultEntry.label : ''),
        hasSizes: availableSizes.length > 0,
        availableSizes: availableSizes,
        // Keep legacy keys to avoid breaking older UI paths still expecting sizes/defaultSize.
        sizes: Object.keys(legacySizes).length ? legacySizes : (i.sizes || {}),
        defaultSize: defaultEntry ? defaultEntry.label : (i.defaultSize || ''),
        desc: i.desc || '',
        img: i.img || ''
      };
    })
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
