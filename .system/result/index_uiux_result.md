# Kết Quả Triển Khai Nâng Cấp UI/UX Mobile - Index (B.BLING)

## 1. Phạm vi triển khai
- Áp dụng cho màn hình mobile `< 768px`.
- Giữ nguyên giao diện desktop theo yêu cầu.
- File chỉnh sửa chính:
	- `index.html`
	- `app.js`
	- `chat.js`
	- `.system/planning/index_UiUX.md`

## 2. Các hạng mục đã thực hiện

### 2.1 Chat mobile: bỏ FAB nổi, chuyển vào Header
- Thêm nút chat mobile trong header: `#chat-toggle-mobile`.
- FAB cũ `#chat-toggle` chuyển thành chỉ hiển thị desktop (`hidden md:flex`).
- Cập nhật `chat.js` để nhận trigger mới từ header nhưng vẫn giữ trigger desktop.

Kết quả:
- Mobile không còn nút chat lơ lửng che nội dung.
- Nhấn icon chat trên header mở `chat-panel` như hành vi cũ.

### 2.2 Tối ưu cart-bar đáy màn hình
- Mobile cart bar bám đáy (`bottom: 0`) và thêm `env(safe-area-inset-bottom)`.
- Nút `#order-now` tăng kích thước thao tác:
	- `min-height: 48px`
	- rộng ~`90vw` (max 360px) để tối ưu bấm một tay.

Kết quả:
- CTA đặt món rõ và dễ bấm hơn trên mobile.
- Không bị chèn vào vùng home indicator của iPhone.

### 2.3 Sticky category bar dưới header
- Thêm khối `#mobile-category-sticky` + `#mobile-category-tabs`.
- Tabs danh mục render động từ data menu trong `app.js`.
- Hỗ trợ cuộn ngang (`overflow-x: auto`, ẩn scrollbar).
- Click tab sẽ scroll mượt tới section danh mục tương ứng.
- Tính toán `top` sticky theo chiều cao header thực tế qua biến `--bb-mobile-header-h`.

Kết quả:
- Khi cuộn menu dài, người dùng vẫn chuyển danh mục nhanh được.

### 2.4 Feedback khi thêm món
- Thêm hàm `runAddFeedback()`:
	- Rung nhẹ bằng `navigator.vibrate(25)` nếu thiết bị hỗ trợ.
	- Hiệu ứng rung nhẹ nút Add (`bb-shake`).
	- Hiển thị toast xác nhận ngắn 1.5s (`#add-toast`).
- Sau khi thêm món thành công vẫn tự động đóng modal như yêu cầu.

Kết quả:
- Người dùng nhận phản hồi tức thời mà không cần thao tác đóng tay.

### 2.5 Chuẩn mobile tap target
- Bổ sung CSS mobile đảm bảo `min-height: 48px` cho các button chính.

### 2.6 Sửa Toast căn giữa màn hình
- **Vấn đề**: Toast "Đã thêm vào giỏ" bị hiển thị lệch, không căn giữa đúng vì CSS `transform` bị ghi đè.
- **Giải pháp**: Bổ sung `translateX(-50%)` vào cả hai rule CSS `.bb-toast` và `.bb-toast-show`:
	- `.bb-toast { transform: translateX(-50%) translateY(12px); }`
	- `.bb-toast.bb-toast-show { transform: translateX(-50%) translateY(0); }`

Kết quả:
- Toast hiển thị chính xác ở trung tâm màn hình.
- Animation fade-in/out mượt mà và đúng vị trí.

### 2.7 Giảm kích thước modal chi tiết sản phẩm trên mobile
- **Vấn đề**: Modal quá lớn trên mobile, chiếm quá nhiều không gian màn hình.
- **Giải pháp**: Giảm kích thước:
	- `max-h-[88vh]` → `max-h-[72vh]` (tiết kiệm ~16% chiều cao).
	- Ảnh modal: `h-[190px]` → `h-[140px]` (giảm 50px, giải phóng không gian nội dung).
	- Desktop vẫn giữ `md:max-h-[85vh]` và `md:h-56` không thay đổi.

Kết quả:
- Modal hợp lý với kích thước mobile, không bị quá cao.
- Nội dung sản phẩm dễ xem hơn.

### 2.8 Hiển thị menu danh mục trên cả desktop lẫn mobile
- **Vấn đề**: Thanh menu danh mục chỉ hiển thị trên mobile (`md:hidden`), desktop không có.
- **Giải pháp**: Bỏ class `md:hidden` khỏi `#mobile-category-sticky` → hiển thị trên mọi breakpoint.

Kết quả:
- Cả desktop và mobile đều có thanh danh mục sticky dưới header.
- Người dùng có thể chuyển danh mục nhanh chóng trên mọi thiết bị.

### 2.9 Sửa scrollbar trên desktop
- **Vấn đề**: Scrollbar bị ẩn trên desktop do CSS `scrollbar-width: none` được apply toàn cục.
- **Giải pháp**: Chuyển CSS scrollbar-hiding khỏi global scope:
	- `scrollbar-width: none` và `::-webkit-scrollbar { display: none }` chỉ áp dụng trong `@media (max-width: 767.98px)`.
	- Desktop giữ scrollbar mặc định để người dùng có thể scroll ngang thanh danh mục.

