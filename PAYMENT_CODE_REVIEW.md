# PAYMENT_CODE_REVIEW.md — Review Code payment.html

## 📋 Phân tích Tuân thủ Quy tắc

### ✅ Tuân thủ tốt

- ✅ Sử dụng màu chính xác (primary, cream, accent, success)
- ✅ CSS shadow-soft thống nhất
- ✅ Tailwind utilities được dùng đúng (rounded-lg, border, px-3, py-2)
- ✅ camelCase cho biến/hàm (formatVND, validateAndShow, copyText)
- ✅ kebab-case cho ID (bill, amount, cust-name, receipt, etc.)
- ✅ textContent thay vì innerHTML (an toàn XSS)
- ✅ Tách URL params logic khỏi UI
- ✅ Tách Firebase logic thành try/catch

---

## ⚠️ Lỗi Tiềm ẩn Tìm Thấy

### 1. **Logic lỗi kiểm tra địa chỉ** (CRITICAL)
```javascript
// Dòng ~269: Logic sai
const addrWarn = (addrVal.length === 0) || (addrVal.length > 0 && addrVal.length < 5)
// Điều kiện thứ hai luôn sai vì:
// - Nếu addrVal.length === 0: true (thoát luôn)
// - Nếu addrVal.length > 0 && < 5: không bao giờ vào vì === 0 đã thoát ở trên

// Fix: Đúng logic DRY
const addrWarn = addrVal.length === 0 || (addrVal.length > 0 && addrVal.length < 5)
// Hay đơn giản hơn:
const addrWarn = addrVal.length === 0 || (addrVal.length > 0 && addrVal.length < 5)
```

### 2. **Phone validation không accept prefix đúng** (HIGH)
```javascript
// Dòng ~264: Regex chỉ accept 10 chữ số sau 0
const v = (s||'').trim()
return /^(0\d{9}|\+?84\d{9})$/.test(v)

// Problem: 
// - "0123456789" (10 chữ) → ✓ OK (0 + 9 digits)
// - "01234567890" (11 chữ) → ✗ FAIL (0 + 10 digits)
// Việt Nam dùng cả hai định dạng:
// - Số cố định: 10-11 chữ
// - +84: prefix +84 + 9-10 chữ

// Fix: Accept flexible
/^(0\d{9,10}|\+?84\d{9,10})$|^84\d{9,10}$/
```

### 3. **Missing receipt preview with delete/update** (MEDIUM)
```javascript
// Hiện tại chỉ show ảnh preview, không có:
// ❌ Nút Delete (xoá file đã chọn)
// ❌ Nút Change (chọn file mới)
// ❌ Tên file hiển thị rõ
// ❌ File size hiển thị
```

### 4. **Missing file size validation** (MEDIUM)
```javascript
// receiptInput.addEventListener('change', ) không kiểm tra:
// ❌ File size (ảnh lớn sẽ slow)
// ❌ File type (chỉ cho phép jpg/png)
// ❌ Compression error handling rõ ràng
```

### 5. **Image compression không có timeout/fallback** (HIGH)
```javascript
// Dòng ~298: ImageUtils.compressReceiptImage() có thể:
// ❌ Timeout nếu ảnh quá lớn
// ❌ Browser tab không response
// ❌ Không có fallback nếu không support
```

### 6. **Missing error feedback for chat.js loading** (MEDIUM)
```javascript
// Dòng ~328-343: Load chat.js dynamic
// ❌ Không handle network error
// ❌ Không có timeout
// ❌ Nếu script fail, click không làm gì cả
```

### 7. **No smooth transitions on buttons** (LOW)
```javascript
// Buttons không có transition smooth:
// ❌ Hover → shadow-lg không animate
// ❌ Click → active:scale-95 màu nền thay đổi tức thì không smooth
// ❌ .classList.add('bg-success') không có transition time
```

### 8. **Firebase error handling cần try/catch** (MEDIUM)
```javascript
// Dòng ~319: 
// firebase.firestore.FieldValue.serverTimestamp()
// // Nếu firebase không initialize → Crash
// // Không có fallback timestamp
```

### 9. **Address validation không consistent** (LOW)
```javascript
// Input địa chỉ:
// ❌ Placeholder "*" không consistent
// ❌ Có "Địa chỉ giao hàng*" (có *) nhưng "Địa điểm (tùy chọn)" không rõ
```

### 10. **No visual loading indicator** (MEDIUM)
```javascript
// Khi "Đang nén ảnh...":
// ❌ Không có spinner
// ❌ User không know đang loading hay stuck
// ❌ Không có cancel option
```

---

## 🔧 Danh sách Sửa chữa Cần Làm

