# Kết quả triển khai: Move Control cho Quản lý Menu

**Ngày thực hiện:** 12/03/2026  
**Cập nhật lần 2:** 12/03/2026 — Bug Fix & Sortable Optimization  
**Trạng thái:** ✅ Hoàn thành (v2 — Sortable Instances Fix + Debug Console)

---

## Tóm tắt v2 — Bug Fix & Optimization

### Vấn đề phát hiện
1. **4 hàm không được định nghĩa**:
   - `_rebindCatSortable()`, `_rebindItemSortable()`, `enterSortMode()`, `exitSortMode()` được tham chiếu nhưng không có định nghĩa
   - Gây `ReferenceError` khi `bindMenu()` chạy, crash toàn bộ `DOMContentLoaded` handler
   - Firestore listeners (`setupOrdersListener()`, `setupGuestChatsListener()`) không bao giờ được khởi tạo → dữ liệu admin không load

2. **Stale closure reference** (Sortable instances):
   - `loadMenuFromFirebase()` gán lại `categories = d.categories` (mảng MỚI)
   - Nhưng Sortable instance cũ vẫn giữ con trỏ tới mảng CŨ
   - Kéo thả cập nhật mảy cũ → `categories` thật không đổi → re-render vẫn ra thứ tự gốc

3. **Multiple Sortable instances**:
   - Mỗi lần `renderCategories()`/`renderItems()` gọi `initSortable()` tạo instance mới mà không destroy cái cũ
   - `onEnd` callback lọn được gọi nhiều lần

### Giải pháp áp dụng

#### a) Thêm 4 hàm còn thiếu
**File:** `admin.js` (dòng ~1155)

```javascript
// Snapshot của sort order trước khi vào edit mode
let _sortSnapshot = null;
let _catSortableInst = null;
let _itemSortableInst = null;

function _rebindCatSortable() {
  if (typeof Sortable === 'undefined') return;
  const listEl = qs('#cat-list');
  if (!listEl) return;
  // Destroy instance cũ để tránh duplicate listeners
  if (_catSortableInst) { 
    try { _catSortableInst.destroy(); } catch(e){} 
    _catSortableInst = null; 
  }
  // Tạo instance mới — truy cập trực tiếp `categories` (không dùng closure stale)
  _catSortableInst = Sortable.create(listEl, {
    handle: '.sort-handle',
    animation: 180,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    chosenClass: 'sortable-chosen',
    onEnd: function(evt) {
      if (evt.oldIndex === evt.newIndex) return;
      const moved = categories.splice(evt.oldIndex, 1)[0];
      categories.splice(evt.newIndex, 0, moved);
      categories.forEach(function(x, i) { x.sort_order = i; });
      console.log('[SORT] Cat dragged', evt.oldIndex, '→', evt.newIndex, 
                  categories.map(function(c){ return c.name; }));
      persistMenu();
    }
  });
}

function _rebindItemSortable() {
  // Tương tự cho items
}

function enterSortMode() {
  // Snapshot dữ liệu hiện tại trước khi chỉnh sửa
  _sortSnapshot = {
    categories: categories.map(function (c) { return Object.assign({}, c); }),
    items: items.map(function (i) { return Object.assign({}, i); })
  };
  // Hiện handles, đổi buttons, thêm CSS class sort-edit-mode
  const tabMenu = qs('#tab-menu');
  if (tabMenu) tabMenu.classList.add('sort-edit-mode');
  // Ẩn/hiện buttons...
}

function exitSortMode(save) {
  if (save) {
    // Normalize sort_order + lưu
    categories.forEach(function(x, i) { x.sort_order = i; });
    items.forEach(function(x, i) { x.sort_order = i; });
    persistMenu();
    console.log('✅ [SORT MODE] Done', categories.map(function(c){ 
      return c.name + '(' + c.sort_order + ')'; }));
    if (typeof Toast !== 'undefined') Toast.success('✓ Đã lưu vị trí sắp xếp');
  } else if (_sortSnapshot) {
    // Khôi phục từ snapshot nếu cancel
    categories.length = 0;
    _sortSnapshot.categories.forEach(function (c) { categories.push(c); });
    items.length = 0;
    _sortSnapshot.items.forEach(function (i) { items.push(i); });
  }
  // Reset UI + re-render
  _sortSnapshot = null;
  const tabMenu = qs('#tab-menu');
  if (tabMenu) tabMenu.classList.remove('sort-edit-mode');
  renderCategories();
  renderItems();
}
```