Kết quả:
- Mobile: scrollbar ẩn (UX sạch, tối ưu cảm ứng).
- Desktop: scrollbar hiển thị bình thường.

### 2.10 Sửa scroll chính xác đến tiêu đề danh mục
- **Vấn đề**: Click vào tab danh mục sẽ scroll đến section nhưng lệch, tiêu đề bị che khuất bởi sticky header + category bar.
- **Giải pháp**: Thay `scrollIntoView({ block: 'start' })` bằng manual scroll với offset:
	```javascript
	const categoryBar = document.getElementById('mobile-category-sticky');
	const barBottom = categoryBar ? categoryBar.getBoundingClientRect().bottom : 0;
	const targetTop = target.getBoundingClientRect().top + window.scrollY - barBottom - 8;
	window.scrollTo({ top: targetTop, behavior: 'smooth' });
	```
	- Tính `barBottom`: vị trí đáy của thanh danh mục (đã tính header sticky).
	- Tính `targetTop`: vị trí đích trừ đi `barBottom` + 8px thở.
	- Scroll mượt đến vị trí chính xác.

Kết quả:
- Scroll đến tiêu đề danh mục luôn chính xác, không bị che khuất.
- Áp dụng chính xác trên cả desktop lẫn mobile.

### 2.11 Nâng cấp layout category bar trên Desktop (flex-wrap)
- **Ngày thực hiện**: 11/03/2026
- **Mục tiêu**: Tối ưu thanh danh mục cho màn hình lớn — loại bỏ scrollbar ngang, chuyển sang dàn hàng.
- **Vấn đề trước**: Trên PC, `#mobile-category-tabs` giữ `flex-nowrap` + `overflow-x: auto` nên xuất hiện scrollbar ngang thô.
- **Thay đổi chính** (trong `index.html`):
	- Thêm `@media (min-width: 768px)` cho `#mobile-category-tabs`:
		- `flex-wrap: wrap` — dàn danh mục xuống dòng khi tràn.
		- `justify-content: center` — căn giữa các tab.
		- `gap: 10px` — khoảng cách đều giữa hàng/cột.
		- `overflow-x: visible` — loại bỏ hoàn toàn scrollbar ngang.
		- `white-space: normal` — override Tailwind `whitespace-nowrap`.
	- Bo góc wrapper desktop tinh tế hơn (`border-radius: 1rem` cho `#mobile-category-sticky > div`).
	- Chuyển `-webkit-overflow-scrolling: touch` từ global vào `@media (max-width: 767.98px)` (chỉ cần trên mobile).
- **Mobile**: Giữ nguyên `flex-nowrap`, cuộn ngang, scrollbar ẩn — UX vuốt ngón cái không thay đổi.
- **JS (`app.js`)**: Không cần sửa — `getBoundingClientRect().bottom` đã tính động theo chiều cao thực tế của category bar (1 hay 2 dòng đều chính xác).

Lợi ích:
- PC không còn scrollbar ngang, trông gọn gàng như bảng điều hướng thực thụ.
- Toàn bộ danh mục hiển thị một lúc, người dùng bao quát được ngay khi vào trang.
- Tiêu đề danh mục vẫn scroll chính xác dù category bar cao hơn (2 dòng).

### 2.12 Adaptive Navigation — Sidebar PC + Scroll ngang Mobile
- **Ngày thực hiện**: 11/03/2026
- **Hạng mục**: Nâng cấp Menu Danh mục đa thiết bị (Adaptive Navigation).
- **Giải pháp**: Sidebar tĩnh bên trái cho PC, scroll-bar ngang cho Mobile.

**Thay đổi `index.html`:**
- Xoá block `@media (min-width: 768px)` flex-wrap từ lần nâng cấp trước (không còn cần thiết).
- Thêm CSS active state cho sidebar: `#desktop-sidebar .cat-btn.active { background: #3E2723; color: #F2E8DF; }` trong `@media (min-width: 768px)`.
- Thêm `<aside id="desktop-sidebar">` với `hidden md:block fixed` tại `left:2rem; top:9rem; width:12rem;`:
  - Wrapper: `rounded-2xl bg-white/80 backdrop-blur border border-primary/10 shadow-soft`.
  - Header: Font Serif italic bold "Danh mục".
  - `<nav id="desktop-category-nav">`: render động danh sách dọc.
- `#mobile-category-sticky`: thêm `md:hidden` — chỉ hiện trên mobile.
- `<main>`: đổi `md:px-6` → `md:pr-6 md:pl-[15rem]` để nội dung không bị sidebar che khuất trên desktop.

**Thay đổi `app.js`:**
- Tách `renderMobileCategoryTabs` thành 2 luồng:
  - Mobile: giữ nguyên horizontal scroll tabs vào `#mobile-category-tabs`.
  - Desktop: render vertical buttons vào `#desktop-category-nav` với offset scroll dùng `header.getBoundingClientRect().bottom`.
