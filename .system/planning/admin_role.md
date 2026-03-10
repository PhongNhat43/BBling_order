# Phân Tích Hệ Thống Phân Quyền Admin - B.BLING

**Cập nhật lúc**: 10/03/2026  
**Trạng thái**: Đang hoạt động (Production)

---

## 1. Tổng Quan Hiện Trạng

### 1.1 Mô Hình Phân Quyền Hiện Tại
- **Loại**: Binary access control (2 mức: Admin hoặc Không)
- **Không có** role levels (manager, staff, supervisor)
- **Tất cả admin** có quyền **truy cập và chỉnh sửa** toàn bộ hệ thống
- **Kiểm soát ở Level**: Client-side (JavaScript) + Firebase auth

### 1.2 Số Lượng & Trạng Thái
- **Bootstrap admin**: 1 email (`phongnhat43@gmail.com`)
- **Quản lý hiện tại**: Thông qua tab "Nhân viên" trong admin-dashboard.html
- **Cơ chế**: Add/Remove email vào collection `admin_users` (Firestore)

---

## 2. Luồng Xác Thực (Authentication Flow)

### 2.1 Đăng Nhập (Login)
**File**: `admin-login.html`

```
Bước 1: Người dùng truy cập admin-login.html
    ↓
Bước 2: Click nút "Tiếp tục với Google"
    ↓
Bước 3: Firebase popup đăng nhập
    ↓
Bước 4: Lấy user.email từ Firebase Auth
    ↓
Bước 5: Kiểm tra email trong collection admin_users
    ├─ Tồn tại → Redirect tới admin-dashboard.html ✓
    ├─ Không tồn tại + email trong BOOTSTRAP_ADMINS
    │  → Tự động tạo document admin_users → Redirect ✓
    └─ Không tồn tại + email không trong BOOTSTRAP
       → Sign out + Hiển thị lỗi "Không có quyền" ✗
```

**Code**: 
```javascript
var BOOTSTRAP_ADMINS = ['phongnhat43@gmail.com'];

function checkAndRedirect(user) {
  return db.collection('admin_users').doc(user.email).get()
    .then(function(doc) {
      if (doc.exists) {
        location.href = 'admin-dashboard.html'; // Admin hợp lệ
      } else if (BOOTSTRAP_ADMINS.indexOf(user.email) !== -1) {
        // Auto-bootstrap: tạo document nếu collection trống
        return db.collection('admin_users').doc(user.email).set({
          email: user.email,
          addedAt: firebase.firestore.FieldValue.serverTimestamp(),
          addedBy: 'bootstrap'
        }).then(() => location.href = 'admin-dashboard.html');
      } else {
        firebase.auth().signOut();
        showError('Tài khoản không có quyền truy cập');
      }
    });
}
```

### 2.2 Kiểm Tra Quyền Vào Admin Dashboard
**File**: `admin-dashboard.html` (Auth guard)

```javascript
// Auth guard - chạy ngay khi load page
firebase.auth().onAuthStateChanged(function(user) {
  if (!user) { 
    location.replace('admin-login.html'); // Chưa login
    return; 
  }
  
  // Kiểm tra email có trong admin_users không
  firebase.firestore().collection('admin_users').doc(user.email).get()
    .then(function(doc) {
      if (!doc.exists) {
        firebase.auth().signOut();
        location.replace('admin-login.html'); // Không có quyền
        return;
      }
      // Hiển thị thông tin user trong header
      document.getElementById('admin-name').textContent = user.displayName || user.email;
    });
});
```

**Kết quả**: 
- Dashboard **chỉ hiển thị** nếu email nằm trong `admin_users` collection
- Nếu không có quyền → Auto sign out → Quay lại login page

---

## 3. Quản Lý Nhân Viên (Staff Management)

### 3.1 Vị Trí Quản Lý
- **Tab**: "Nhân viên" (Staff tab) trong admin-dashboard.html
- **Quyền truy cập**: Tất cả admin đều có thể quản lý

### 3.2 Chức Năng

