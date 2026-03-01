# CODE_CONVENTION.md — Quy tắc viết code B.BLING

## Mục tiêu
- Mã sạch, đồng nhất giữa người và AI, dễ bảo trì, tránh lặp lại (DRY).

## Nguyên tắc tổng quát
- Ưu tiên Tối giản + Rõ ràng; mỗi khối UI/logic chỉ làm một việc.
- DRY: tách phần dùng lại thành hàm/tiện ích; không copy-paste.
- Tuân thủ Design Tokens trong DEVELOPMENT_RULE.md (màu, font).
- Tránh phụ thuộc ngoài nếu repo chưa dùng (CDN Tailwind được chấp nhận).

## Quy tắc đặt tên
- File HTML: kebab-case, ví dụ: admin-dashboard.html, menu-management.html.
- Class CSS tùy biến: tiền tố bb- nếu cần viết tay, còn lại ưu tiên Tailwind.
- JS: camelCase cho biến/hàm (currentOrderId, totalAmount), PascalCase cho “kiểu” cấu trúc dữ liệu nếu dùng.
- ID phần tử: dùng kebab-case ngắn, có ngữ nghĩa (sheet-list, order-now).

## Cấu trúc thư mục (định hướng)
- /assets/images: hình minh họa, icon tĩnh.
- /assets/audio: âm báo, hiệu ứng.
- /scripts: JS tách riêng khi logic lớn (ví dụ: cart.js, dashboard.js).
- /styles: CSS tùy biến (nếu vượt quá Tailwind utilities).
- Giữ các entry HTML tại root cho dễ serve tĩnh.

## Quy ước Tailwind CSS
- Dùng Tailwind utilities cho layout/spacing/typography trước.
- Sử dụng màu “primary, cream, accent, success” đã khai báo trong tailwind.config (CDN config inline).
- Khoảng cách chuẩn: px-4/6/8, py-2/3/4; bo góc rounded-xl cho card/ảnh.
- Bóng đổ thống nhất lớp “shadow-soft”.
- Backdrop-blur cho header/cart bar và modal overlay khi cần.
- Đường kẻ phân tách nhẹ: border, border-dashed, border-primary/10–20.

## HTML/JS Tổ chức & Module
- DOM: truy xuất một lần, lưu vào const; tránh query lại nhiều lần.
- Tách dữ liệu (menu, orders) khỏi render logic. Dữ liệu dùng mảng/object rõ ràng.
- Sự kiện: addEventListener gần nơi tạo DOM; khi sinh động nhiều, gom vào hàm setupX().
- Tránh innerHTML với dữ liệu người dùng; nếu bắt buộc, phải sanitize hoặc dùng textContent.

## Quy ước giỏ hàng
- Key duy nhất: `${id}|${options.join(',')}|${note}` để phân biệt biến thể.
- Mỗi item: { id, name, priceK, qty, options[], note }.
- Tính tiền: priceK * 1000 và format theo vi-VN.

## Comment & Log
- Tránh comment rườm rà; đặt tên tốt thay cho comment.
- console.log chỉ dùng cho debug tạm; xóa trước khi phát hành.