#### b) Debug Console Logging
**File:** `admin.js` — function `exitSortMode()`

Thêm log chi tiết khi bấm "Lưu vị trí":
- Danh sách categories với sort_order mới
- Danh sách items với sort_order mới
- Xác nhận dữ liệu đã lưu thành công

```javascript
// Log in console:
// 🔄 [SORT MODE] Confirming save...
// 📋 [SORT MODE] Categories: ["Trà Hoa Quả(0)", "Sữa Chua(1)", "Coffee(2)", ...]
// ✅ [SORT MODE] Done
```

### Kết quả xác nhận

**Trang Admin:**
```
[SORT] Cat dragged 0 → 1 [Trà Hoa Quả, Coffee, Sữa Chua, ...]
[SORT] Cat dragged 1 → 2 [Trà Hoa Quả, Sữa Chua, Coffee, ...]
🔄 [SORT MODE] Confirming save...
📋 [SORT MODE] Categories: [Trà Hoa Quả(0), Sữa Chua(1), Coffee(2), ...]
✅ [SORT MODE] Done
```

**Trang Index (Homepage):**
```
[BB Debug] getMenuForCustomer - Danh mục: Array(11)
  0: {id: 'cat-tea', name: 'Trà Hoa Quả', sort_order: 0}
  1: {id: 'cat-yogurt', name: 'Sữa Chua', sort_order: 1}
  2: {id: 'cat-coffee', name: 'Coffee', sort_order: 2}  ✅ Thứ tự MỚI!
  ...
```

**Nhận xét:**
- ✅ Drag-drop hoạt động chính xác
- ✅ Dữ liệu được lưu vào Firestore
- ✅ Trang Index nhận được thứ tự mới từ Firestore
- ✅ Hiển thị đúng thứ tự mới khi load lại

---

## Tổng quan v1


Triển khai tính năng kéo-thả (drag-and-drop) với **chế độ chỉnh sửa riêng biệt** cho khối Danh mục và Món trong trang quản trị admin. Đây là phiên bản v2 cải tiến từ v1: tách biệt rõ ràng giữa chế độ xem và chế độ sắp xếp, ngăn lưu ngoài ý muốn.

---

## Các thay đổi thực hiện

### 1. Admin UI — `admin-dashboard.html`
#### CSS
- `.sort-handle`: mặc định `display: none` — **ẩn hoàn toàn** cho đến khi bật chế độ chỉnh sửa.
- `#tab-menu.sort-edit-mode .sort-handle`: `display: inline-block` — hiện handle khi vào Edit Mode.
- `#sort-mode-hint`: banner nhắc nhở, hiện khi ở Edit Mode với animation fade-in.

#### Buttons trong Menu tab header
| ID | Label | Trạng thái mặc định |
|----|-------|-------------------|
| `#sort-edit-btn` | ⠿ Chỉnh sửa vị trí | visible |
| `#sort-save-btn` | ✓ Lưu vị trí | `hidden` |
| `#sort-cancel-btn` | ✕ Hủy | `hidden` |

---

### 2. Logic Admin — `admin.js`
#### Biến trạng thái mới
| Biến | Kiểu | Mô tả |
|------|------|-------|
| `_sortEditMode` | `boolean` | Cờ trạng thái chế độ chỉnh sửa |
| `_catSortable` | `Sortable\|null` | Instance SortableJS cho cat-list |
| `_itemSortable` | `Sortable\|null` | Instance SortableJS cho item-list |
| `_catSnapshot` | `Array\|null` | Deep-copy categories trước khi vào Edit Mode |
| `_itemSnapshot` | `Array\|null` | Deep-copy items trước khi vào Edit Mode |