| # | Lỗi | Severity | Fix |
|----|------|----------|-----|
| 1 | Address logic | CRITICAL | Rewrite addrWarn condition logic |
| 2 | Phone regex | HIGH | Update regex để accept 9-10 digits |
| 3 | Receipt preview | MEDIUM | Thêm ô preview với nút Delete/Change |
| 4 | File size | MEDIUM | Validate file size < 5MB |
| 5 | Compression timeout | HIGH | Add timeout, fallback |
| 6 | Chat.js error | MEDIUM | Add try/catch, timeout |
| 7 | Button transitions | LOW | Add transition-all duration-150 |
| 8 | Firebase error | MEDIUM | Add fallback timestamp |
| 9 | Loading indicator | MEDIUM | Add spinner animation |
| 10 | Consistent labels | LOW | Fix placeholder text consistency |

---

## 📝 Test Cases Chi tiết

### Test Case 1: Phone Validation
```
☑ Input: "0123456789" (10 chữ) → ✓ PASS
☑ Input: "01234567890" (11 chữ) → ✓ PASS
☑ Input: "84123456789" (11 chữ) → ✓ PASS
☑ Input: "+84123456789" (12 ký tự) → ✓ PASS
☑ Input: "123456789" (9 chữ) → ✗ FAIL (tối thiểu 10)
☑ Input: "abc123456789" → ✗ FAIL
☑ Error message hiển thị: "Số điện thoại không hợp lệ"
```

### Test Case 2: Receipt Upload & Preview
```
☑ Click "Tải ảnh biên lai" → File picker mở
☑ Chọn ảnh hợp lệ → Preview hiển thị
☑ Preview có nút "Thay đổi" → Click → File picker mở lại
☑ Preview có nút "Xoá" → Click → Preview ẩn, input reset
☑ Preview show file name & size
☑ File size > 5MB → Error toast "Ảnh quá lớn (max 5MB)"
☑ File type không image → Error toast "Chỉ nhận ảnh (jpg/png)"
```

### Test Case 3: Form Validation
```
☑ Không nhập Tên → Error "Vui lòng nhập tên."
☑ Nhập tên + không nhập Số điện thoại → Error "Số điện thoại không hợp lệ"
☑ Không chọn Phương thức → Error "Vui lòng chọn phương thức"
☑ Địa chỉ < 5 ký tự → Error "Vui lòng nhập địa chỉ/số bàn (tối thiểu 5 ký tự)"
☑ Chuyển khoản + không upload biên lai → Error "Cần tải ảnh biên lai"
☑ Điền hết form đúng → Submit enable
```

### Test Case 4: Address Dropdown
```
☑ Chọn Tỉnh "Bắc Ninh" → Quận/Huyện populate
☑ Chọn Quận "Từ Sơn" → Phường/Xã populate
☑ Đổi Tỉnh → Reset Quận & Phường
☑ Đổi Quận → Reset Phường chỉ
☑ Chọn địa chỉ thoại chọn → Thoại Combobox disabled
```

### Test Case 5: Payment Method Selection
```
☑ Click "Tiền mặt" → Button highlight (success color)
☑ section-transfer ẩn
☑ Click "Chuyển khoản" → Button highlight
☑ section-transfer hiển thị (QR + receipt upload)
☑ Đổi từ "Chuyển khoản" → "Tiền mặt" → receipt upload ẩn
```

### Test Case 6: Image Compression & Upload
```
☑ Chọn ảnh 2MB → Submit → "Đang nén ảnh..." + spinner
☑ Nén thành công → "Đang gửi..."
☑ Upload thành công → Redirect tracking.html?orderId=...
☑ Nén lỗi → Error toast + button reset
☑ No timeout > 30s (user không hang browser)
```

### Test Case 7: Copy to Clipboard
```
☑ Click "Copy" icon bên Mã đơn → Toast "Đã sao chép"
☑ Click "Copy" icon bên Số tiền → Toast "Đã sao chép"
☑ Click Hotline → Clipboard có "0985679565"
```

### Test Case 8: Chat Integration
```
☑ Click "Nhắn tin ngay" → chat.js load
☑ Chat toggle visible after 50ms
☑ Click → Chat box mở
☑ Network error → Graceful fallback (không crash)
```

### Test Case 9: Mobile Responsive
```
☑ iPhone 375px: Form readable, buttons tappable (>44px)
☑ Landscape: Modal/form scrollable
☑ Touch: No accidental clicks outside modal
☑ Preview image: Fit screen, scrollable if large
```

### Test Case 10: Form Submission
```
☑ Valid data + "Tiền mặt" → Success redirect
☑ Valid data + "Chuyển khoản" + receipt → Success redirect
☑ Network error → Error toast, button reset
☑ sessionStorage cleared → Error "Không tìm thấy giỏ hàng"
☑ Invalid orderId param → Fallback: bill = 'BILL102'
```

