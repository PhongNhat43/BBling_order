# Kết quả triển khai: Group by Category cho Quản lý Menu

**Ngày thực hiện:** 12/03/2026  
**Trạng thái:** ✅ Hoàn thành

---

## Tóm tắt

Đã tái cấu trúc tính năng hiển thị danh sách món trong trang admin từ **danh sách phẳng** thành **nhóm theo danh mục** (Group by Category), giúp admin dễ dàng quản lý menu khi số lượng danh mục và món tăng lên.

---

## Các thay đổi thực hiện

### 1. **admin.js** — Tái cấu trúc `renderItems()`

#### Thay đổi chính:
- **Trước:** Render tất cả món vào danh sách duy nhất, không phân nhóm theo danh mục
- **Sau:** Duyệt lần lượt từng danh mục (categories), tạo nhóm riêng cho mỗi danh mục, rồi filter & render các món thuộc danh mục đó

#### Luồng xử lý mới:
```javascript
categories.forEach(function(cat) {
  // Tạo group-header (hiển thị tên danh mục + số lượng món)
  // Tạo group-content (container chứa các món)
  // Filter items theo category ID
  // Render từng item vào group-content
  // Gắn Sortable instance riêng cho group-content này
});
```

#### Cấu trúc HTML mới:
```html
<div class="category-group mb-4 rounded-lg border border-gray-700">
  <!-- Group header - collapsible -->
  <div class="group-header bg-gray-800/70 p-3 border-l-4 border-primary cursor-pointer">
    <span class="font-bold text-primary italic">1. Danh mục tên</span>
    <span class="px-2 py-0.5 bg-gray-600/80 text-xs">5 món</span>
    <span class="text-gray-400 text-lg">▼</span> <!-- Toggle icon -->
  </div>
  
  <!-- Group content - holds items -->
  <div class="group-content border-t border-gray-700 p-2 space-y-2">
    <!-- Item rows render here -->
  </div>
</div>
```

### 2. **Sortable per-category** (không phải per-list)

#### Trước:
- Một Sortable instance cho toàn bộ `#item-list`
- Có thể kéo thả item từ danh mục A sang danh mục B (gây lỗi dữ liệu)

#### Sau:
- Mỗi `group-content` là một Sortable instance riêng
- **Ngăn chặn kéo thả giữa category** bằng cách set `group: 'items-' + cat.id`
- Drag chỉ hoạt động **trong nội bộ một danh mục**
- Khi drag xong, re-index `sort_order` của items chỉ trong danh mục đó
- Log console: `[SORT] Item dragged in category Coffee: 0 → 1`

#### Quản lý instances:
```javascript
const _itemGroupSortables = {}; // Store by category ID
// Cleanup trước khi render mới:
Object.values(_itemGroupSortables).forEach(inst => inst.destroy());

// Gắn mới cho mỗi category:
_itemGroupSortables[cat.id] = Sortable.create(groupContent, {...});
```

### 3. **Toggle Collapse/Expand** cho từng nhóm

#### Cách hoạt động:
- Click vào `group-header` → toggle `.hidden` class của `group-content`
- Animate toggle icon `▼` — rotate -90° khi collapse
- CSS transition 0.2s cho max-height và opacity → smooth animation

#### Code:
```javascript
qsa('[data-toggle]').forEach(function(header) {
  header.addEventListener('click', function() {
    const content = /* find group-content */;
    content.classList.toggle('hidden');
    icon.style.transform = hidden ? 'rotate(-90deg)' : 'rotate(0deg)';
  });
});
```

### 4. **Empty state** — "Chưa có món nào"

Nếu danh mục không có món nào:
```html
<div class="text-xs text-gray-500 italic text-center py-4">
  — Chưa có món nào trong danh mục này —
</div>
```

### 5. **admin-dashboard.html** — Thêm CSS

#### Các class mới:
| CSS Class | Mục đích |
|-----------|---------|
| `.category-group` | Wrapper cho nhóm danh mục |
| `.group-header` | Header collapsible — hiển thị tên & icon |
| `.group-content` | Container chứa items của danh mục |
| `.group-content.hidden` | State ẩn — max-height 0, opacity 0 |
| `[data-toggle-icon]` | Icon toggle với rotate transition |

