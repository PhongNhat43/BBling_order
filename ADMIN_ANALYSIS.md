# 📊 PHÂN TÍCH HỆ THỐNG QUẢN TRỊ (ADMIN DASHBOARD)

## 1. TỔNG QUAN HỆ THỐNG

### Kiến Trúc
- **Frontend**: HTML + Tailwind CSS + Vanilla JavaScript (admin.js)
- **Backend**: Firebase Firestore (Real-time Database)
- **Storage**: Firebase Cloud Storage (cho biên lai chuyển khoản, ảnh menu)
- **Trạng thái**: Hỗ trợ cả mode Firestore (production) và mode Local (dev/testing)

---

## 2. CÁC NGHIỆP VỤ QUẢN TRỊ HIỆN CÓ

### **TAB 1: QUẢN LÝ ĐƠN HÀNG (Orders)**

#### 2.1.1 Xem Danh Sách Đơn Hàng
**Flow:**
```
Admin vào trang → Redis all orders từ Firestore 
            ↓
Sort theo createdAt DESC (mới nhất trước)
            ↓
Render dưới dạng card (ID, thời gian, tổng tiền, hình thức, trạng thái)
            ↓
Click card → Mở chi tiết modal
```

**Data Source**: `orders` collection (Real-time listener)
```firestore
Collection: orders
├── Document: BILL + timesteamp (VD: BILL1709476267845)
│   ├── id: string
│   ├── createdAt: timestamp
│   ├── status: "pending | verifying | paid | processing | completed | failed | canceled"
│   ├── method: "cash" | "transfer"
│   ├── items: [{name, qty, priceK, img}]
│   ├── customer: {name, phone, address, city, district, ward}
│   ├── totalK: number
│   ├── note: string (ghi chú khách)
│   ├── billUrl: string (ảnh chuyển khoản - if transfer)
│   └── messages: sub-collection {chat messages}
```

#### 2.1.2 Lọc & Tìm Kiếm
**Bộ lọc có sẵn:**

| Bộ lọc | Loại | Giá trị | Mục đích |
|--------|------|--------|---------|
| Trạng thái | Select | all, unverified_cash, pending_transfer, processing, completed, failed, canceled | Lọc theo trạng thái |
| Hình thức | Select | (none), cash, transfer | Lọc theo phương thức TT |
| Thời gian | Select | all, today, yesterday, week, month | Lọc theo khoảng thời gian |
| Tìm kiếm | Text input | Mã đơn (BILL...) | Tìm theo mã đơn |

**Cơ chế**: Real-time filter + sort khi người dùng thay đổi filter

#### 2.1.3 Cập Nhật Trạng Thái Đơn Hàng
**Trạng thái workflow:**
```
unverified_cash (Chờ xác nhận TM)
       ↓ [Duyệt]
    processing (Đang pha chế)
       ↓ [Hoàn thành]
    completed (✓ Hoàn thành)

pending_transfer (Chờ xác minh CK)
       ↓ [Duyệt]
    processing (Đang pha chế)
       ↓ [Hoàn thành]
    completed (✓ Hoàn thành)

[Hủy] → canceled
[Thất bại] → failed
```

**Các Action Button** (trong Order Detail Modal):
- ✅ **Duyệt** (Approve): `unverified_cash` / `pending_transfer` → `processing`
- ✅ **Hoàn thành** (Complete): `processing` → `completed`
- ❌ **Hủy** (Cancel): Any → `canceled`
- ❌ **Thất bại** (Fail): Any → `failed`

**Cơ chế**:
```javascript
updateStatus(orderId, newStatus) → 
  if Firestore: db.orders.doc(id).update({status: newStatus})
  if Local: update in-memory + re-render
  → show Toast notification
  → re-render modal + list
```

#### 2.1.4 Xem Chi Tiết Đơn Hàng (Order Detail Modal)
**Thông tin hiển thị:**
- 📋 Mã đơn + Status badge + Method badge (TM/CK)
- 📅 Thời gian tạo
- 👤 Thông tin khách (tên, SDT)
- 📍 Địa chỉ giao hàng / Số bàn
- 🛍️ Danh sách sản phẩm (image, tên, qty, giá)
- 💰 Tổng cộng
- 📸 Ảnh biên lai (nếu chuyển khoản)
- 📝 Ghi chú khách hàng (nếu có)

---

### **TAB 2: QUẢN LÝ TIN NHẮN (Chat)**

#### 2.2.1 Cấu Trúc Chat
**Data Structure** (Firestore sub-collection):
```firestore
Collection: orders
├── Document: BILL123...
│   └── Collection: messages
│       └── Document: auto-generated
│           ├── from: "admin" | "customer"
│           ├── type: "text" | "image"
│           ├── content: string (text) | base64/URL (image)
│           └── createdAt: timestamp
```

#### 2.2.2 Chat Features
**Tính năng:**

1. **Threads View** (Sidebar trái)
   - List tất cả đơn hàng
   - Hiển thị tin nhắn cuối cùng (preview)
   - Unread indicator (dot đỏ animate với đơn có msg từ khách)
   - Click để select đơn → load chat history

