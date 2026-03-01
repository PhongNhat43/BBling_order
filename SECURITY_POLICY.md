# SECURITY_POLICY.md — Quy tắc bảo mật & an toàn

## Mục tiêu
- Bảo vệ dữ liệu, tránh crash, giảm rủi ro XSS/CSRF/Leak key.

## Nguyên tắc chung
- Không commit API Key/Secret vào repo. Nếu bắt buộc dùng API công khai:
  - Dùng server trung gian để ký/gói; không gọi bằng key từ trình duyệt.
  - Với bản demo tĩnh: chỉ dùng endpoint không yêu cầu key hoặc mock.
- Kiểm soát dữ liệu đầu vào: “Không tin dữ liệu từ người dùng”.
- Tách try/catch cho tác vụ IO (fetch, FileReader, storage).

## Xử lý lỗi an toàn
- Bao bọc khối bất định bằng try/catch và hiển thị thông báo thân thiện.
- Không lộ stack trace hay nội dung nhạy cảm ra UI.
- Fallback UI: skeleton/loading; khi lỗi, cho phép retry.

## Chống XSS & DOM Injection
- Không dùng innerHTML với string do người dùng nhập; dùng textContent.
- Khi cần render HTML từ bên ngoài, phải sanitize (ví dụ DOMPurify) — chỉ thêm khi thư viện được đưa vào dự án; nếu chưa có, tránh nhu cầu này.
- Escape thuộc tính khi chèn vào template (e.g., data-attr).

## Storage & Redirect
- sessionStorage/localStorage: lưu dữ liệu không nhạy cảm (cart, lựa chọn UI).
- Khi đọc từ storage/URLSearchParams, validate kiểu dữ liệu, giới hạn độ dài.
- Redirect giữa các trang: encodeURIComponent tham số, không ghép chuỗi thẳng.

## Tải file & Ảnh người dùng
- Kiểm tra loại file (accept, type), giới hạn dung lượng.
- Đọc bằng FileReader trong try/catch; không giữ tham chiếu lâu hơn cần thiết.
- Khi upload lên cloud: đặt quyền truy cập tối thiểu cần thiết.

## Mạng & API
- Sử dụng HTTPS; kiểm tra lỗi mạng và timeout.
- Retry có giới hạn, backoff đơn giản nếu cần.
- Không log response chứa thông tin nhạy cảm.

## Âm thanh & Quyền người dùng
- Chỉ phát âm khi có thao tác người dùng (click) để tuân thủ chính sách trình duyệt.
- Không yêu cầu quyền không cần thiết.

