# Phân Tích Logic Nghiệp Vụ & Kỹ Thuật - B.BLING Coffee & Eatery

## 📊 TỔNG QUAN HỆ THỐNG
Hệ thống gồm 2 bên chính:
- **Trang Khách Hàng**: Duyệt menu, đặt và thanh toán
- **Trang Quản Trị**: Quản lý orders, chat real-time, báo cáo

---

## 🛍️ LOGIC NGHIỆP VỤ

### 1. LUỒNG ĐẶT HÀNG KHÁCH (index.html + payment.html)

#### Bước 1: Duyệt Menu
- **Source**: `menu-store.js` + `app.js`
- Menu được lấy từ 2 nguồn (ưu tiên):
  1. **Firebase** (`/menu/data` - primary)
  2. **LocalStorage** (`bb_categories`, `bb_items` - fallback)
- Chỉ hiển thị những món có `visible: true`
- Được phân chia thành categories: Coffee, Trà hoa quả, Sữa chua, Đồ ăn vặt

#### Bước 2: Thêm vào Giỏ Hàng
```
Product Detail Modal (app.js - dòng 73-161)
├─ User chọn:
│  ├─ Tùy chọn (ít đá, nhiều đường, không đường)
│  ├─ Số lượng
│  └─ Ghi chú
├─ System tạo KEY duy nhất: 
│  └─ `${itemId}|${options joined}|${note}`
└─ Lưu vào state.cart[key] = { ...item, qty, options, note }
```

**State Cart Structure**:
```javascript
state.cart = {
  "coffee-black|less-ice|ít nước": {
    id: "coffee-black",
    name: "Black Coffee",
    priceK: 29,
    qty: 2,
    options: ["less-ice"],
    note: "ít nước"
  }
}
```

#### Bước 3: Xác Nhận Order (app.js - dòng 156-170)
- Tính tổng tiền
- Tạo Bill ID: `BILL` + 6 chữ số cuối của timestamp
- Lưu vào sessionStorage: `order_${billId}`
- Điều hướng sang payment.html với query params

#### Bước 4: Thanh Toán (payment.html)
**Form thông tin khách**:
- Tên khách (bắt buộc)
- SĐT (bắt buộc, format 10 số)
- Địa chỉ/Số bàn (bắt buộc)
- Tỉnh/Thành, Quận/Huyện, Phường/Xã (tùy chọn)

**Chọn phương thức**:
```
┌─ Tiền Mặt (unverified_cash)
│  └─ Đơn chờ xác nhận → Admin verify → Pha chế
│
└─ Chuyển Khoản (pending_transfer)
   ├─ Hiển thị mã QR: B.BLING|BILL|Amount|Content
   ├─ Khách tải ảnh biên lai
   └─ Đơn chờ xác minh → Admin verify → Pha chế
```

#### Bước 5: Gửi Order lên Firebase (payment.html)
```javascript
db.collection('orders').add({
  id: billId,
  items: [...],
  customer: { name, phone, address, city, district, ward },
  method: 'cash' | 'transfer',
  status: 'unverified_cash' | 'pending_transfer',
  createdAt: timestamp,
  billUrl: imageUrl | null,
  note: ''
})
```

**Tạo subcollection messages** (nếu cần chat):
```
/orders/{billId}/messages/{msgId}
  ├─ from: 'customer' | 'admin'
  ├─ type: 'text' | 'image'
  ├─ content: '...'
  └─ createdAt: timestamp
```

---

### 2. LUỒNG QUẢN LÝ ORDER ADMIN (admin-dashboard.html + admin.js)

#### Trạng Thái Order (Status Map)
```
unverified_cash (Chờ xác nhận TM)
├─ Tiền mặt, chưa xác nhận
└─ Action: Approve → processing
    ↓
pending_transfer (Chờ xác minh CK)
├─ Chuyển khoản, chưa xác minh ảnh biên lai
└─ Action: Approve → processing
    ↓
processing (Đang pha chế)
├─ Order được approved, bắt đầu pha chế
└─ Action: Complete → completed
    ↓
completed (Hoàn thành) ✅
    
(từ bất kỳ status nào)
├─ Action: Cancel → canceled
├─ Action: Fail → failed
└─ Lý do: Hết hàng, sự cố, không gọi, v.v.
```

#### Dashboard Admin (admin.js - dòng 16-150)
**Tabs chính**:
1. **Tab Orders**: Danh sách order
2. **Tab Chat**: Thread chat + Detail
3. **Tab Menu**: Quản lý menu
4. **Tab Report**: Báo cáo hàng ngày