2. **Chat History** (Main area)
   - Real-time listener trên messages sub-collection
   - Phân biệt người gửi: Admin (bg-accent, align right) vs Customer (bg-gray-600, align left)
   - Support image preview + click to zoom

3. **Quick Replies** (Canned responses)
   - Pre-defined messages:
     - "Đã xác minh, đơn đang pha chế"
     - "Đơn đã xác nhận. Cảm ơn!"
     - "Vui lòng chờ"
   - Click để gửi ngay

4. **Message Input**
   - Text input + Send button
   - File upload (image)
   - Auto-scroll to bottom

#### 2.2.3 Unread Status Management
**Local mode**: 
```javascript
o.chat[i].read = true (mark as read khi select)
```

**Firestore mode**:
```javascript
Real-time listener
```

---

### **TAB 3: QUẢN LÝ MENU (Menu Management)**

#### 2.3.1 Cấu Trúc Menu
**Data Storage:**
```firestore
Collection: menu
└── Document: data (single document)
    ├── categories: [{id, name}, ...]
    └── items: [{id, name, priceK, desc, img, cat, visible}]
```

**Local Storage Backup:**
```javascript
localStorage.bb_menu // JSON stringify categories & items
```

#### 2.3.2 Danh Mục (Categories)
**CRUD Operations:**
- ➕ **Thêm**: Click "+ Danh mục" → Modal input tên → Save
- 🔄 **Sửa**: Click "Sửa" → Modal edit tên → Update
- ❌ **Xóa**: Click "Xóa" → Confirm → Xóa + reset items liên quan

**Logic**: Khi xóa category, tất cả items có `cat === category.id` được set `cat = ''`

#### 2.3.3 Món Ăn (Items)
**CRUD Operations:**
- ➕ **Thêm**: Click "+ Món" → Modal form (tên, giá, mô tả, ảnh, danh mục)
- 🔄 **Sửa**: Click "Sửa" → Modal pre-filled → Update fields
- ❌ **Xóa**: Click "Xóa" → Confirm → Remove from array
- 👁️ **Ẩn/Hiện**: Toggle `visible` flag

**Fields per item:**
```javascript
{
  id: "it-" + timestamp,
  name: string,
  priceK: number (in thousands),
  desc: string,
  img: base64 string (compressed),
  cat: string (category id),
  visible: boolean (default true)
}
```

#### 2.3.4 Image Processing
**Features:**
- Compression: ImageUtils.compressMenuImage()
  - Reduce file size
  - Maintain quality
  - Show loading toast
- Preview: Show before confirming
- Validation: Kiểm tra file type + size

**Storage**:
- Local: Base64 trong localStorage (`bb_menu`)
- Firebase: Cũng base64 trong Firestore `menu/data/items.img`

#### 2.3.5 Persistence
```javascript
persistMenu() → 
  1. saveMenu(categories, items) // localStorage
  2. if Firebase: db.menu.doc('data').set({categories, items})
  3. Toast notification
```

---

### **TAB 4: BÁNG CÁO (Reports)**

#### 2.4.1 Metrics Hiển Thị
```
📊 Tổng doanh thu (tạm tính): X.xxx.xxx đ
✅ Doanh thu đã hoàn thành: Y.yyy.yyy đ
❌ Số đơn thất bại/hủy: N
```

#### 2.4.2 Export Excel
**Chức năng**: "Xuất báo cáo" button
- Export tất cả orders → Excel file
- Columns: Mã đơn, Hình thức, Trạng thái, Thời gian, Món, Số lượng, Đơn giá, Thành tiền, Tổng đơn
- Mỗi dòng = 1 item (nếu order có 3 items → 3 dòng)
- File name: `Bao_cao_don_hang.xlsx`

---

### **TAB 5: CÀI ĐẶT (Settings)**

#### 2.5.1 Store Settings
**Lưu trữ**: localStorage `bb_store`

**Fields:**
- Tên quán (store-name)
- Hotline (store-hotline)

**Cơ chế**:
```javascript
bindSettings() →
  1. Load from localStorage
  2. Populate input fields
  3. On Save: JSON.stringify({name, hotline}) → localStorage
```

---

## 3. ADDITIONAL FEATURES

### 3.1 Audio Notification
**Feature**: "Bật âm thanh" button
- Hỗ trợ notification sound khi có đơn hàng mới (new order alert)
- Sử dụng Web Audio API (AudioContext)
- Tone: 880Hz sine wave, 220ms duration

**Logic**:
```javascript
setupOrdersListener() → 
  if (orders.length > lastOrderCount) playTing()
```

### 3.2 Real-time Listener
**Firestore integration**:
```javascript
db.collection('orders')
  .orderBy('createdAt', 'desc')
  .onSnapshot(snap => {
    // auto-update when docs change
    // re-render all tabs
  })
```

### 3.3 Dual Mode Support
**Firebase Mode** (Production):
- Real-time listeners on Firestore
- Cloud Storage for images
- Server-side timestamps

