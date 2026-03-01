# B.BLING — Tech Stack

Giữ nhất quán với phong cách Vintage Minimalist và quy tắc trong .system/rules.

## Frontend
- [x] HTML5
- [x] Tailwind CSS v3 (Play CDN trong dev)
- [ ] Tailwind build cho production (CLI/Vite) — giảm cảnh báo CDN
- [x] JavaScript (ES6+), module tách: app.js, chat.js
- [x] Google Fonts: Playfair Display (serif), Montserrat (sans)
- [ ] Icons: Lucide Icons hoặc FontAwesome (cân nhắc tối ưu tải)

## State & Storage
- [x] sessionStorage/localStorage cho giỏ & đơn tạm thời
- [ ] Firebase Firestore/Realtime Database cho đồng bộ & lưu đơn (Phase 3)

## Payment & Media
- [x] VietQR động (build URL placeholder trong dev)
- [x] Upload ảnh biên lai (FileReader preview, validation)
- [ ] Tích hợp xác minh giao dịch thực tế (sau khi khảo sát cổng phù hợp)

## Notifications
- [ ] Web Push cho Admin (Phase 3)
- [ ] Cơ chế “ting” tuân thủ chính sách tương tác người dùng

## Tooling & Build
- [ ] Thiết lập Tailwind CLI hoặc Vite:
  - [ ] Biên dịch CSS: @tailwind base/components/utilities
  - [ ] Purge class để giảm kích thước
- [ ] Thiết lập script dev/build, lint (ESLint khuyến nghị)

## Bảo mật & Chất lượng
- [x] Tuân thủ SECURITY_POLICY (tránh innerHTML, try/catch IO)
- [x] QA theo QA_TESTING_GUIDE (checklist di động, offline, storage…)
- [ ] Rate limit đặt đơn (≤2/5 phút/thiết bị) ở phía backend (Phase 3)

## Hạ tầng & Phát hành
- [ ] Serve tĩnh (Python http.server/Live Server) trong dev
- [ ] CD: chọn nền tảng (Vercel/Netlify/Static hosting) khi sẵn sàng

