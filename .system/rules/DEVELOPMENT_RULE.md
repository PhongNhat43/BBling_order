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
  "items": [],
  "total": 0,
  "status": "pending | verifying | paid | processing | completed",
  "note": "Ghi chú của khách",
  "createdAt": "serverTimestamp"
}
```

## 4. QUY TẮC REAL-TIME & SOUND
- Admin Page: Phải có cơ chế User Interaction (click bất kỳ đâu) trước khi kích hoạt âm thanh báo động (do chính sách trình duyệt).
- Khách Page: Luôn hiển thị Skeleton Loading khi trạng thái là verifying để giảm lo âu cho khách.

## 5. NGÔN NGỮ GIAO DIỆN (UI Copy)
- Tất cả văn bản hiển thị trên giao diện phải sử dụng tiếng Việt thuần (ngoại trừ tên thương hiệu B.BLING).
- Tránh dùng thuật ngữ tiếng Anh như “Upload”, “Tracking” trên UI; thay bằng “Tải ảnh”, “Theo dõi”.
- Nội dung ngắn gọn, lịch sự, ưu tiên giọng điệu hướng dẫn thân thiện.
