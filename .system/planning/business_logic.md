📝 B.BLING - BUSINESS LOGIC & PRODUCT PLANNING 

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW) 
- Tên thương hiệu: B.BLING Coffee & Eatery 
- Phong cách thiết kế: Vintage Minimalist (Nền kem #F2E8DF, Chữ nâu #3E2723). 
- Mô hình: Web-app đặt món tại chỗ/mang về, xác thực thanh toán thủ công qua Admin. 

## 2. LUỒNG NGHIỆP VỤ KHÁCH HÀNG (CUSTOMER FLOW) 
### A. Màn hình Trang chủ (Menu & Selection) 
- Hiển thị: Menu chia theo danh mục (Kinu, Coffee, Dessert...). Mỗi món có ảnh, tên, mô tả, giá và tag (Mới, khác biệt). 
- Tương tác: Click vào món -> Mở Product Detail Modal. 
- Trong Modal: Chọn kích cỡ (Size), số lượng (+/-), ghi chú riêng. 
- Bấm "Thêm vào giỏ" -> Lưu vào sessionStorage với mã bill. 
- Giỏ hàng: Floating bar dưới cùng hiển thị tổng số tiền, danh sách món, nút Xác nhận. 
- Support: Hotline (0985.679.565) và Chat floating button ở góc phải. 

### B. Luồng Thanh toán (Payment Flow) 
#### Bước 1: Thông tin khách hàng (Bắt buộc): 
- Tên khách hàng 
- Số điện thoại (Định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx). 
- Địa chỉ giao hàng (>=5 ký tự). 
- Vị trí ghim bản đồ (**Bắt buộc** để kiểm tra bán kính 2km). 

#### Bước 2: Hình thức thanh toán: 
- **🏦 Chuyển khoản (Online Transfer) - phương thức duy nhất**: 
  - Ẩn/khóa toàn bộ khu vực VietQR và nút tải biên lai ở trạng thái ban đầu. 
  - Chỉ mở khóa sau khi khách ghim vị trí thành công và hệ thống xác nhận khoảng cách <= 2km. 
  - Nếu khoảng cách > 2km: hiển thị cảnh báo đỏ và **không cho thanh toán**. 
  - Hiển thị mã **VietQR (Napas 24/7)** với số tiền tự động. 
  - Nút "**Tải lên biên lai**": Khách tải ảnh bill (JPEG, PNG, WebP, max 5MB). 
  - Hiển thị ảnh Preview sau khi tải lên. 
  - Gán trạng thái đơn `pending_transfer`. 
- **Nút bổ sung**: Copy Mã đơn + Copy Số tiền (kèm Toast xác nhận). 
- **Liên hệ**: Nút Chat ngay hoặc Gọi hotline nếu cần hỗ trợ. 

#### Bước 3: Hoàn tất: 
- Lưu đơn hàng vào Firestore với trạng thái tương ứng. 
- Bắt buộc lưu thêm `distance` (km) và `coordinates` ({lat, lng}) cho mỗi đơn. 
- Khách được hiển thị Mã đơn để theo dõi. 

### C. Theo dõi đơn hàng (Order Tracking) 
- **Status Hero** với icon + label rõ ràng: 
  - ⏳ Xác minh thanh toán (pending_transfer). 
  - 🛵 Đang giao hàng (processing). 
  - ✓ Hoàn thành (completed). 
  - ✗ Thất bại / Huỷ (failed / canceled). 
- **Thông tin chi tiết**: Mã đơn (copy được), phương thức thanh toán, tên/SĐT/Địa chỉ khách. 
- **Danh sách sản phẩm** với hình ảnh thumbnail, tên, giá từng cái. 
- **Tổng cộng** (VND). 
- **Action buttons**: Gọi hotline hoặc Nhắn tin support 24/7. 

## 3. LUỒNG NGHIỆP VỤ QUẢN TRỊ (ADMIN FLOW) 
### A. Dashboard Điều phối (6 Tabs)

**1️⃣ Tab Đơn hàng (📋 Orders)**
- Danh sách tất cả đơn hàng (sắp xếp ngược time). 
- **Phân loại đơn hàng theo status & màu**: 
  - 🟡 **Yellow** (pending_transfer): Chuyển khoản - Chờ xác minh biên lai. 
  - 🔵 **Blue** (processing): Đang giao hàng. 
  - 🟢 **Green** (completed): Hoàn thành. 
  - 🔴 **Red** (failed): Thất bại (xác minh thất bại hoặc không liên hệ được). 
  - ⚫ **Gray** (canceled): Đã hủy. 
- **Badges**: "Đơn mới" (unviewed) khi có đơn vừa tạo. 
- **Khoảng cách giao hàng**: hiển thị badge `📍 x.xx km` trên từng đơn để nhân viên nắm độ xa/gần. 
- **Lọc & Tìm kiếm**: Filter theo ngày, status, phương thức; tìm mã đơn/tên/SĐT. 
- **Hành động**: 
  - Xem chi tiết (mở Modal: sản phẩm, khách, bill upload nếu CK). 
  - Duyệt đơn: Chuyển `pending_transfer` → `processing`. 
  - Hủy đơn: Nhập lý do (Hết hàng / Spam / Khác). 
  - Thay đổi status thủ công (sau khi giao xong → completed). 

**2️⃣ Tab Chat (💬 Chat)** 
- Danh sách khách hàng có tin nhắn (mới nhất trên cùng). 
- Badges: "Chat mới" khi có tin nhắn chưa read. 
- Giao diện: Khách + Admin reply, lưu vào `guestChats` Firestore. 
- Thông báo: Telegram bot khi khách gửi tin mới. 

**3️⃣ Tab Menu (🍽️ Menu)** - **Chỉ Full Admin** 
- Quản lý danh mục (Kinu, Coffee, Dessert, v.v.). 
- Quản lý sản phẩm: Thêm/Sửa/Xóa, upload ảnh (auto-compress). 
- Ẩn/Hiện sản phẩm (theo tình trạng kho hàng). 
- Cập nhật giá nhanh. 

**4️⃣ Tab Báo cáo (📈 Report)** - **Chỉ Full Admin** 
- Thống kê đơn hàng: Hôm nay / Tuần này / Tháng này. 
- Tổng doanh số (VND), số lượng đơn, tỷ lệ hoàn thành. 
- Export báo cáo ngày. 

**5️⃣ Tab Cài đặt (⚙️ Settings)** - **Chỉ Full Admin** 
- Tên quán, Hotline, Địa chỉ. 
- **Cấu hình thanh toán**: 
  - Thông tin VietQR (Bank account, holder name). 
  - Telegram bot token (dùng gửi notification). 
- Lưu xong có hiệu lực ngay. 

**6️⃣ Tab Nhân viên (👥 Staff)** - **Chỉ Full Admin** 
- Danh sách admin/staff hiện tại. 
- Thêm nhân viên: Cấp role `staff` hoặc `admin`. 
- Xóa nhân viên (trừ bootstrap admin). 
- Hiển thị role badge: 👑 Admin / 👤 Staff. 

### B. Thông báo & Âm thanh 
- **Thông báo mới**: Âm thanh "Ting" + Badge "Đơn mới" khi có đơn hàng. 
- **Telegram Bot**: Đơn mới gửi theo format: `Đơn hàng mới - [Số tiền] - Cách quán [số km] km`. 
- **Nút Bật âm thanh**: Toàn cầu cho tất cả thông báo mới. 

## 4. ROLE & QUYỀN HẠN (ROLE SYSTEM) 

### A. Ba mức quyền: 
- **👑 Admin** (`role: 'admin'`) - **Toàn quyền**: Quản lý menu, settings, staff, xem reports. 
- **👑 Super Admin** (`role: 'super_admin'`) - **Toàn quyền** (dành cho bootstrap admin). 
- **👤 Staff** (`role: 'staff'`) - **Quyền hạn chế**: 
  - ✅ Xem đơn hàng và duyệt đơn. 
  - ✅ Gửi/nhận tin chat với khách. 
  - ❌ **KHÔNG** quản lý menu. 
  - ❌ **KHÔNG** xem/thay đổi cài đặt. 
  - ❌ **KHÔNG** quản lý nhân viên. 
  - ❌ **KHÔNG** xem báo cáo. 

### B. Bootstrap Admin (Admin gốc): 
- Email cố định: `phongnhat43@gmail.com` 
- Luôn có quyền `super_admin` bất kể Firestore trả về role gì (hard-coded). 
- Tài khoản đặc biệt này không thể bị xóa hoặc giáng quyền. 

### C. Firestore Security Rules: 
- `orders/`: Staff + Admin có thể đọc/ghi. 
- `menu/`: Chỉ Full Admin (+ Bootstrap) viết. 
- `guestChats/`: Staff + Admin reply. 
- `settings/`: Full Admin viết; `payment_config` public read. 
- `admin_users/`: Full Admin quản lý (thêm/xóa). 

## 5. CHIẾN LƯỢC CHỐNG SPAM & BẢO MẬT (ANTI-SPAM & SECURITY) 
- **Rate Limiting**: Firebase Firestore built-in (free tier: 1 triệu reads/day). 
- **Manual Verification**: Nhân viên là chốt chặn cuối cùng. Chỉ khi admin bấm "Duyệt", đơn hàng mới sang trạng thái `processing`. 
- **Biên lai chuyển khoản**: Admin kiểm tra ảnh upload, đối chiếu với account ngân hàng trước khi duyệt. 
- **Chat Support**: Tích hợp Chat 1-1 để khách có thể gửi ảnh thêm hoặc hỏi đáp nếu gặp sự cố. 
- **UI Protection**: Staff bị ẩn menu/settings/report bằng CSS + JS guards. Admin KHÔNG thể xóa bootstrap admin.

## 6. KẾ HOẠCH PHÁT TRIỂN (ROADMAP) 

**✅ Phase 1 (Hoàn thiện)**: Giao diện Menu, Modal chi tiết, Trang thanh toán, UI role-based. 

**✅ Phase 2 (Logic)**: sessionStorage bill, luồng chuyển trang, upload biên lai, Chat. 

**✅ Phase 3 (Backend)**: Firestore Realtime, Telegram bot notification, Admin dashboard. 

**✅ Phase 4 (Role & Security)**: 3-tier role system, Staff UI hiding, Settings/Menu access control. 

**🔄 Phase 5 (Cải thiện)** (Ưu tiên): 
- Rate limiting tùy chỉnh (per-device limit). 
- Audit log (ai sửa menu, ai duyệt đơn). 
- Multi-language support (EN/VI). 
- Mobile app version. 

**🔮 Phase 6 (Tương lai)** (Ưu tiên 3+): 
- Loyalty program (điểm quà). 
- AI chatbot tự động reply. 
- POS integration (máy bán hàng để cạnh tranh).

## 7. CHI TIẾT THỰC THI (IMPLEMENTATION DETAILS)

### Payment Flow Implementation:
  - Thu thập Tên, SĐT (regex 0xxxxxxxxx/+84xxxxxxxxx), Địa chỉ (>=5 ký tự).
  - Bắt buộc ghim vị trí để tính khoảng cách từ quán bằng công thức Haversine.
  - Chỉ chấp nhận chuyển khoản:
    - Nếu `distance > 2`: khóa thanh toán và hiển thị cảnh báo đỏ.
    - Nếu `distance <= 2`: mở khóa VietQR + upload biên lai → status: `pending_transfer`.
  - “Nhắn tin ngay” mở chat ngay trên trang thanh toán (không rời trang).
  - Copy Mã đơn/Số tiền có toast xác nhận.
  - Khi lưu Firestore: thêm `distance` và `coordinates`.
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

## 8. TRẠNG THÁI & CHUYỂN TRẠNG (STATE MACHINE)
Trạng thái: `pending_transfer` | `processing` | `completed` | `canceled` | `failed`

- Tạo đơn (Transfer):
  - Điều kiện bắt buộc: Ghim vị trí + `distance <= 2km` + upload biên lai.
  - Luồng chính: `pending_transfer` → (Admin đối chiếu) → `processing` → `completed`.
  - Luồng lỗi: `pending_transfer` → `failed` (biên lai không hợp lệ) hoặc `canceled` (khách hủy/không hợp lệ).

## 9. CẤU TRÚC DỮ LIỆU ĐƠN HÀNG (FIRESTORE COLLECTIONS)
```json
{
  "billCode": "BILL231009001",
  "method": "transfer",
  "status": "pending_transfer",
  "distance": 1.24,
  "coordinates": {
    "lat": 21.12012,
    "lng": 105.97123
  },
  "customer": {
    "name": "Nguyen Van A",
    "phone": "0987654321",
    "address": "So 1, Duong A"
  },
  "billUrl": "https://...",
  "totalVND": 58000,
  "createdAt": "serverTimestamp"
}
```