**Filter Orders**:
- Status (unverified_cash, pending_transfer, processing, etc.)
- Method (cash, transfer)
- Date Range (all, today, yesterday, week, month)
- Search by Bill ID

#### Detail Order
```
┌─ Header info
│  ├─ Bill: #BILLXXXXXX
│  ├─ Method: Tiền mặt / Chuyển khoản
│  ├─ Status: Chờ xác nhận / Đang pha chế / Hoàn thành
│  └─ Total: 156.000đ
├─ Customer info: Tên · SĐT · Địa chỉ
├─ Items list: [Sản phẩm] x [Số lượng] · [Đơn giá]
├─ Chat thread: Real-time messages
├─ Bill preview: Ảnh biên lai (if transfer)
└─ Actions buttons
   ├─ Approve (nếu chờ xác nhận)
   ├─ Complete (nếu đang pha chế)
   ├─ Cancel
   └─ Failed
```

#### Chat Real-time (admin.js - dòng 180-200)
```javascript
// Admin setup listener
db.collection('orders').doc(billId)
  .collection('messages')
  .orderBy('createdAt')
  .onSnapshot(snap => {
    // Render messages
  })

// Admin gửi tin nhắn
db.collection('orders').doc(billId)
  .collection('messages')
  .add({
    from: 'admin',
    type: 'text',
    content: message,
    createdAt: serverTimestamp
  })
```

#### Export Báo Cáo (admin.js - dòng 168-173)
```
Export format: Excel (.xlsx)
Columns:
- Mã đơn, Hình thức, Trạng thái, Thời gian
- Món, Số lượng, Đơn giá (VND), Thành tiền (VND), Tổng đơn (VND)

Data: All orders filtered by date
Trigger: "Export hôm nay" button
Library: XLSX (SheetJS)
```

---

### 3. LUỒNG CHAT REAL-TIME (chat.js)

#### Khách Chat (index.html)
```
┌─ Chat button (floating bottom-right)
├─ Chat panel (bấm để mở)
│  ├─ Avatar + "Hỗ trợ B.BLING" + Online status
│  ├─ Message log (scrollable)
│  ├─ Input + Upload ảnh + Send button
│  └─ Gợi ý: "Gửi ảnh biên lai?"
└─ Auto-open nếu URL có ?chat=open
```

#### Admin Chat (admin-dashboard.html)
```
┌─ Chat threads sidebar
│  ├─ Pending indicators: "N đơn chờ"
│  └─ List orders (unread dot nếu có tin mới từ khách)
│
└─ Detail + Chat tab
   ├─ Order info (header)
   ├─ Bill preview (ảnh biên lai)
   ├─ Chat messages
   ├─ Input + Upload + Send
   └─ Quick replies: "Sắp xong", "Hết hàng", v.v.
```

#### Message Structure
```javascript
{
  from: 'customer' | 'admin',
  type: 'text' | 'image',
  content: 'message text' | 'data:image/...',
  createdAt: timestamp,
  read: true | false (client-side tracking)
}
```

---

### 4. QUẢN LÝ MENU (menu-store.js)

**Menu Data Source Priority**:
1. Firebase Firestore (`/menu/data`)
2. LocalStorage (`bb_categories`, `bb_items`)
3. Default hardcoded items

**Cấu trúc dữ liệu**:
```javascript
categories = [
  { id: 'cat-coffee', name: 'Coffee' },
  { id: 'cat-tea', name: 'Trà hoa quả' },
  ...
]

items = [
  {
    id: 'coffee-black',
    name: 'Black Coffee',
    priceK: 29,
    desc: 'Hương vị cổ điển, đậm đà.',
    img: 'https://...',
    cat: 'cat-coffee',
    visible: true
  },
  ...
]
```

**Admin quản lý**:
- Thêm/sửa/xóa category
- Thêm/sửa/xóa item
- Toggle visible (ẩn/hiện)
- Thay đổi giá, hình ảnh
- Tự động sync lên Firebase
- Khách tự động nhìn thấy thay đổi (via `bb-menu-updated` event)

---

## 🏗️ KIẾN TRÚC KỸ THUẬT