#### a) **Thêm quyền (Add Staff)**
```javascript
// Nhập email Google → Click "+ Thêm quyền"
const email = 'newadmin@gmail.com'; // Cần là Gmail account

db.collection('admin_users').doc(email).set({
  email: email,
  addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  addedBy: currentUser.email  // Người thêm
});
```

**Yêu cầu**:
- Email phải hợp lệ (format: user@domain.com)
- Email phải là tài khoản Google hợp lệ
- Admin người thêm vào sẽ lưu trong field `addedBy`

#### b) **Xóa quyền (Remove Staff)**
```javascript
// Click nút trash icon → Confirm "Thu hồi quyền"
db.collection('admin_users').doc(email).delete();
```

**Hạn chế**:
- **Không thể xóa tài khoản đang đăng nhập** (bảo vệ lockout)
- Xóa ngay → Admin đó bị logout tự động lần tiếp theo

#### c) **Danh Sách Nhân Viên**
Hiển thị:
- **Email**: Tài khoản Google
- **Thêm lúc**: Timestamp khi được cấp quyền (định dạng: DD/MM/YYYY HH:MM)
- **Nút xóa**: Thu hồi quyền

---

## 4. Cấu Trúc Dữ Liệu Firestore

### 4.1 Collection: `admin_users`
```
admin_users/
├── phongnhat43@gmail.com
│   ├── email: "phongnhat43@gmail.com"
│   ├── addedAt: Timestamp (2026-03-01 10:30:00)
│   └── addedBy: "bootstrap"
├── staff1@gmail.com
│   ├── email: "staff1@gmail.com"
│   ├── addedAt: Timestamp (2026-03-05 14:15:00)
│   └── addedBy: "phongnhat43@gmail.com"
└── staff2@gmail.com
    ├── email: "staff2@gmail.com"
    ├── addedAt: Timestamp (2026-03-06 09:45:00)
    └── addedBy: "staff1@gmail.com"
```

**Field Description**:
| Field | Kiểu | Mô Tả |
|-------|------|-------|
| email | String | Tài khoản Google được cấp quyền |
| addedAt | Timestamp | Lúc được cấp quyền |
| addedBy | String | Email của người cấp quyền (hoặc "bootstrap") |

---

## 5. Firestore Security Rules

### 5.1 Kết Cấu Hiện Tại

```firestore rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Tất cả đơn hàng: Công khai (read/write)
    match /orders/{orderId} {
      allow read, write: if true;
    }
    
    // Thực đơn: Công khai (read/write)
    match /menu/{document=**} {
      allow read, write: if true;
    }
    
    // Chat khách: Công khai (read/write)
    match /guestChats/{document=**} {
      allow read, write: if true;
    }
    
    // Admin users: Cần xác thực
    match /admin_users/{email} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Settings: Payment config công khai, telegram_config cần auth
    match /settings/{docId} {
      allow read: if docId == 'payment_config' || request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 5.2 Phân Tích Rủi Ro

| Collection | Hiện Tại | Rủi Ro |
|-----------|---------|--------|
| orders | allow read, write: if true | **🔴 Công khai** - Ai cũng sửa được đơn hàng |
| menu | allow read, write: if true | **🔴 Công khai** - Ai cũng sửa được thực đơn |
| guestChats | allow read, write: if true | **🔴 Công khai** - Ai cũng xem/sửa được chat |
| admin_users | Cần auth | **🟢 Bảo vệ** - Chỉ admin xác thực mới thao tác |
| settings | Partial | **🟡 Bán bảo vệ** - payment_config công khai |

**⚠️ Kết luận**: Bảo mật Firestore **RẤT LỎng lẻo** - khách hàng có thể sửa đơn hàng, xóa menu, v.v.

---

## 6. Luồng Kiểm Soát Quyền (Authorization)

### 6.1 Client-Side Control (Hiện Tại)
```
┌─ User truy cập admin-dashboard.html
│
├─ Script auth guard chạy ngay
│  └─ Check: admin_users collection có email này không?
│     ├─ YES → Hiển thị dashboard + Load dữ liệu
│     └─ NO → Sign out + Redirect login
│
└─ Đối với chỉnh sửa data (menu, order, etc.):
   └─ **Không có check quyền bên server** - chỉ rely firestore rules
      (mà rules để if true → tất cả có thể sửa)
