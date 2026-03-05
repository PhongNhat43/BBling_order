# QUY TẮC PHÁT TRIỂN DỰ ÁN B.BLING

## 1. BẢNG MÀU CHUẨN (Design Tokens)
Tất cả các thành phần UI phải sử dụng đúng mã màu này (Cấu hình trong tailwind.config.js):

- Primary (Nâu Cafe): #3E2723 (Dùng cho Text chính, Button, Sidebar).
- Background (Kem Vintage): #F2E8DF (Nền toàn trang).
- Accent (Cam Đất): #C2410C (Bong bóng chat, Thông báo quan trọng).
- Success (Xanh Lá): #16A34A (Trạng thái đã thanh toán).
- Paper Texture: Sử dụng overlay nhẹ để tạo cảm giác giấy cũ nhám.

## 2. QUY TẮC ĐẶT TÊN (Naming Convention)
- Component/File: Sử dụng kebab-case cho file HTML (vd: payment-status.html).
- CSS Class: Ưu tiên Utility classes của Tailwind. Nếu viết CSS riêng, dùng tiền tố bb- (vd: .bb-menu-item).
- Biến Javascript: camelCase (vd: currentOrderId, totalAmount).

## 3. CẤU TRÚC DỮ LIỆU FIRESTORE (Schema)
Tuyệt đối tuân thủ cấu trúc để Admin và Khách đồng bộ được:

- Collection orders:

```json
{
  "id": "BILL + timestamp",
  "items": [{ "id": "", "name": "", "priceK": 0, "qty": 0, "img": "" }],
  "totalK": 0,
  "totalVND": 0,
  "method": "cash | transfer",
  "status": "unverified_cash | pending_transfer | processing | completed | failed | canceled",
  "customer": {
    "name": "", "phone": "", "address": "",
    "city": "", "district": "", "ward": ""
  },
  "note": "Ghi chú của khách",
  "billUrl": "URL ảnh biên lai (chỉ khi method = transfer)",
  "createdAt": "serverTimestamp"
}
```

**Giải nghĩa trạng thái (`status`):**
- `unverified_cash` – Khách chọn tiền mặt, chờ Admin xác nhận
- `pending_transfer` – Khách đã chuyển khoản, chờ Admin xác minh biên lai
- `processing` – Admin đã duyệt, đang pha chế / chuẩn bị
- `completed` – Đơn hoàn thành
- `failed` – Đơn thất bại (lỗi, sai thông tin...)
- `canceled` – Admin hoặc khách hủy đơn

- Collection guestChats:

```json
{
  "sessionId": "GUEST_timestamp_randomId",
  "createdAt": "serverTimestamp",
  "lastMessageAt": "serverTimestamp"
}
```

**Sub-collection messages** (dùng chung cho orders và guestChats):

```json
{
  "from": "customer | admin",
  "type": "text | image",
  "content": "Nội dung text hoặc base64 image",
  "createdAt": "serverTimestamp"
}
```

**Quy tắc Chat:**
- Khách chat ở index.html → lưu vào `guestChats/{sessionId}/messages`
- Khách chat sau khi đặt hàng → lưu vào `orders/{orderId}/messages`
- Admin tab Chat hiển thị cả 2 loại, phân biệt bằng icon 👤 (guest) và 📦 (order)

## 4. QUY TẮC REAL-TIME & SOUND
- Admin Page: Phải có cơ chế User Interaction (click bất kỳ đâu) trước khi kích hoạt âm thanh báo động (do chính sách trình duyệt).
- Khách Page: Luôn hiển thị Skeleton Loading khi trạng thái là verifying để giảm lo âu cho khách.

## 5. NGÔN NGỮ GIAO DIỆN (UI Copy)
- Tất cả văn bản hiển thị trên giao diện phải sử dụng tiếng Việt thuần (ngoại trừ tên thương hiệu B.BLING).
- Tránh dùng thuật ngữ tiếng Anh như “Upload”, “Tracking” trên UI; thay bằng “Tải ảnh”, “Theo dõi”.
- Nội dung ngắn gọn, lịch sự, ưu tiên giọng điệu hướng dẫn thân thiện.