### Công Nghệ Stack
```
Frontend:
├─ HTML5 + Vanilla JavaScript (ES6+)
├─ CSS3 (Tailwind CSS v3)
└─ No framework (vanilla approach)

Backend:
├─ Firebase Firestore (NoSQL)
├─ Firebase Storage (images)
└─ Firebase Auth (future)

Storage:
├─ LocalStorage (menu cache, session data)
├─ SessionStorage (order temp data)
└─ Firebase (persistent data)
```

### Firestore Schema

```
project: b-bling-coffee

collections:
├─ /orders/{billId}
│  ├─ id: string (BILLXXXXXX)
│  ├─ items: array
│  │  └─ [{ id, name, priceK, qty, img }]
│  ├─ customer: object
│  │  ├─ name: string
│  │  ├─ phone: string
│  │  ├─ address: string
│  │  ├─ city, district, ward: string
│  │  └─ updated: timestamp
│  ├─ method: string (cash | transfer)
│  ├─ status: string (unverified_cash | pending_transfer | processing | completed | canceled | failed)
│  ├─ createdAt: timestamp
│  ├─ note: string (order notes)
│  ├─ billUrl: string (image path nếu transfer)
│  ├─ chat: array (deprecated - dùng subcollection thay thế)
│  │  └─ [{ from, type, content, createdAt, read }]
│  │
│  └─ /messages/{msgId} (subcollection)
│     ├─ from: string (admin | customer)
│     ├─ type: string (text | image)
│     ├─ content: string
│     └─ createdAt: timestamp
│
├─ /menu/data
│  ├─ categories: array
│  │  └─ [{ id, name }]
│  └─ items: array
│     └─ [{ id, name, priceK, desc, img, cat, visible }]
│
└─ /test/connection-test (dev/debug)
   └─ timestamp: number
```

### Firestore Rules (Current - INSECURE ⚠️)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ❌ TEMP: Allow all
    }
  }
}
```

**⚠️ CẢNH BÁO BẢO MẬT**: Hiện tại cho phép read/write tất cả. Sau này cần:
- Rule for public read (orders, menu)
- Auth for admin write (status update, menu management)
- Customer can only create orders, view own orders

---

### Module & Dependency Graph

```
index.html
├─ firebase-config.js (init Firebase)
├─ menu-store.js (menu logic)
├─ app.js (customer shopping flow)
└─ chat.js (customer chat widget)

payment.html
├─ firebase-config.js
├─ app.js (cities location data)
└─ location data (hardcoded JSON)

admin-dashboard.html
├─ firebase-config.js
├─ admin.js (all admin logic)
├─ menu-store.js (menu management)
├─ chat.js (admin chat)
└─ xlsx.js (export reports)

admin-login.html
├─ firebase-config.js
└─ admin-login flow (password or manual auth)
```

### File Structure & Responsibilities

| File | Lines | Responsibility |
|------|-------|-----------------|
| **app.js** | 299 | Menu rendering, shopping cart, order creation |
| **admin.js** | 453 | Dashboard, order management, status updates, chat |
| **chat.js** | 253 | Real-time messaging widget, file uploads |
| **menu-store.js** | 150+ | Menu data layer, LocalStorage + Firebase sync |
| **firebase-config.js** | 45 | Firebase initialization, global window refs |
| **index.html** | 200 | Customer home, menu display, product modal, chat |
| **payment.html** | 345 | Order checkout, location select, payment method choice |
| **admin-dashboard.html** | Large | Admin UI: orders tab, chat tab, menu tab, reports |
| **admin-login.html** | Small | Admin authentication |

### Key Patterns & Design

#### 1. State Management
- **Client-side**: Plain object state.cart
- **Session**: sessionStorage (order before payment)
- **Local**: localStorage (menu cache)
- **Remote**: Firestore (orders, menu, messages)

#### 2. Real-time Listeners
```javascript
// Admin listens to order changes
db.collection('orders')
  .orderBy('createdAt', 'desc')
  .onSnapshot(snap => {
    orders = snap.docs.map(docToOrder);
    renderOrders(); // Update UI
  })

// Admin listens to chat messages
db.collection('orders').doc(billId)
  .collection('messages')
  .orderBy('createdAt')
  .onSnapshot(snap => {
    // Update chat display
  })

// Client listen to menu updates (from admin changes)
window.addEventListener('bb-menu-updated', () => {
  renderMenu();
})
```

#### 3. Data Validation

```javascript
// Payment form validation (payment.html)
const errors = {};
if (!name.trim()) errors.name = true;
if (!/^0\d{9}$|^\+84\d{9}$/.test(phone)) errors.phone = true;
if (address.trim().length < 5) errors.address = true;
if (!method) errors.method = true;
if (method === 'transfer' && !receipt) errors.receipt = true;