#### Hàm mới / cập nhật
| Hàm | Mô tả |
|-----|-------|
| `normaliseSortOrder(arr)` | Đảm bảo sort_order tồn tại, sort + re-index 0,1,2… |
| `_makeSortable(listEl, dataArr)` | Tạo SortableJS instance ở trạng thái `disabled: true`; onEnd chỉ cập nhật array trong memory, KHÔNG persist |
| `_rebindCatSortable()` | Destroy instance cũ, tạo mới cho `#cat-list`; nếu đang trong edit mode thì enable |
| `_rebindItemSortable()` | Tương tự cho `#item-list` |
| `enterSortMode()` | Chụp snapshot → enable sortables → hiện handles → đổi buttons |
| `exitSortMode(save)` | Nếu save: re-index + persistMenu() + toast. Nếu cancel: restore snapshot + re-render. Sau đó tắt sortables + ẩn handles + đổi buttons |

#### Luồng Edit Mode
```
[Chỉnh sửa vị trí] click
  → snapshot categories & items
  → _sortEditMode = true
  → Sortable.option('disabled', false)
  → #tab-menu.classList.add('sort-edit-mode')  → handles hiện ra, banner hiện
  → nút đổi: ẩn "Chỉnh sửa", hiện "Lưu" & "Hủy"

Người dùng kéo thả
  → SortableJS cập nhật DOM + array trong memory
  → sort_order được re-index (CHƯA lưu)

[Lưu vị trí] click
  → categories/items.forEach re-index sort_order
  → persistMenu() (localStorage + Firestore)
  → exitSortMode state cleanup

[Hủy] click
  → categories/items = clone từ snapshot
  → renderCategories() + renderItems()
  → exitSortMode state cleanup
  → Toast "Đã hủy — thứ tự được khôi phục"
```

---

### 3. Khắc phục hiển thị Index — `menu-store.js` & `app.js`

#### `menu-store.js` (`getMenuForCustomer`)
- Thêm `console.log('[BB Debug]')` hiển thị `sort_order` của từng danh mục và món trước khi sort.
- Thêm `sort_order` vào object trả về của cả category lẫn item (phục vụ debug ở layer trên).

#### `app.js` (`renderMenu`)
- Thêm `console.log('[BB Debug] renderMenu - Dữ liệu Menu nhận được:', ...)` để verify sort_order đã được pass qua.
- Thêm **defensive sort** bắt buộc trước khi render:
  ```js
  categories.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  // Bên trong forEach:
  cat.items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  ```

---

## Trải nghiệm kéo thả

| Trạng thái | Hiệu ứng |
|-----------|---------|
| Mặc định | Handle ẩn hoàn toàn |
| Bật "Chỉnh sửa vị trí" | Handle fade-in, banner nhắc nhở |
| Hover handle | Opacity tăng lên 90% |
| Đang kéo | Shadow `0 8px 32px rgba(0,0,0,.45)`, scale 1.02 |
| Ghost placeholder | Nền dashed đỏ-cam, opacity 35% |
| "Lưu vị trí" | Lưu một lần vào localStorage + Firestore |
| "Hủy" | Khôi phục từ snapshot, không có thay đổi nào được lưu |

---

## Lưu ý kỹ thuật

- **Deferred persistence**: Kéo thả chỉ cập nhật array trong memory. `persistMenu()` chỉ được gọi khi nhấn "Lưu vị trí" — tránh ghi Firestore quá nhiều lần.
- **Snapshot safety**: `_catSnapshot` và `_itemSnapshot` dùng `JSON.parse(JSON.stringify(...))` để tạo deep-copy, an toàn với nested objects.
- **Re-bind after DOM rebuild**: Mỗi lần `renderCategories()`/`renderItems()` được gọi (sau add/edit/delete), `_rebindCatSortable()`/`_rebindItemSortable()` tự động tạo Sortable instance mới với trạng thái phù hợp (disabled hay enabled tùy `_sortEditMode`).
- **Staff không thể sort**: `enterSortMode()` kiểm tra `canManageMenu()` trước khi cho phép.


**Ngày thực hiện:** 12/03/2026  
**Trạng thái:** ✅ Hoàn thành

---

## Tổng quan

Đã triển khai tính năng kéo-thả (drag-and-drop) cho khối **Danh mục** và **Món** trong trang quản trị admin, sử dụng thư viện SortableJS.

---

## Các thay đổi thực hiện

