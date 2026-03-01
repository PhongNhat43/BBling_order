# B.BLING — User Flow (Luồng Trải Nghiệm Người Dùng)

Giữ UX Vintage Minimalist, thao tác thuận tay, rõ ràng từng bước.

## Hành Trình Người Dùng
1) Truy cập Trang chủ
- [ ] Hiển thị danh mục & món (thumbnail, tên, giá, mô tả)

2) Chọn món & Tùy chỉnh
- [ ] Click card món → mở Modal chi tiết
- [ ] Chọn Options (đường/đá/topping), chọn số lượng
- [ ] [Thêm vào giỏ] → lưu giỏ (localStorage/sessionStorage)

3) Giỏ hàng (Bottom Sheet)
- [ ] Xem danh sách món, tăng/giảm, tổng tiền
- [ ] [Đặt hàng] → chuyển sang bước Thanh toán

4) Form Thanh toán
- [ ] Nhập Tên (bắt buộc), SĐT (10 số, ràng buộc định dạng)
- [ ] Nhập Địa chỉ giao hàng hoặc Số bàn (tùy chọn)
- [ ] Chọn hình thức thanh toán:
  - Tiền mặt (Cash)
  - Chuyển khoản (Online Transfer)

5) Chuyển khoản (nếu chọn)
- [ ] Hiển thị VietQR động theo tổng tiền
- [ ] [Tải ảnh biên lai] → hiển thị preview
- [ ] [Gửi đơn] chỉ khi đã có ảnh bill (quy định chuyển trạng thái phía dưới)

6) Xác nhận & Gửi đơn
- [ ] Lưu đơn với trạng thái ban đầu phù hợp
- [ ] Điều hướng tới Trang Theo dõi

7) Theo dõi đơn
- [ ] Xem tiến trình: Chờ xác nhận → Đang pha chế → Hoàn thành/Đang giao
- [ ] Chat 1-1 (gửi text/ảnh khi cần hỗ trợ)

8) Nhận hàng
- [ ] Hiển thị hướng dẫn nhận hàng / thông báo hoàn tất

## Quy Định Trạng Thái & Điều Kiện Chuyển
Trạng thái chính: `unverified_cash` | `pending_transfer` | `processing` | `completed` | `canceled`

- Tạo đơn Tiền mặt:
  - [ ] Khi người dùng chọn “Tiền mặt” và bấm Gửi đơn → trạng thái `unverified_cash`
  - [ ] Admin gọi điện xác nhận → chuyển `processing` hoặc `canceled` (nếu không liên hệ được)

- Tạo đơn Chuyển khoản:
  - [ ] Yêu cầu có ảnh bill (preview OK) trước khi cho phép [Gửi đơn]
  - [ ] Khi Gửi đơn → lưu `pending_transfer`
  - [ ] Admin đối chiếu giao dịch → chuyển `processing` (hợp lệ) hoặc `canceled` (sai/thiếu)

- Xử lý chung:
  - [ ] `processing` → Pha chế / Chuẩn bị → `completed` khi đã xong
  - [ ] Mọi trạng thái có thể chuyển `canceled` với lý do (hết món/spam)

## Kiểm Tra & Xác Thực
- [ ] SĐT 10 số (regex đơn giản) trước khi tạo đơn
- [ ] Ảnh bill: giới hạn định dạng (image/*), kích thước hợp lý
- [ ] Escape nội dung text (ghi chú, tin nhắn chat) bằng textContent
- [ ] Lưu & đọc storage an toàn (try/catch, validate)