if Object.keys(errors).length > 0 {
  // Show errors
  return;
}
// Submit order
```

#### 4. Image Handling
- **Fallback**: Unsplash placeholder if image fails to load
- **Upload**: Base64 encoding for Firebase Storage (receipt image)
- **Preview**: inline base64 before upload

#### 5. UI Components (Tailwind)
- **Modal**: Product detail sheet (bottom-sheet pattern)
- **Toast**: Copy confirmation
- **Badge**: Status indicators with color coding
- **Chat bubble**: Align by sender (left="customer", right="admin")

---

## 🔒 BẢNG TRẠNG THÁI & WORKFLOW

### Order Status Flow

```
CREATE ORDER
├─ method == 'cash'
│  └─ status = unverified_cash (chờ xác nhận)
│     ├─ Admin review → Approve
│     ├─ Status change → processing
│
└─ method == 'transfer'
   └─ status = pending_transfer (chờ xác minh)
      ├─ Admin verify receipt image
      ├─ Status change → processing

PROCESSING
├─ Status = processing (đang pha chế)
├─ Admin → Complete
└─ Status change → completed

COMPLETED ✅
└─ Final status

CANCEL / FAILED ❌
├─ Any status → canceled | failed
└─ No reverse
```

### Status Color Coding
```
unverified_cash   → amber-500/30  (chờ xác nhận)
pending_transfer  → yellow-500/30 (chờ xác minh)
processing        → blue-500/30   (đang pha chế)
completed         → green-500/30  (hoàn thành)
failed            → red-500/30    (thất bại)
canceled          → gray-500/30   (đã hủy)
```

---

## 📱 RESPONSIVE DESIGN

- **Desktop** (md+): Wide layout, side-by-side panels
- **Tablet** (sm-md): Stacked with breakpoints
- **Mobile** (xs): Single column, full-width elements
- **Chat**: Fixed position bottom-right (floating)
- **Modals**: Bottom sheet on mobile, center on desktop

---

## 🐛 KNOWN ISSUES & TODO

### Current Issues
1. **Firebase Rules**: Too permissive (`allow read, write: if true`)
   - 🔴 Security risk: Anyone can delete orders
   - ✅ Fix: Implement auth rules + admin verification

2. **Image Storage**: Using base64 inline (unsuitable for large files)
   - 🟡 Current: Receipt as base64 string in Firestore
   - ✅ Better: Upload to Firebase Storage, store URL in Firestore

3. **Error Handling**: Minimal error recovery
   - 🟡 No retry logic for failed uploads
   - ✅ Add: Exponential backoff, user-friendly error messages

4. **Admin Auth**: Password is hardcoded in localStorage
   - 🔴 Security issue
   - ✅ Fix: Firebase Authentication, role-based access control

### Improvements Needed
- [ ] Add order tracking by customer (SMS/Email)
- [ ] Push notifications for new orders
- [ ] Inventory management (set item as "sold out")
- [ ] Order analytics dashboard (sales, peak hours)
- [ ] Multi-language support (EN/VI)
- [ ] PWA capability (offline menu viewing)
- [ ] Payment gateway integration (Momo, Zalopay)

---

## 📊 PERFORMANCE & OPTIMIZATION

### Current Optimizations
- ✅ Lazy loading menu items (Firebase onSnapshot)
- ✅ Session storage for temporary order data
- ✅ LocalStorage cache for menu (fallback)
- ✅ Image lazy loading with placeholder

### Optimization Opportunities
- [ ] Implement pagination for large order lists
- [ ] Add database indexing on orders.createdAt
- [ ] Cache admin dashboard queries (1-5 min TTL)
- [ ] Compress images on upload
- [ ] Implement service worker for offline mode
- [ ] Code splitting for admin vs. customer modules

---

## 🎯 SUMMARY

**B.BLING** là một hệ thống quản lý order **full-stack** cho quán cà phê:
- ✅ **Frontend**: Clean, responsive UI với vanilla JS
- ✅ **Backend**: Real-time Firestore database
- ✅ **Business Logic**: Order → Payment → Chat → Fulfillment
- ⚠️ **Security**: Cần cải thiện (hiện tại permissive rules)
- 🚀 **Scalability**: Sẵn sàng cho ~1000 orders/day, cần monitoring

**Status**: Functional beta (giao diện + Firebase integration hoàn thành)