- Thêm hàm `setupScrollspy(categories)`:
  - Dùng `IntersectionObserver` với `rootMargin: '-10% 0px -55% 0px'` để detect section đang active.
  - Tự toggle class `.active` trên sidebar button tương ứng khi scroll.
  - `_scrollspyObserver.disconnect()` trước khi setup lại (tránh memory leak khi menu re-render).

**Ưu điểm:**
- Tận dụng không gian trống bên trái màn hình PC (thay vì lãng phí).
- Người dùng Desktop thấy toàn bộ danh mục ngay, không cần scroll hay tìm kiếm.
- Sidebar tự highlight danh mục đang xem theo scroll (Scrollspy).
- Mobile không bị ảnh hưởng — giữ nguyên UX vuốt ngang quen thuộc.
- Thẩm mỹ Minimalist: cream background, backdrop-blur, bo góc tinh tế.

### 2.13 Chuyển đổi sang Header-Integrated Dropdown Menu
- **Ngày thực hiện**: 11/03/2026
- **Hạng mục**: Header-Integrated Menu — Khôi phục Centered Layout, thay Sidebar bằng Dropdown.
- **Lý do**: Sidebar chiếm không gian bên trái làm lệch bố cục căn giữa của nội dung chính.
- **Giải pháp**: Nút "Danh mục" trong Header kích hoạt Dropdown Grid-style.

**Thay đổi `index.html`:**
- **Hoàn tác Sidebar**: Xoá `<aside id="desktop-sidebar">` và CSS `.cat-btn.active`; khôi phục `<main>` về `md:px-6`.
- **Header restructure**:
  - Thêm `relative` vào `<div class="mx-auto max-w-2xl">` để làm positioning context cho dropdown.
  - Thêm `<button id="pc-category-trigger">` (`hidden md:inline-flex`) — pill-style, icon hamburger + "Danh mục".
  - Thêm `<div id="pc-category-dropdown">` bên ngoài flex nhưng trong `max-w-2xl relative`:
    - `absolute left-0 right-0 top-full z-40` — bám ngay dưới pill header.
    - `rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-primary/10`.
    - `<div id="pc-category-grid" class="grid grid-cols-3 gap-2">` — dạng lưới 3 cột.

**Thay đổi `app.js`:**
- Thay `_scrollspyObserver` bằng `_pcDropdownListenerAdded` flag.
- Xoá `setupScrollspy`, thay bằng `setupPcDropdown`:
  - `trigger.onclick` = toggle `hidden` class trên dropdown.
  - `document.addEventListener('click', ...)` (đăng ký 1 lần duy nhất): đóng dropdown khi click ngoài.
  - Click item → scroll đến danh mục + đóng dropdown.
- Scroll offset dùng `header.getBoundingClientRect().bottom` — chính xác trên mọi header height.
- `keydown Escape`: đóng cả product modal lẫn category dropdown.

**Ưu điểm:**
- Bố cục trang hoàn toàn căn giữa, tối ưu không gian hiển thị sản phẩm trên PC.
- Dropdown không chiếm diện tích thường trực — chỉ xuất hiện khi cần.
- Grid 3 cột cho phép bao quát toàn bộ danh mục trong một cái nhìn.
- Click ngoài / nhấn Escape / chọn danh mục đều đóng dropdown tự động.

## 3. Kiểm tra kỹ thuật
- `index.html`: 
	- Toast CSS: khôi phục `translateX(-50%)` cho centered alignment.
	- Modal height: giảm `max-h-[72vh]` + `h-[140px]` cho mobile.
	- Category bar: bỏ `md:hidden` để hiển thị toàn bộ.
	- Scrollbar CSS: chuyển `scrollbar-width: none` vào `@media (max-width: 767.98px)`.
	- Không lỗi CSS/HTML.
- `app.js`:
	- Hàm `renderMobileCategoryTabs`: thay `scrollIntoView` bằng manual `window.scrollTo` với offset.
	- Tính toán `barBottom` từ `.getBoundingClientRect().bottom` của category bar.
	- Không lỗi JavaScript.
- `chat.js`: không thay đổi.

## 4. Phạm vi cập nhật lần này
- Mở rộng category bar từ mobile-only sang toàn bộ device.
- Sửa UI/UX chi tiết: toast, modal height, scrollbar, scroll behavior.
- Kiểm tra kỹ lưỡng trên cả PC lẫn mobile.

## 5. Ghi chú vận hành
- Trên desktop, FAB chat vẫn giữ nguyên để không đổi trải nghiệm hiện tại.
- Trên mobile, chat mở từ icon header nên giao diện sạch hơn và giảm che nội dung.
- Thanh category bar sticky dưới header trên mọi breakpoint — người dùng PC cũng hưởng tiện ích chuyển danh mục nhanh.
- Toast "Đã thêm vào giỏ" luôn căn giữa đúng, hiển thị 1.5s sau đó tự mất.
- Modal chi tiết sản phẩm compact trên mobile, không che khuất menu chính.
- Scroll đến danh mục luôn chính xác, tiêu đề không bị header/category bar che khuất.