#### CSS animation:
```css
.group-content {
  transition: max-height 0.2s ease, opacity 0.2s ease;
  max-height: 2000px;
  opacity: 1;
}
.group-content.hidden {
  max-height: 0; opacity: 0; overflow: hidden;
  border: none;
}
[data-toggle-icon] {
  transition: transform 0.2s ease;
}
```

### 6. **Backward Compatibility** — `_rebindItemSortable()`

Hàm này giữ lại để tính tương thích, nhưng không làm gì (log info).  
Logic đã chuyển hoàn toàn vào `renderItems()`.

---

## Hiệu ứng UI / UX

| Tính năng | Hiệu ứng |
|----------|---------|
| Tên danh mục | Chữ đậm, màu primary (cam), italic |
| Badge số lượng | BG xám, nhạn, bên cạnh tên category |
| Hover header | BG tối hơn (gray-700), cursor pointer |
| Click to collapse | Icon rotate -90°, content fade out, max-height 0 |
| Drag trong category | Shadow, scale 1.02, opacity 1 |
| Ghost (placeholder) | BG dashed cam, opacity 35% |
| Empty message | Chữ xám, italic, căn giữa |

---

## Tesing & Xác nhận

### Test Case 1: Nhóm theo danh mục
- ✅ Coffee: 4 món
- ✅ Trà Hoa Quả: 3 món
- ✅ Sữa Chua: 1 món
- ✅ Matcha: 5 món
- ✅ ...v.v

### Test Case 2: Collapse/Expand
- ✅ Click header Coffee → toggle `hidden` class
- ✅ Icon rotate smooth (-90° ↔ 0°)
- ✅ Content fade out max-height transition

### Test Case 3: Drag per-category
- ✅ Drag item trong Coffee category → re-index sort_order chỉ cho Coffee items
- ✅ Console log: `[SORT] Item dragged in category Coffee: 0 → 1`
- ✅ Không thể kéo item từ Coffee sang Trà Hoa Quả
- ✅ Save vào Firestore → category items vẫn giữ đúng order

### Test Case 4: Empty category
- ✅ Nếu xóa hết items trong một category, hiển thị "Chưa có món nào"
- ✅ Không hiển thị Sortable instance cho category trống

### Test Case 5: Add/Edit/Delete item
- ✅ Thêm item vào Coffee → render mới, item nằm trong Coffee group
- ✅ Sửa item (đổi category) → re-render, item di chuyển sang category mới
- ✅ Xóa item → group recount số lượng, update badge

---

## Ưu điểm

1. **Dễ quản lý:** Admin nhìn thấy rõ từng danh mục và số lượng món
2. **Collapse/Expand:** Có thể thu gọn danh mục không cần quản lý để tiết kiệm không gian
3. **Sortable an toàn:** Drag chỉ trong category, không gây lỗi dữ liệu
4. **Responsive:** Grid 2 cột (desktop) hoặc 1 cột (mobile) giữ nguyên
5. **Performance:** Mỗi Sortable instance nhỏ hơn → drag mượt hơn

---

## Giới hạn / Lưu ý

- **Sortable group isolation:** Không thể kéo item giữa các category. Nếu admin muốn đổi category, phải sửa item (edit modal) → chọn category mới
- **Sort order per-category:** `sort_order` được re-index riêng cho mỗi category. Ví dụ: Coffee items có sort_order 0,1,2,3 và Trà items cũng có 0,1,2
- **Collapse state:** Không persist — nếu reload page, tất cả category vẫn mở hết (có thể thêm localStorage nếu cần)

---

## File thay đổi

| File | Thay đổi |
|------|---------|
| `admin.js` | Tái cấu trúc `renderItems()`, thêm `_itemGroupSortables`, cập nhật `_rebindItemSortable()` |
| `admin-dashboard.html` | Thêm CSS cho `.category-group`, `.group-header`, `.group-content`, toggle animation |

---

## Tiếp theo (Optional)

Nếu cần, có thể thêm:
1. **Persist collapse state** - localStorage per-category
2. **Batch action** — chọn nhiều items, xóa/ẩn cùng lúc
3. **Search filter per-category** — tìm kiếm item trong category cụ thể
4. **Drag between categories** (advanced) — cho phép kéo item giữa category, auto-reindex toàn bộ
