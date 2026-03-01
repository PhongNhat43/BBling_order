# B.BLING — Product Roadmap

Giữ tinh thần Vintage Minimalist (kem #F2E8DF, nâu #3E2723) xuyên suốt. Mỗi hạng mục đều kèm checklist để theo dõi.

## Phase 1 — UI/UX (Hiện tại)
- [ ] Hoàn thiện Trang chủ (Menu theo danh mục, card món, thumbnail, mô tả ngắn)
- [ ] Modal chi tiết sản phẩm (tùy chọn nhanh, qty, ghi chú, ảnh lớn bo 2xl)
- [ ] Giỏ hàng & Bottom Sheet (tăng/giảm, tổng tiền, ghi chú đơn)
- [ ] Trang Thanh toán (Payment):
  - [ ] Chọn hình thức: Tiền mặt / Chuyển khoản
  - [ ] Sinh VietQR động theo tổng tiền
  - [ ] Upload ảnh biên lai (preview trước khi gửi)
- [ ] Trang Theo dõi (Tracking) cơ bản (giả lập trạng thái)
- [ ] Chat 1-1 tối thiểu (gửi text/ảnh, tránh XSS)
- [ ] Kiểm thử trên di động (Chrome/Edge DevTools: 360–430px)

Kết quả kỳ vọng:
- [ ] Toàn bộ luồng khách → đặt món → thanh toán → theo dõi hoạt động mượt
- [ ] Giao diện nhất quán, nhấn mạnh tông kem/nâu, bóng đổ mềm (shadow-soft)

## Phase 2 — Management (Quản trị)
- [ ] Admin Dashboard:
  - [ ] Danh sách đơn hàng (lọc theo trạng thái)
  - [ ] Nhận dạng đơn Tiền mặt (Cam) / Chuyển khoản (Vàng)
  - [ ] Duyệt ảnh bill (mở xem, phóng to), xác nhận đối chiếu
  - [ ] Hành động: Duyệt / Hủy (kèm lý do)
  - [ ] Âm báo khi có đơn mới (“Ting” sau thao tác người dùng để xin quyền âm thanh)
- [ ] Quản lý Menu (Ẩn/Hiện món, chỉnh giá nhanh)
- [ ] Báo cáo đơn hàng ngày (xuất Excel)
- [ ] Phân quyền cơ bản (mật khẩu vào khu vực quản trị)

Kết quả kỳ vọng:
- [ ] Quy trình kiểm duyệt đơn rõ ràng, giảm sai sót xác nhận thanh toán
- [ ] Vận hành quán trơn tru: quản lý tồn & danh mục hiệu quả

## Phase 3 — Integration (Tích hợp & Bảo mật)
- [ ] Kết nối Firebase Realtime Database / Firestore:
  - [ ] Đồng bộ đơn giữa Khách ↔ Admin theo thời gian thực
  - [ ] Lưu trữ đơn hàng, trạng thái, metadata ảnh bill
- [ ] Push Notifications (Web Push) cho Admin khi có đơn mới / khách cập nhật
- [ ] Củng cố bảo mật:
  - [ ] Rate limiting đặt đơn (≤2 đơn / 5 phút / thiết bị)
  - [ ] XSS/CSRF hardening theo SECURITY_POLICY
  - [ ] Kiểm tra & giới hạn loại file, dung lượng ảnh upload
- [ ] Tối ưu bundle & tài nguyên (ảnh, lazy-load, Tailwind build cho production)

Kết quả kỳ vọng:
- [ ] Trải nghiệm thời gian thực và thông báo đẩy ổn định
- [ ] Hệ thống bảo mật đủ tiêu chuẩn vận hành

