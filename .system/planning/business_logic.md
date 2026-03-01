📝 B.BLING - BUSINESS LOGIC & PRODUCT PLANNING 

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW) 
- Tên thương hiệu: B.BLING Coffee & Eatery 
- Phong cách thiết kế: Vintage Minimalist (Nền kem #F2E8DF, Chữ nâu #3E2723). 
- Mô hình: Web-app đặt món tại chỗ/mang về, xác thực thanh toán thủ công qua Admin. 

## 2. LUỒNG NGHIỆP VỤ KHÁCH HÀNG (CUSTOMER FLOW) 
### A. Màn hình Trang chủ (Menu & Selection) 
- Hiển thị: Menu chia theo danh mục (Cà phê, Trà, Bánh...). Mỗi món có ảnh thumbnail, tên, giá và mô tả. 
- Tương tác: Click vào món -> Mở Product Detail Modal. 
- Trong Modal: Chọn Options (Đường/Đá/Topping), chọn số lượng (+/-). 
- Bấm "Thêm vào giỏ" -> Lưu vào localStorage. 
- Giỏ hàng: Hiển thị tổng số tiền và danh sách món đã chọn ở thanh dưới cùng (Bottom Bar). 

### B. Luồng Thanh toán mới (New Payment Flow) - [MỚI CẬP NHẬT] 
#### Bước 1: Thu thập thông tin: 
- Form bắt buộc: Tên khách hàng, Số điện thoại (Validation 10 số). 
- Tùy chọn: Địa chỉ giao hàng hoặc Số bàn. 

#### Bước 2: Hình thức thanh toán: 
- Lựa chọn 1 - Tiền mặt (Cash): Gán trạng thái đơn: unverified_cash. 
  - Hiển thị thông báo: "Nhân viên sẽ gọi điện xác nhận đơn hàng của bạn". 
- Lựa chọn 2 - Chuyển khoản (Online Transfer): 
  - Hiển thị mã VietQR động (Số tiền = Tổng giỏ hàng). 
  - Nút "Tải lên biên lai": Khách chụp/chọn ảnh bill chuyển khoản. 
  - Hiển thị ảnh Preview sau khi tải lên. 

#### Bước 3: Hoàn tất: 
- Lưu đơn hàng vào hệ thống với trạng thái Pending (Chờ duyệt). 

### C. Theo dõi đơn hàng (Order Tracking) 
- Hiển thị tiến trình đơn hàng theo thời gian thực (giả lập hoặc qua Firebase): 
  - Chờ xác nhận -> Đang pha chế -> Hoàn thành/Đang giao. 

## 3. LUỒNG NGHIỆP VỤ QUẢN TRỊ (ADMIN FLOW) 
### A. Dashboard Điều phối 
- Nhận thông báo khi có đơn hàng mới (Âm thanh "Ting"). 
- Phân loại đơn hàng: 
  - Màu Cam: Đơn tiền mặt (Cần gọi điện xác nhận). 
  - Màu Vàng: Đơn chuyển khoản (Cần kiểm tra ảnh Bill đối chiếu với tài khoản ngân hàng). 
- Hành động: 
  - Nút [Duyệt đơn]: Chuyển trạng thái đơn sang "Đang pha chế". 
  - Nút [Hủy đơn]: Nhập lý do (Hết món/Spam). 

### B. Quản lý Menu (Back-office) 
- Ẩn/Hiện món ăn theo tình trạng kho hàng thực tế. 
- Cập nhật giá món nhanh chóng. 

## 4. CHIẾN LƯỢC CHỐNG SPAM & BẢO MẬT (ANTI-SPAM) 
- Rate Limiting: Một thiết bị (IP/Cookie) không được đặt quá 2 đơn trong vòng 5 phút. 
- Manual Verification: Nhân viên là chốt chặn cuối cùng. Chỉ khi nhân viên bấm "Duyệt", đơn hàng mới được tính là hợp lệ và bắt đầu sản xuất. 
- Chatbot Support: Tích hợp nút Chat 1-1 để khách hàng có thể gửi ảnh bill bổ sung hoặc hỏi đáp trực tiếp nếu gặp sự cố thanh toán. 

## 5. KẾ HOẠCH PHÁT TRIỂN (ROADMAP) 
- Phase 1 (UI/UX): Hoàn thiện giao diện Menu, Modal chi tiết, và Trang thanh toán mới. 
- Phase 2 (Logic): Tách file JS, xử lý lưu trữ localStorage và luồng chuyển trang. 
- Phase 3 (Backend): Kết nối Firebase Realtime Database để Admin và Khách nhận thông báo ngay lập tức. 
- Phase 4 (Final Touch): Tối ưu tốc độ tải ảnh, bảo mật XSS và kiểm thử lỗi trên các thiết bị di động.

## 6. CẬP NHẬT THỰC THI (IMPLEMENTATION NOTES)
- Payment:
  - Thu thập Tên, SĐT (regex 0xxxxxxxxx/+84xxxxxxxxx), Địa chỉ (>=5 ký tự).
  - Địa điểm tùy chọn (Tỉnh/Thành → Quận/Huyện → Phường/Xã) với dữ liệu mẫu cho Bắc Ninh (Từ Sơn, Tiên Du, Yên Phong) và Hà Nội (Đông Anh, Gia Lâm).
  - Phương thức:
    - Tiền mặt → status: `unverified_cash`.
    - Chuyển khoản → hiển thị VietQR + bắt buộc upload ảnh biên lai → status: `pending_transfer`.
  - “Nhắn tin ngay” mở chat ngay trên trang thanh toán (không rời trang).
  - Copy Mã đơn/Số tiền có toast xác nhận.
- Tracking:
  - Hiển thị badge phương thức (Tiền mặt/Chuyển khoản), thông tin khách (Tên · SĐT · Địa chỉ · Địa điểm nếu có).
  - Danh sách món có ảnh thumbnail; tổng tiền.
  - Mô phỏng tiến trình:
    - pending → (15% xác suất) fail; nếu fail:
      - Transfer: “Xác minh chuyển khoản thất bại” (ảnh biên lai chưa hợp lệ/không khớp).
      - Cash: “Không thể xác nhận đơn tiền mặt” (không liên hệ được).
    - Nếu không fail: “Đang pha chế...” → completed.
- Ngôn ngữ giao diện:
  - Tuân thủ .system/rules/DEVELOPMENT_RULE.md: không dùng tiếng Anh cho text UI (ví dụ “Theo dõi”, “Tải ảnh”).

## 7. TRẠNG THÁI & CHUYỂN TRẠNG (STATE MACHINE)
Trạng thái: `unverified_cash` | `pending_transfer` | `processing` | `completed` | `canceled` | `failed`

- Tạo đơn (Cash):
  - → `unverified_cash` → (Admin xác nhận) → `processing` → `completed`
  - Có thể `canceled` nếu khách hủy/không liên hệ được.
- Tạo đơn (Transfer):
  - Yêu cầu ảnh biên lai → `pending_transfer` → (Admin đối chiếu) → `processing` → `completed`
  - Có thể `failed` (xác minh thất bại) hoặc `canceled` (không hợp lệ).

## 8. DỮ LIỆU ĐƠN HÀNG (CLIENT-SIDE DEMO)
```json
{
  "id": "BILL123456",
  "items": [{ "id":"coffee-black", "name":"Black Coffee", "img":"...", "priceK":29, "qty":1 }],
  "totalK": 29,
  "totalVND": 29000,
  "method": "cash|transfer",
  "status": "unverified_cash|pending_transfer|processing|completed|canceled|failed",
  "customer": {
    "name": "Nguyễn Văn A",
    "phone": "0987654321",
    "address": "Số 1, Đường A",
    "city": "Bắc Ninh",
    "district": "Từ Sơn",
    "ward": "Phường Đông Ngàn"
  }
}
```