```

### 6.2 Các Thao Tác Không Có Quyền Hạn

Admin có thể thực hiện:
- ✅ Xem, tạo, sửa, xóa đơn hàng
- ✅ Xem, tạo, sửa, xóa thực đơn (menu)
- ✅ Xem, trả lời, xóa tin nhắn khách
- ✅ Cấu hình cài đặt (bank, telegram, etc.)
- ✅ Xuất Excel báo cáo
- ✅ **Thêm/xóa admin khác** (staff management)
- ✅ Xóa dữ liệu cũ (old orders, chats)

**❌ Không có giới hạn hoặc cảnh báo**: Tất cả admin đều có full quyền như nhau.

---

## 7. Hiện Trạng An Toàn (Security Assessment)

### 7.1 Điểm Mạnh
| Điểm | Mô Tả |
|------|-------|
| ✅ Firebase Auth | Google OAuth đã được xác thực |
| ✅ Email whitelist | Chỉ email trong `admin_users` mới vào được |
| ✅ Lock-out protection | Không thể xóa tài khoản đang login |
| ✅ Audit trail tối thiểu | Lưu `addedAt`, `addedBy` khi add staff |

### 7.2 Điểm Yếu
| Điểm | Mô Tả | Mức Độ Rủi Ro |
|------|-------|--------------|
| ❌ No role levels | Tất cả admin có full quyền | **🔴 Cao** |
| ❌ No audit log | Không track ai sửa gì, khi nào | **🔴 Cao** |
| ❌ Firestore rules quá lỏng | Client có thể bypass sửa data trực tiếp | **🔴 Rất cao** |
| ❌ No permission check server-side | Chỉ rely client-side + firestore rules | **🟠 Trung bình** |
| ❌ No 2FA | Chỉ dùng Google OAuth, không có 2FA | **🟠 Trung bình** |
| ❌ No rate limiting | Không giới hạn số thao tác trên giây | **🟡 Thấp** |
| ❌ No deletion confirmation logs | Xóa admin không lưu evidence | **🟠 Trung bình** |

---

## 8. Khuyến Nghị Cải Thiện

### 8.1 Ngắn Hạn (Dễ implement)
- [ ] **Thêm audit log**: Lưu lịch sử ai sửa gì (timestamp, email, action)
- [ ] **Firestore rules tighter**: Chỉ admin_users mới có quyền sửa orders/menu
- [ ] **Soft delete**: Xóa admin không xóa ngay, chỉ mark `deleted: true`
- [ ] **Email verification**: Khi add staff, gửi email confirm

### 8.2 Trung Hạn (Moderately complex)
- [ ] **Role levels**: Thêm role (manager, staff, viewer)
  - Manager: Full access
  - Staff: Only view orders, reply chats
  - Viewer: Read-only
- [ ] **Server-side permission check**: Node.js middleware hoặc Cloud Functions
- [ ] **Activity log dashboard**: Hiển thị lịch sử thao tác

### 8.3 Dài Hạn (Complex)
- [ ] **2FA**: SMS hoặc authenticator app
- [ ] **IP whitelist**: Chỉ allow truy cập từ IP cụ thể
- [ ] **Session management**: Auto logout sau N phút không hoạt động
- [ ] **Encryption at rest**: Mã hóa dữ liệu nhạy cảm

---

## 9. Tóm Tắt Nhanh

| Khía Cạnh | Hiện Trạng |
|----------|-----------|
| **Xác thực** | Firebase Google OAuth ✅ |
| **Phân quyền** | Binary only (admin/non-admin) ❌ |
| **Nhân viên** | 1 bootstrap admin, có thêm/xóa qua UI ✅ |
| **Audit log** | Không có ❌ |
| **Server-side check** | Không có, chỉ client-side ❌ |
| **Firestore security** | Quá lỏng lẻo ❌ |
| **Data isolation** | Không có (tất cả admin xem được tất cả) ✅ |

---

## 10. File Liên Quan

| File | Mục Đích |
|------|---------|
| `admin-login.html` | Trang đăng nhập, kiểm tra bootstrap |
| `admin-dashboard.html` | Auth guard, quản lý nhân viên (tab Staff) |
| `firestore.rules` | Quy tắc truy cập Firestore |
| `firebase-config.js` | Cấu hình Firebase |
| `admin.js` | Logic admin dashboard (không có permission check) |

---

## 11. KỲ HOẠCH NÂNG CẤP (Ưu Tiên 2) - Cập nhật 10/03/2026

### 11.1 Mục Tiêu Nâng Cấp

**Chuyển đổi từ**: Binary Access Control  
**Sang**: Admin Group Access (Nhóm Quản trị viên tương đương)

**Nguyên tắc**:
- ✅ Tất cả admin trong `admin_users` có quyền **Read/Write toàn bộ dữ liệu** (Menu, Orders, Chats, Settings)
- 🔒 **Admin gốc** (`phongnhat43@gmail.com`) **không thể bị xóa** - Immutable
- 📋 Tất cả admin được đánh dấu `role: "admin"` trong Firestore
- 🔐 **Firestore Rules** được thắt chặt - Chỉ email trong `admin_users` mới có write permission

### 11.2 Scope Thay Đổi

#### File 1: `admin-login.html` (Admin gốc)
| Thay đổi | Chi Tiết |
|---------|---------|
| Thêm trường role | Khi bootstrap, thêm `role: "admin"` vào document |
| Impact | Đánh dấu rõ Admin gốc |

**Trước**:
```javascript
db.collection('admin_users').doc(user.email).set({
  email: user.email,
  addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  addedBy: 'bootstrap'
});
```

**Sau**:
```javascript
db.collection('admin_users').doc(user.email).set({
  email: user.email,
  role: 'admin',  // ✨ NEW
  addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  addedBy: 'bootstrap'
});
```

#### File 2: `admin-dashboard.html` (Quản lý nhân viên)
| Thay đổi | Chi Tiết |
|---------|---------|
| Thêm trường role | Khi add staff, thêm `role: "admin"` |
| Hiển thị label | Thêm badge "👤 Quản trị viên" bên cạnh email |
| Chặn xóa gốc | **Ẩn nút delete** nếu email === "phongnhat43@gmail.com" |

**Trước** (thêm staff):
```javascript
db.collection('admin_users').doc(email).set({
  email: email,
  addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  addedBy: currentUser.email
});
```

**Sau**:
```javascript
db.collection('admin_users').doc(email).set({
  email: email,
  role: 'admin',  // ✨ NEW
  addedAt: firebase.firestore.FieldValue.serverTimestamp(),
  addedBy: currentUser.email
});
```

**Chặn xóa gốc**:
```javascript
// Trong renderStaffList(), khi render nút delete:
if (d.id === 'phongnhat43@gmail.com') {
  // Ẩn nút delete, hiển thị badge "Bảo vệ"
  // KHÔNG render nút trash icon
} else {
  // Render nút trash bình thường
}
```

#### File 3: `firestore.rules` (Bảo mật)
| Thay đổi | Chi Tiết |
|---------|---------|
| Thay thế rules tỏng | Từ `if true;` sang `if request.auth.token.email trong admin_users` |
| Collections | orders, menu, guestChats, settings.telegram_config |
| Impact | **Chỉ admin được write**, khách hàng chỉ read/write riêng của họ |

**Trước**:
```firestore rules
match /orders/{orderId} {
  allow read, write: if true;
}
match /menu/{document=**} {
  allow read, write: if true;
}
match /guestChats/{document=**} {
  allow read, write: if true;
}
```

**Sau**:
```firestore rules
// Helper function: Check if user is admin
function isAdmin() {
  return request.auth != null && 
         exists(/databases/$(database)/documents/admin_users/$(request.auth.token.email));
}