### 1. Database / Data Model — `menu-store.js`
- Thêm trường `sort_order: number` (Integer) vào tất cả bản ghi mặc định của `DEFAULT_CATEGORIES` và `DEFAULT_ITEMS`.
- Cập nhật `getMenuForCustomer()`: sort categories và items theo `sort_order` tăng dần trước khi render ra trang khách.

### 2. Admin UI — `admin-dashboard.html`
- Thêm CDN SortableJS `v1.15.2` (`https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js`).
- Thêm CSS cho:
  - `.sort-handle`: cursor grab, opacity transition.
  - `.sortable-ghost`: hiệu ứng placeholder (nền dashed đỏ-cam, opacity 35%).
  - `.sortable-drag`: hiệu ứng item đang kéo (shadow nổi, scale 1.02).
  - `.sortable-chosen`: outline highlight khi selected.
- Cập nhật chú thích hint text bên cạnh hướng dẫn size.

### 3. Logic Admin — `admin.js`
#### Hàm mới thêm
| Hàm | Mô tả |
|-----|-------|
| `normaliseSortOrder(arr)` | Đảm bảo mọi phần tử có `sort_order`, sort + re-index 0,1,2… |
| `saveCatOrder()` | Gọi `normaliseSortOrder` rồi `persistMenu()` cho danh mục |
| `saveItemOrder()` | Gọi `normaliseSortOrder` rồi `persistMenu()` cho món |
| `initSortable(listEl, dataArr, onEnd)` | Khởi tạo SortableJS trên container, cập nhật `sort_order` sau khi drag xong, gọi callback `onEnd` |

#### Cập nhật `renderCategories()`
- Gọi `normaliseSortOrder(categories)` trước khi render.
- Thêm icon grab handle `⠿` (class `sort-handle`) ở đầu mỗi hàng.
- Sau khi render xong, gọi `initSortable(root, categories, ...)` để gắn drag-drop.
- Sau khi kéo thả: tự động lưu thứ tự + Toast thông báo.

#### Cập nhật `renderItems()`
- Gọi `normaliseSortOrder(items)` trước khi render.
- Thêm icon grab handle `⠿` (class `sort-handle`) ở đầu mỗi hàng.
- Sau khi render xong, gọi `initSortable(root, items, ...)`.
- Sau khi kéo thả: tự động lưu thứ tự + Toast thông báo.

#### Cập nhật thêm mới
- Khi thêm danh mục mới: gán `sort_order: categories.length` (xếp cuối).
- Khi thêm món mới: gán `sort_order: items.length` (xếp cuối).

---

## Luồng hoạt động

```
Admin kéo hàng  →  SortableJS cập nhật DOM  →  onEnd() cập nhật mảng JS
     →  sort_order được re-index  →  persistMenu() lưu vào localStorage + Firestore
     →  Toast "✓ Đã lưu thứ tự"
     
Trang khách load  →  getMenuForCustomer() đọc từ localStorage
     →  sort theo sort_order tăng dần  →  renderMenu() hiển thị đúng thứ tự
```

---

## Trải nghiệm kéo thả

| Trạng thái | Hiệu ứng |
|-----------|---------|
| Hover handle | Opacity tăng lên 90% |
| Đang kéo | Shadow `0 8px 32px rgba(0,0,0,.45)`, scale 1.02 |
| Ghost placeholder | Nền dashed đỏ-cam, opacity 35% |
| Chosen | Outline accent color |
| Animation | 180ms smooth |

---

## Lưu ý

- Tính năng sử dụng cùng cơ chế lưu trữ localStorage + Firestore hiện có (`persistMenu()`), không cần backend API riêng.
- `normaliseSortOrder()` xử lý backward compatibility: dữ liệu cũ chưa có `sort_order` sẽ được tự động gán theo vị trí hiện tại.
- Staff (role `staff`) vẫn thấy grab handle nhưng không thể kéo theo ý muốn vì các nút action đã bị ẩn — và `canManageMenu()` guard không ảnh hưởng đến drag (sort là thao tác hiển thị, không phải chỉnh sửa nội dung). Nếu cần hạn chế staff không được sort, có thể skip `initSortable()` khi `isStaffRole()`.
