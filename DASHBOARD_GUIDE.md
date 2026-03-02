# Hướng Dẫn Sử Dụng - Dashboard Admin Mới

## 📋 Tổng Quan Refactor

Dashboard admin đã được refactor thành **3 tab chuyên biệt**:

| Tab | Chức Năng | Luồng |
|-----|-----------|-------|
| **📋 Đơn hàng** | Danh sách + Filter | Hiển thị tất cả đơn, bấm để xem chi tiết |
| **ℹ️ Chi tiết** | Thông tin Order + Actions | Hiển thị khi bấp vào một order từ tab "Đơn hàng" |
| **💬 Chat** | Nhắn tin với khách | Bên trái: danh sách, bên phải: tin nhắn + send |
| **🍽️ Menu** | Quản lý menu | Thêm/sửa/xóa món và danh mục |
| **📈 Báo cáo** | Thống kê | Xuất Excel... |

---

## 🔄 Luồng Sử Dụng Chi Tiết

### Scenario 1: Admin xem danh sách đơn và quản lý

```
START
  ↓
Trang mở → Tab "Đơn hàng" (active)
  ├─ Hiển thị danh sách tất cả orders
  ├─ Có filter: status, method, date, search
  └─ Mỗi order là một card clickable
  
User bấm vào một order card
  ↓
renderDetailTab() được gọi
  ├─ Chi tiết order được prepare
  └─ Tab tự động switch sang "Chi tiết"
  
Tab "Chi tiết" hiển thị:
  ├─ 📋 Đơn #BILLXXXXXXX [TM/CK] [Status Badge]
  ├─ 📅 Thời gian: ...
  ├─ 👤 Khách: Name · Phone
  ├─ 📍 Địa chỉ: ...
  ├─ 🛍️ Danh sách sản phẩm
  │   ├─ Coffee x2 · 29k đ
  │   ├─ Tea x1 · 39k đ
  │   └─ Tổng cộng: 97.000đ
  ├─ 📸 Ảnh biên lai (nếu transfer)
  ├─ 📝 Ghi chú (nếu có)
  └─ [Thất bại] [Hủy] [Duyệt] [Hoàn thành]

Admin bấm một trong các nút hành động:
  ├─ "Duyệt" → Status: processing
  ├─ "Hoàn thành" → Status: completed
  ├─ "Hủy" → Status: canceled
  └─ "Thất bại" → Status: failed
  
Status được cập nhật:
  ├─ Firebase/Database được update
  ├─ Detail tab được refresh - status badge thay đổi
  ├─ Orders list được refresh
  └─ Threads list được refresh
```

### Scenario 2: Admin nhắn tin với khách

```
START
  ↓
Bấp vào Tab "Chat"
  ├─ Sidebar trái: Danh sách "Đơn hàng cần xử lý"
  │   └─ N đơn chờ xác nhận/xác minh
  │
  └─ Main area phải: Trống (chờ chọn)
     ├─ Icon 💬 + "Chọn một đơn hàng..."
     └─ Input disabled
  
Bấn vào một order trong danh sách (sidebar):
  ↓
renderDetail() được gọi
  ├─ Chat messages listener được set up
  └─ Tin nhắn được render
  
Main area phải hiển thị:
  ├─ Chat log (scroll history)
  │   ├─ Customer: "Xin hỏi còn café không?" (left, gray)
  │   ├─ Admin: "Còn, xin chờ 5 phút" (right, orange)
  │   └─ ...
  │
  └─ Input section (enabled):
     ├─ [Đã xác minh, đơn đang pha chế] (quick reply)
     ├─ [Đơn đã xác nhận. Cảm ơn!] (quick reply)
     ├─ [Vui lòng chờ] (quick reply)
     │
     └─ Chat input line:
        ├─ 💬 Input field
        ├─ 📷 Upload image button
        └─ [Gửi] button

Admin gõ message + bấm "Gửi":
  ├─ Message được gửi lên Firebase
  ├─ Message listener nhận được → Render
  ├─ Tin nhắn mới hiện ở chat log (right, orange)
  └─ Scroll tự động xuống cuối

Admin muốn gửi quick reply:
  ├─ Bấp nút quick reply
  ├─ Message được gửi luôn (không cần gõ)
  └─ Hiện ở chat log ngay

Admin upload ảnh/hình:
  ├─ Bấp 📷 button
  ├─ Chọn ảnh từ computer
  ├─ Ảnh được upload lên Firebase Storage
  ├─ Message với image type được tạo
  ├─ Chat log hiển thị ảnh (clickable = open full size)
  └─ Khách thấy ảnh trên mobile
```