**Local Mode** (Development):
- In-memory data (orders, menu)
- localStorage for persistence
- Simulated new orders

---

## 4. WORKFLOW & PROCESS FLOWS

### 4.1 Order Lifecycle
```
Customer tạo đơn (payment.html)
        ↓
Đơn xuất hiện trong admin (orders collection)
        ↓
Admin review (Orders tab)
        ↓
Click order → Detail modal
        ↓
Check thông tin: customer, items, method
        ↓
[Nếu cash] → Review và click "Duyệt" → status: processing
[Nếu transfer] → Review biên lai + click "Duyệt" → status: processing
        ↓
Chat với customer nếu cần
        ↓
Đơn hoàn thành → Click "✓ Hoàn thành" → status: completed
        ↓
Report updated
```

### 4.2 Menu Editing Workflow
```
Admin click "+ Món"
        ↓
Modal form appears
        ↓
Input: tên, giá, mô tả, chọn ảnh, chọn category
        ↓
Click Save
        ↓
Image compression (async)
        ↓
Persist to localStorage + Firestore
        ↓
Re-render menu list
        ↓
Customer sees updated menu on index.html
```

### 4.3 Chat Workflow
```
Customer gửi tin nhắn (tracking.html) via messages sub-collection
        ↓
Admin nhìn thấy unread indicator (tab-chat)
        ↓
Click order thread → Load chat history
        ↓
Admin type response hoặc chọn quick reply
        ↓
Click Send
        ↓
Lưu vào messages sub-collection
        ↓
Customer nhận notification (real-time)
```

---

## 5. DATA FLOW & DEPENDENCIES

### 5.1 Main Collections
```
orders/
├── {order-id}/
│   ├── status, method, items, customer, total, note, billUrl
│   └── messages/
│       └── {message-id}/ → from, type, content, createdAt

menu/
└── data/
    ├── categories: [...]
    └── items: [...]

(Local Storage)
├── bb_menu → {"categories": [...], "items": [...]}
└── bb_store → {"name": "...", "hotline": "..."}
```

### 5.2 Real-time Sync
- **Firestore Listener**: orders collection live update
- **Sub-collection Listener**: messages per selected order
- **Menu**: Load once on init, then persist to Firestore on change
- **Settings**: Load from localStorage, save on button click

---

## 6. UI/UX COMPONENTS

### 6.1 Colors & Styling
- **Dark theme**: bg-darkbg (#1F2937), text-gray-100
- **Accent**: bg-accent (#C2410C) for primary actions
- **Status colors**: 
  - amber for cash/unverified
  - yellow for transfer/pending
  - blue for processing
  - green for completed
  - red for failed

### 6.2 Layout
- Header: Logo + "Về trang khách" link
- Tab navigation: Orders, Chat, Menu, Report, Settings
- 2-column layout for Chat (threads + messages)
- Grid for Menu (categories + items)
- Modals for: Order Details, Menu Edit, Confirm Dialogs

### 6.3 Responsive
- `max-w-6xl` container
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for filters
- `lg:col-span-*` for chat layout

---

## 7. ERROR HANDLING & DEBUG

### 7.1 Error Messages
- Toast notifications: Success, Error, Loading states
- `#admin-debug` element: Connection status message
- Console logs for Firebase errors

### 7.2 Debug Info
```
Display: "Firebase • v20260302-1" (Firebase mode)
     or: "N đơn • v20260302-1" (Local mode)
```

### 7.3 Self-Test Functions
```javascript
window.testAdminFlow() // Test order status update
window.adminSelfTest() // Test bill preview + quick reply
```

---

## 8. PERFORMANCE & SCALABILITY

### 8.1 Optimization
- Real-time listeners (not polling)
- Lazy render (only visible items)
- Image compression before save
- Base64 storage (no external CDN)

### 8.2 Limitations
- Chat history not paginated (could lag with 1000+ messages)
- Menu items not virtualized (OK for <100 items)
- All orders loaded in memory (could be slow with 10000+ orders)

### 8.3 Recommendations
- Add pagination for chat + orders
- Add search indexing for large datasets
- Consider Cloud Functions for image processing

---

## 9. SECURITY NOTES

### 9.1 Current Security
- No explicit auth (uses Firebase rules from Firestore)
- Firestore rules should restrict writes to authorized admins
- Menu accessible to all (public read)

### 9.2 Future Improvements
- Add admin authentication (Google Sign-In planned)
- Whitelist admin emails in Firestore
- Restrict menu editing to authenticated admins

---

## 10. INTEGRATION POINTS WITH OTHER PAGES

### 10.1 Customer Pages → Admin
- `payment.html`: Creates orders → Firestore
- `tracking.html`: Reads orders + sends chat messages → Firestore
- `index.html`: Reads menu → For display

### 10.2 Admin → Firestore → Customer
- Order status updates → Real-time update on tracking.html
- Chat messages → Show on tracking.html chat
- Menu changes → Reflect on index.html immediately

---

**Document Version**: v0.1 - 2026/03/05  
**Last Updated**: Initial analysis  
**Status**: ✅ Complete