// Orders: Only admins can write
match /orders/{orderId} {
  allow read: if true;              // Khách hàng xem đơn của họ
  allow write: if isAdmin();        // Chỉ admin edit
}

// Menu: Only admins can write
match /menu/{document=**} {
  allow read: if true;              // Ai cũng xem menu
  allow write: if isAdmin();        // Chỉ admin edit
}

// Guest Chats: Only admins can reply
match /guestChats/{document=**} {
  allow read: if true;              // Khách xem chat của họ
  allow write: if isAdmin();        // Chỉ admin reply
}

// Settings: Admin-only
match /settings/{docId} {
  allow read: if docId == 'payment_config' || isAdmin();
  allow write: if isAdmin();
}
```

### 11.3 Cấu Trúc Dữ Liệu Document Mẹu

**Collection**: `admin_users`

```json
{
  "email": "phongnhat43@gmail.com",
  "role": "admin",
  "addedAt": { "timestamp": 1709000400000 },
  "addedBy": "bootstrap",
  "status": "active",
  "_immutable": true
}
```

| Field | Kiểu | Mô Tả |
|-------|------|-------|
| email | String | Tài khoản Google (Document ID) |
| role | String | Luôn là "admin" (dùng cho role levels trong tương lai) |
| addedAt | Timestamp | Ngày giờ được cấp quyền |
| addedBy | String | Email người cấp (hoặc "bootstrap") |
| status | String | "active" (có thể soft-delete trong tương lai) |
| _immutable | Boolean | `true` nếu là admin gốc (bảo vệ tài khoản) |

### 11.4 Quy Trình Thực Hiện

#### Bước 1: Cập nhật Bootstrap
- File: `admin-login.html`
- Thêm `role: "admin"` khi tạo admin gốc
- Không thay đổi luồng đăng nhập

#### Bước 2: Cập nhật Add Staff
- File: `admin-dashboard.html`
- Thêm `role: "admin"` khi tạo staff mới
- Cập nhật `renderStaffList()` - Hiển thị label "Quản trị viên"
- Cập nhật delete handler - **Chặn xóa** admin gốc

#### Bước 3: Thắt chặt Firestore Rules
- File: `firestore.rules`
- Thêm helper function `isAdmin()`
- Thay thế toàn bộ `if true` bằng `if isAdmin()`
- Kiểm tra Rules trên Console

#### Bước 4: Ghi nhận Kết Quả
- Tạo file: `admin_role_result.md`
- Liệt kê các file thay đổi
- Mô tả cấu trúc dữ liệu
- Kiểm chứng bảo mật
- Đánh dấu "Hoàn thành ✅"

### 11.5 Kiểm Chứng Bảo Mật

| Test | Kỳ Vọng | Phương Pháp |
|------|--------|-----------|
| Admin gốc không bị xóa | Nút delete ẩn, console không thể delete | Kiểm tra UI + Console |
| Role field có trên tất cả admin | Tất cả email trong admin_users có `role: "admin"` | Query Firestore |
| Rules chặn khách write | Khách không thể tạo/sửa order từ client | Test từ index.html |
| Rules cho phép admin write | Admin vẫn có thể sửa order/menu | Test từ admin-dashboard.html |
| Payload không thay đổi | Các admin hiện tại vẫn có quyền bình thường | Kiểm tra các chức năng |

### 11.6 Lưu Ý Bảo Vệ Hiện Tại

**Hạn chế xóa tài khoản đang đăng nhập**:
```javascript
// Đã có trong admin-dashboard.html
var currentUser = firebase.auth().currentUser;
if (currentUser && currentUser.email === email) {
  alert('Không thể xóa tài khoản đang đăng nhập!');
  return;
}
```

**Thêm hạn chế xóa Admin gốc**:
```javascript
// Cần thêm vào admin-dashboard.html
const BOOTSTRAP_ADMIN = 'phongnhat43@gmail.com';
if (email === BOOTSTRAP_ADMIN) {
  alert('Không thể xóa Admin hệ thống!');
  return;
}
```

### 11.7 Timeline & Status

| Giai Đoạn | Chi Tiết | Status |
|----------|---------|--------|
| Chuẩn bị | Phân tích kế hoạch (11.1 - 11.6) | ✅ Hoàn thành |
| Thực hiện | Áp dụng thay đổi 4 file | ⏳ Đang tiến hành |
| Kiểm chứng | Test bảo mật & chức năng | ⏳ Chuẩn bị |
| Ghi nhận | Tạo admin_role_result.md | ⏳ Chuẩn bị |

---

## 12. NÂNG CẤP LÊN HỆ THỐNG 2 TẦNG (Super Admin vs Staff) - 10/03/2026

### 12.1 Tổng Quan Nâng Cấp

**Chuyển đổi từ**: Admin Group Access (Tất cả admin có full quyền)  
**Sang**: 2-Tier Hierarchical System (Super Admin vs Staff)

**Nguyên tắc**:
- 👑 **super_admin** (Chủ quán): Toàn quyền - Thêm/sửa/xóa Menu, quản lý nhân sự, cấu hình hệ thống
- 👤 **staff** (Nhân viên): Hạn chế - Chỉ xem Menu, duyệt order, đổi trạng thái, reply chat. KHÔNG edit menu, KHÔNG quản lý nhân sự
- 🔐 **Admin gốc** (`phongnhat43@gmail.com`) mặc định = super_admin, bảo vệ tuyệt đối

### 12.2 So Sánh 3 Giai Đoạn Phát Triển

Giai đoạn 1 (Trước): Binary (Admin/Non-admin)  
Giai đoạn 2: Admin Group Access (Tất cả admin = full quyền)  
**Giai đoạn 3 (Hiện tại)**: 2-Tier Hierarchical  

| Tính Năng | Giai Đoạn 1 | Giai Đoạn 2 | Giai Đoạn 3 |
|----------|-----------|-----------|-----------|
| Menu: View | ✅ | ✅ | ✅ (cả super_admin + staff) |
| Menu: Add/Edit/Delete | ⚠️ Tất cả | ⚠️ Tất cả | ✅ Super_admin only |
| Order: View | ✅ | ✅ | ✅ (cả super_admin + staff) |
| Order: Status change | ✅ | ✅ | ✅ (cả super_admin + staff) |
| Order: Delete | ⚠️ Tất cả | ⚠️ Tất cả | ✅ Super_admin only |
| Chat: Reply | ✅ | ✅ | ✅ (cả super_admin + staff) |
| Staff Tab | ✅ | ✅ | ✅ Super_admin only |
| Add Staff | ⚠️ Tất cả | ⚠️ Tất cả | ✅ Super_admin only |
| Settings | ⚠️ Tất cả | ⚠️ Tất cả | ✅ Super_admin only |

### 12.3 Cấu Trúc Dữ Liệu Document Admin

**Collection**: `admin_users`  
**Role Field**: `role` (String) - Giá trị: `"super_admin"` hoặc `"staff"`

#### Super Admin (Chủ quán)
```json
{
  "email": "phongnhat43@gmail.com",
  "role": "super_admin",
  "addedAt": { "seconds": 1709000400 },
  "addedBy": "bootstrap"
}
```

#### Staff (Nhân viên)
```json
{
  "email": "staff1@gmail.com",
  "role": "staff",
  "addedAt": { "seconds": 1709086800 },
  "addedBy": "phongnhat43@gmail.com"
}
```

### 12.4 Quy Trình Thêm Staff Mới

1. **Super Admin** truy cập Tab "Nhân viên"
2. **Chọn vai trò**:
   - 👤 Nhân viên (Staff) - Mặc định
   - 👑 Hệ thống (Super Admin)
3. **Nhập email** → Click "+ Thêm quyền"
4. **System**:
   - Kiểm tra email hợp lệ
   - Tạo document với `role` field
   - Lưu `addedBy` = current user email

### 12.5 Kiểm Soát UI (Client-side)

**Khi login, auth guard kiểm tra role**:

```
User login → Firebase Auth → Check admin_users.role
    ↓