### Scenario 3: Khi order thay đổi trạng thái

```
Nếu order có tin nhắn chờ:
  ├─ Thread list sidebar hiển thị unread indicator (pulse dot)
  └─ Admin bấm vào → Coi tin nhắn

Nếu có order chuyển sang status chờ xác nhận:
  ├─ Order count "N đơn" được cập nhật
  ├─ Order hiện trong threads list
  └─ Admin có thể duyệt ngay
```

---

## 🎨 UI Layout

### Desktop View (md+)

```
┌─────────────────────────────────────────────────┐
│ Header: B.BLING Quản trị | Về trang khách       │
├─────────────────────────────────────────────────┤
│ Tabs: [📋 Đơn] [ℹ️ Chi] [💬 Chat] [🍽️ Menu] [📈 Báo] [⚙️ Cài]│
├──────────────────────────────────┐──────────────┤
│ TAB: Đơn hàng                    │              │
│ [Filter] [Xuất] [Bật âm]         │              │
│                                  │              │
│ Order 1 ─────────────────────    │              │
│ Order 2 ─────────────────────    │              │
│ Order 3 ─────────────────────    │ (Tab không   │
│ Order 4 ─────────────────────    │  hiện)       │
│ ... (scroll)                     │              │
│                                  │              │
└──────────────────────────────────┴──────────────┘

┬─────────────────────────────────────────────────┐
│ TAB: Chi tiết                                   │
│ ┌─ Order header                                │
│ │ 📋 Đơn #BILLXXX [TM] [Processing]           │
│ │ 📅 2026-03-02 16:45                         │
│ │ 👤 Nguyễn Văn A · 0912345678               │
│ ├─ Address                                     │
│ │ 📍 Quận 1, TP.HCM                          │
│ ├─ Items                                       │
│ │ 🛍️ Black Coffee x2 · 29k = 58k            │
│ │    Tea Lotus x1 · 39k = 39k                │
│ │    Tổng: 97.000đ                           │
│ ├─ Bill preview (if transfer)                 │
│ │ 📸 [image preview]                         │
│ ├─ Notes (if any)                            │
│ │ 📝 Ít đá, không topping                    │
│ └─ Actions                                    │
│    [Thất bại] [Hủy] [Duyệt] [✓ Hoàn thành]   │
│                                                │
└────────────────────────────────────────────────┘

┬─────────────────────────────────────────────────┐
│ TAB: Chat                                       │
│ ┌────────────────┬──────────────────────────    │
│ │ Threads       │  Chat Messages               │
│ │ (3 đơn chờ)   │                              │
│ │               │ ┌─ Customer:                 │
│ │ #BILL123 ✓    │ │ "Còn cái nào không?"      │
│ │ Customer name │ │                            │
│ │ "Xin hỏi..."  │ ├─ Admin:                    │
│ │               │ │ "Còn, chờ 5 phút nhé"     │ 
│ │ #BILL124      │ │                            │
│ │ Name name     │ ├─ Customer:                 │
│ │ "Ảnh biên lai"│ │ [📷 receipt.png]          │
│ │               │ │                            │
│ │ #BILL125      │ └─ (scroll history)         │
│ │ ...           │                              │
│ │ (scroll)      │ ┌─ Quick replies            │
│ │               │ │ [Đã xác minh] [Cảm ơn]   │
│ │               │ │ [Vui lòng chờ]           │
│ │               │ ├─ Input                     │
│ │               │ │ [💬 Gõ...] [📷] [Gửi]   │
│ │               │ │                            │
│ └────────────────┴──────────────────────────────│
└────────────────────────────────────────────────┘
```

