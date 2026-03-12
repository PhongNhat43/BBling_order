# Kết quả triển khai: Dynamic Options System

**Ngày thực hiện:** 12/03/2026  
**Phạm vi:** admin.js, admin-dashboard.html, app.js, index.html, payment.html, tracking.html

---

## 1. Tổng quan

Hệ thống tùy chọn động (Dynamic Options) cho phép Admin tạo các tùy chọn riêng cho từng món (vd: Ít đường, Nóng, Lạnh, Ít đá...). Khách hàng chọn một trong các tùy chọn đó khi thêm món vào giỏ hàng, và lựa chọn được hiển thị xuyên suốt qua thanh toán, tra cứu và màn hình admin.

---

## 2. Thay đổi theo từng file

### 2.1 `admin.js`

**Hàm mới:**
- `readOptionsFromEditor(editorId)` — Đọc danh sách tùy chọn từ options-editor, trả về mảng string.

**Field type mới trong `openModal()`:**
- `options-editor` — Khu vực nhập/xóa tùy chọn dạng badge tag:
  - Input text + nút "+ Thêm" (hoặc Enter để thêm)
  - Badge tag màu accent với nút × để xóa
  - Ngăn trùng lặp

**Modal "Thêm món":**
- Thêm field `{type:'options-editor', id:'it-options', value:[], placeholder:'Nhập tùy chọn rồi nhấn Enter...'}`
- Save handler: `newItem.options = readOptionsFromEditor('it-options')`

**Modal "Sửa món":**
- Thêm field `{type:'options-editor', id:'it-options', value: it.options || []}`
- Save handler: `it.options = readOptionsFromEditor('it-options')`

**`showDetailModal()` (chi tiết đơn hàng admin):**
- Cell tên món hiển thị thêm: `<br><small class="text-gray-400 italic">Lựa chọn: {selected_option}</small>` nếu có

---

### 2.2 `index.html`

- Xóa block `<div class="grid grid-cols-2 gap-3">` chứa 3 nút cứng (Ít đá, Nhiều đường, Không đường) và tiêu đề "Tùy chọn nhanh"
- Thay bằng:
  ```html
  <div id="modal-options-section" class="hidden">
    <div class="text-xs mb-1">Tùy chọn</div>
    <div id="modal-options-container" class="flex flex-wrap gap-2"></div>
  </div>
  <div> <!-- Số lượng standalone --> </div>
  ```
- Section ẩn mặc định (`hidden`), chỉ hiện khi món có options

---

### 2.3 `app.js`

**DOM refs mới:**
```js
const modalOptionsSection = document.getElementById('modal-options-section');
const modalOptionsContainer = document.getElementById('modal-options-container');
```

**Hàm mới `renderDynamicOptions(item)`:**
- Đọc `item.options` (mảng string từ admin)
- Nếu rỗng → ẩn `modal-options-section`
- Nếu có → hiển thị từng nút dạng pill (single-select):
  - Click chọn: set `modalState.selected_option = opt`, highlight nút
  - Click lần 2: bỏ chọn
  - Class: `dyn-opt px-3 py-1.5 rounded-full border border-primary/20 text-xs`

**`openProduct(id)`:**
- `modalState` có thêm `selected_option: ''`
- Gọi `renderDynamicOptions(item)` sau `renderSizeOptions(item)`

**`closeProduct()`:**
- Reset `modalState.selected_option = ''`

**`modalAdd` click handler:**
- Bỏ `optsArr` (không dùng nữa)
- Cart key: `${item.id}|${sizeKey}|${selected_option}|${note}`
- Cart item: ghi `selected_option` thay vì `options: optsArr`

**`renderSheet()` (giỏ hàng):**
- Bỏ hiển thị `it.options.join(', ')` inline với tên
- Thêm element riêng sau giá: `<small class="text-xs text-primary/50 italic">Lựa chọn: {it.selected_option}</small>` nếu có

**`confirmOrder` click handler:**
- Thêm `selected_option: selected_option || null` vào object item gửi lên Firestore

---

### 2.4 `payment.html`

- Thêm `optDisplay` template string
- Hiển thị bên dưới tên món: `<small class="text-xs text-primary/50 italic">Lựa chọn: {selected_option}</small>`

---

### 2.5 `tracking.html`

- Thêm `optDisplay` string
- Hiển thị bên dưới tên món trong danh sách đơn hàng

---

## 3. Luồng dữ liệu

```
Admin nhập options vào modal → lưu it.options[] vào Firestore
    ↓
app.js đọc item.options → renderDynamicOptions() tạo nút
    ↓
Khách click nút → modalState.selected_option = "Ít đường"
    ↓
Thêm vào giỏ → cart item có selected_option
    ↓
confirmOrder → sessionStorage {items: [{...selected_option: "Ít đường"}]}
    ↓
payment.html + tracking.html + admin showDetailModal hiển thị
```

---

## 4. Điều kiện hiển thị

| Vị trí | Điều kiện hiển thị |
|---|---|
| Modal client (index.html) | `item.options.length > 0` |
| Giỏ hàng (renderSheet) | `it.selected_option` truthy |
| Thanh toán (payment.html) | `it.selected_option` truthy |
| Tra cứu (tracking.html) | `i.selected_option` truthy |
| Admin order detail | `i.selected_option` truthy |

---

## 5. Tương thích ngược

- Các món cũ không có `options` field → `item.options` là `undefined` → render 0 nút → section ẩn hoàn toàn
- Các đơn cũ không có `selected_option` → không hiển thị gì thêm (conditional check)
- Cart key cũ dùng `optsArr.join(',')`, key mới dùng `selected_option` — giỏ hàng reset khi reload page (no localStorage) nên không ảnh hưởng
