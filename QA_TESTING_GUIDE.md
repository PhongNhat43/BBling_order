# QA_TESTING_GUIDE.md — Quy tắc Kiểm thử & Debug

## Mục tiêu
- Đảm bảo mọi tính năng chạy mượt, không lỗi trước khi khách nhìn thấy.

## Checklist trước khi push
- Giao diện:
  - Header sticky + blur hiển thị đúng trên Chrome/Edge di động.
  - Item card: thumbnail, border dashed, spacing chuẩn.
  - Modal sản phẩm mở/đóng mượt, không giật.
- Chức năng:
  - Click item/“+” mở Modal, chọn tùy chọn, thay đổi số lượng, ghi chú → Thêm vào giỏ.
  - Bottom Sheet hiển thị đúng options, ghi chú và cộng tiền.
  - ORDER NOW → chuyển payment.html?bill&amount&content đúng.
  - payment.html → xác nhận → tracking.html?orderId={bill}.
  - tracking.html → auto simulateSuccess sau 5s; có thể gọi window.simulateSuccess().
  - Admin login → dashboard; dashboard có đơn mẫu, chat hoạt động, nút Duyệt/Hủy/Hoàn thành.
  - Xuất báo cáo ngày: tạo file Excel với dữ liệu đơn.
  - Liên kết đến Menu Management hoạt động.
- Bảo mật:
  - Không dùng innerHTML với dữ liệu người dùng.
  - Tham số URL được encode, validate số tiền.
  - Thử nhập ghi chú dài/ký tự lạ: UI không vỡ, không crash.
- Hiệu năng:
  - Cuộn mượt, không block UI khi chọn ảnh.
  - Ảnh placeholder có tham số kích thước vừa phải.

## Cách giả lập lỗi để test
- Mạng: bật chế độ Offline trong DevTools, kiểm tra phản hồi UI khi tải ảnh/QR thất bại.
- Storage: xóa sessionStorage, mở tracking với orderId bất kỳ → fallback demo hoạt động.
- Ảnh upload: thử file > 5MB, file sai định dạng → giao diện xử lý hợp lý.
- Tham số URL: nhập amount không hợp lệ, thiếu bill → hiển thị hợp lý hoặc dùng mặc định.

## Kiểm tra trên Mobile
- Kiểm tra trên iPhone/Android (DevTools Responsive, tầm 360–430px).
- Khả năng thao tác một tay: nút quan trọng thuận ngón cái (ORDER NOW, xác nhận).
- Kiểm tra độ tương phản (text #3E2723 trên nền #F2E8DF).
- Test chạm phủ: bấm ngoài Modal để không đóng nhầm; nút tăng/giảm đủ lớn.

## Quy trình Debug nhanh
1. Mở DevTools → Console: đảm bảo không có error/red.
2. Network tab: xác nhận QR/img trả 200; khi lỗi, có thông báo thân thiện.
3. Kiểm tra event handlers: click vào item/“+” có mở Modal, log nhẹ khi cần.
4. Trước khi push: xóa console.log tạm, rà soát try/catch chính.