---

## 💻 Mobile View (xs-sm)

- Tabs: Stack horizontal, scrollable
- Each section takes full width
- Sidebar in Chat tab becomes dropdown (or stack)
- Action buttons wrap or become full-width

---

## 🔧 Technical Changes

### Files Modified

1. **admin-dashboard.html**
   - Added new Tab "Chi tiết" (Detail)
   - Restructured Tab "Chat" (Messaging only)
   - Removed order detail info from Chat tab
   - Updated navigation buttons with emojis

2. **admin.js**
   - Added `renderDetailTab()` function
   - Modified `renderDetail()` to only render chat messages
   - Updated `renderOrders()` to switch to detail tab on click
   - Modified `renderThreads()` for chat sidebar only
   - Updated `setupOrdersListener()` to call both render functions
   - Fixed `updateStatus()` to refresh both detail and threads

### Function Responsibilities

```javascript
// BEFORE:
renderDetail()  ← Mixed: order info + chat messages

// AFTER:
renderDetailTab()  ← Order info, status, items, bill, buttons
renderDetail()     ← Chat messages only
renderThreads()    ← Chat threads sidebar (unread dots, last message preview)
renderOrders()     ← Order list with filters
```

### Event Flow

```
| User Action | Handler | Functions Called |
|---|---|---|
| Click order in list | card.addEventListener | renderDetailTab() + showTab('detail') |
| Update status | btn-approve/done/cancel/fail | updateStatus() → renderDetailTab() + renderThreads() |
| Click thread in chat | thread.addEventListener | renderDetail() (messages only) |
| Send message | chat-send.addEventListener | db.add() → renderDetail() (auto via listener) |
| Upload image | chat-upload.addEventListener | FileReader → db.add() → renderDetail() |
| Click quick reply | quick-reply.addEventListener | db.add() → renderDetail() |
| Tab switch | tab.addEventListener | showTab() → updateTab visibility |
```

---

## ✅ Checklist: Verification

- [x] HTML tabs properly separated (Đơn hàng, Chi tiết, Chat, Menu, Báo cáo, Cài đặt)
- [x] Detail tab shows: bill info, customer, items, bill preview, notes, action buttons
- [x] Chat tab shows: threads sidebar + messages + input
- [x] Clicking order → auto switch to detail tab
- [x] Action buttons (Duyệt, Hoàn thành, Hủy, Thất bại) work in detail tab
- [x] Chat messages render correctly in chat tab
- [x] Quick replies work
- [x] Upload image works
- [x] No syntax errors
- [x] Tab switching works correctly

---

## 🚀 Testing Instructions

### Test 1: Basic Order Management
1. Open admin dashboard
2. Go to "Đơn hàng" tab
3. Click any order → Should switch to "Chi tiết" tab
4. Verify order details display correctly
5. Click "Duyệt" → Status should change to "processing"
6. Verify detail and threads list update

### Test 2: Chat Functionality
1. Go to "Chat" tab
2. Sidebar should show list of orders
3. Click an order in sidebar
4. Chat messages should appear in main area
5. Type message + click "Gửi"
6. Message should appear as admin message (right-aligned, orange)
7. Test quick replies
8. Test image upload

### Test 3: Tab Switching
1. Switch between tabs rapidly
2. Selected order should be remembered
3. Detail/Chat content should update when switching back

### Test 4: Status Badges
1. Order detail should show current status with proper color
2. When status changes, badge should update immediately
3. Action buttons should enable/disable based on current status

---

## 📝 Notes

- **Detail Tab**: Read-only information + Order actions
- **Chat Tab**: Pure messaging - no order management visible
- **Consistency**: Admin can switch between Detail and Chat for same order
- **Real-time**: Firebase listeners auto-update both tabs
- **Status Transitions**:
  - unverified_cash / pending_transfer → processing (via "Duyệt")
  - processing → completed (via "Hoàn thành")
  - Any → canceled (via "Hủy")
  - Any → failed (via "Thất bại")

---

**Generated**: 2 tháng 3, 2026
**Version**: v20260302-1