Nếu role = "staff":
  ├─ Ẩn Tab "Nhân viên"
  ├─ Ẩn nút "Thêm món", "Sửa", "Xóa" trong Menu
  ├─ Ẩn nút "Xóa đơn" trong Orders
  └─ Cho phép: View Menu, View Orders, Change Order Status, Reply Chat

Nếu role = "super_admin":
  └─ Hiển thị đầy đủ tất cả tính năng
```

**Implementation**:
- Auth guard (`admin-dashboard.html`) lưu role vào `window.currentUserRole`
- Function `controlUIByRole()` gán attribute `data-role="staff"` hoặc `data-role="super_admin"` vào `<html>`
- CSS rules ẩn các phần tử: `[data-role="staff"] .staff-hidden { display: none; }`
- Admin.js kiểm tra `window.isStaffUser` flag nếu cần kiểm soát động

### 12.6 Firestore Rules - Role-based Access Control

**Helper Functions**:

```firestore rules
function isAdmin() {
  // User có trong admin_users collection
  return request.auth != null && 
         exists(/databases/$(database)/documents/admin_users/$(request.auth.token.email));
}

function isSuperAdmin() {
  // User có role = "super_admin"
  return request.auth != null && 
         get(/databases/$(database)/documents/admin_users/$(request.auth.token.email)).data.role == 'super_admin';
}
```

**Rules by Collection**:

| Collection | Read | Write | Chú Ý |
|-----------|------|-------|-------|
| orders | if true | if isAdmin() | Tất cả admin có thể đổi status |
| menu | if true | if isSuperAdmin() | Chỉ super_admin sửa menu |
| guestChats | if true | if isAdmin() | Tất cả admin có thể reply |
| settings | payment_config: true, else isAdmin() | if isSuperAdmin() | Chỉ super_admin cấu hình |
| admin_users | if request.auth != null | if isSuperAdmin() | Chỉ super_admin quản lý nhân sự |

### 12.7 File Thay Đổi

| File | Thay Đổi | Chi Tiết |
|------|---------|---------|
| **admin-login.html** | Role bootstrap | `role: 'super_admin'` cho admin gốc |
| **admin-dashboard.html** | UI + Auth Guard | Thêm select role, gán `data-role` attribute, `controlUIByRole()` |
| **admin.js** | Role-based flag | Kiểm tra `window.isStaffUser` nếu cần |
| **firestore.rules** | isSuperAdmin() helper + rules | Tighter access control cho admin_users + menu + settings |
| **admin_role.md** | Phần 12 | Mô tả 2-tier system (file này) |
| **admin_role_result.md** | Cập nhật kết quả | Ghi nhận quá trình implement |

### 12.8 Ví Dụ Thực Tế

#### Scenario 1: Super Admin cấp quyền
1. Super Admin truy cập Tab "Nhân viên"
2. Nhập email: `john@gmail.com`
3. Chọn: 👤 Nhân viên (Staff)
4. Click "+ Thêm quyền"
5. **Result**: Document được tạo với `role: 'staff'`

#### Scenario 2: Staff đăng nhập
1. John (`john@gmail.com`) login
2. Auth guard kiểm tra role = `"staff"`
3. `controlUIByRole("staff")` được gọi
4. `<html data-role="staff">` được set
5. **UI**:
   - Tab "Nhân viên" ẩn ✓
   - Nút "Thêm món" ẩn ✓
   - Nút "Xóa đơn" ẩn ✓
   - Nhưng vẫn có thể: Xem menu, duyệt order, đổi status, reply chat ✓

#### Scenario 3: Staff thử edit menu từ Console
1. Staff đăng nhập từ browser
2. Mở Console → Firebase write: `db.collection('menu').doc('item1').update({...})`
3. **Firestore Rules kiểm tra**: `isSuperAdmin()` → FALSE
4. **Result**: Permission denied ✓

---

**Ghi chú**: File này mô tả trạng thái hiện tại và kế hoạch nâng cấp. Sẽ được cập nhật khi hoàn thành.
