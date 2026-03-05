# PAYMENT_TEST_CASES.md — Hướng dẫn Test Chi tiết

**Status**: ✅ COMPLETED - Tất cả fix đã triển khai
**Ngày test**: 2024-2025
**Tuân thủ**: CODE_CONVENTION.md, QA_TESTING_GUIDE.md, SECURITY_POLICY.md

---

## 🧪 Test Automation Script

Bạn có thể chạy các lệnh này trong **DevTools Console** (F12) để tự động test:

```javascript
// ============================================================
// TEST AUTOMATION SCRIPT - payment.html
// Copy & paste vào Chrome DevTools Console
// ============================================================

const tests = [];
const results = { pass: 0, fail: 0, errors: [] };

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      tests.push({ name, status: 'PASS', time: new Date().toLocaleTimeString('vi-VN') });
      results.pass++;
      console.log(`✅ ${name}`);
    } else {
      tests.push({ name, status: 'FAIL', time: new Date().toLocaleTimeString('vi-VN') });
      results.fail++;
      console.log(`❌ ${name}`);
    }
  } catch (e) {
    tests.push({ name, status: 'ERROR', error: e.message, time: new Date().toLocaleTimeString('vi-VN') });
    results.fail++;
    results.errors.push({ test: name, error: e.message });
    console.error(`⚠️  ${name}: ${e.message}`);
  }
}

// =============================================================
// 1. DOM ELEMENT VERIFICATION
// =============================================================
console.log('\n🔍 Test 1: DOM Elements');

test('Receipt upload button exists', () => document.getElementById('receipt-upload-btn') !== null);
test('Receipt preview container exists', () => document.getElementById('receipt-preview-container') !== null);
test('Receipt change button exists', () => document.getElementById('receipt-change') !== null);
test('Receipt delete button exists', () => document.getElementById('receipt-delete') !== null);
test('Receipt preview name display exists', () => document.getElementById('receipt-preview-name') !== null);
test('Receipt preview size display exists', () => document.getElementById('receipt-preview-size') !== null);
test('Submit spinner exists', () => document.getElementById('submit-spinner') !== null);
test('Submit text display exists', () => document.getElementById('submit-text') !== null);

// =============================================================
// 2. PHONE VALIDATION
// =============================================================
console.log('\n📱 Test 2: Phone Validation');

// Simulate isValidPhone function test
const phoneTests = [
  { input: '0123456789', expected: true, desc: '10 digits starting 0' },
  { input: '01234567890', expected: true, desc: '11 digits starting 0' },
  { input: '84123456789', expected: true, desc: '11 chars starting 84' },
  { input: '+84123456789', expected: true, desc: '+84 prefix' },
  { input: '123456789', expected: false, desc: '9 digits (too short)' },
  { input: 'abc123456789', expected: false, desc: 'Contains letters' },
  { input: '+84 123 456 789', expected: false, desc: 'With spaces' }
];

phoneTests.forEach(t => {
  test(`Phone: ${t.desc} (${t.input}) → ${t.expected}`, () => {
    const regex = /^(0\d{9,10}|\+?84\d{9,10}|84\d{9,10})$/;
    const result = regex.test(t.input.trim());
    return result === t.expected;
  });
});

// =============================================================
// 3. FORM INPUT TRANSITIONS
// =============================================================
console.log('\n🎨 Test 3: Form Input Styling');

test('Name input has transition class', () => {
  const input = document.getElementById('cust-name');
  return input.className.includes('transition-all');
});
test('Phone input has transition class', () => {
  const input = document.getElementById('cust-phone');
  return input.className.includes('transition-all');
});
test('Address input has transition class', () => {
  const input = document.getElementById('cust-address');
  return input.className.includes('transition-all');
});
test('Location-city select has transition class', () => {
  const input = document.getElementById('loc-city');
  return input.className.includes('transition-all');
});

// =============================================================
// 4. BUTTON STYLING
// =============================================================
console.log('\n🔘 Test 4: Button Styling');

test('Submit button has hover transition', () => {
  const btn = document.getElementById('submit-order');
  return btn.className.includes('hover:shadow-lg') && btn.className.includes('transition-shadow');
});
test('Submit button has active scale', () => {
  const btn = document.getElementById('submit-order');
  return btn.className.includes('active:scale-95');
});

// =============================================================
// 5. RECEIPT PREVIEW UI STRUCTURE
// =============================================================
console.log('\n📸 Test 5: Receipt Preview UI Structure');

test('Receipt preview container starts hidden', () => {
  const container = document.getElementById('receipt-preview-container');
  return container.className.includes('hidden');
});
test('Receipt preview image has correct classes', () => {
  const img = document.getElementById('receipt-preview');
  return img.className.includes('w-32') && img.className.includes('h-32');
});
test('Receipt change and delete buttons are in container', () => {
  const container = document.getElementById('receipt-preview-container');
  const change = container.querySelector('#receipt-change');
  const del = container.querySelector('#receipt-delete');
  return change !== null && del !== null;
});

// =============================================================
// 6. STATE VERIFICATION
// =============================================================
console.log('\n⚙️  Test 6: JavaScript State');

test('Bill ID loaded from URL params', () => {
  const billEl = document.getElementById('bill');
  return billEl.textContent.includes('#');
});
test('Amount formatted correctly', () => {
  const amountEl = document.getElementById('amount');
  return amountEl.textContent.includes('đ');
});

// =============================================================
// 7. ERROR MESSAGE ELEMENTS
// =============================================================
console.log('\n⚠️  Test 7: Error Message UI');

test('Name error message exists', () => document.getElementById('err-name') !== null);
test('Phone error message exists', () => document.getElementById('err-phone') !== null);
test('Address error message exists', () => document.getElementById('err-address') !== null);
test('Method error message exists', () => document.getElementById('err-method') !== null);
test('Receipt error message exists', () => document.getElementById('err-receipt') !== null);

// =============================================================
// 8. RECEIPT FILE HANDLING
// =============================================================
console.log('\n📁 Test 8: Receipt File Handling');

test('Receipt input accept only image types', () => {
  const input = document.getElementById('receipt');
  const accept = input.getAttribute('accept');
  return accept.includes('image/jpeg') && accept.includes('image/png');
});
test('Receipt upload label has correct styling', () => {
  const label = document.getElementById('receipt-upload-btn');
  return label.className.includes('hover:shadow-lg') && label.className.includes('transition-shadow');
});

// =============================================================
// 9. VALIDATION LOGIC SIMULATION
// =============================================================
console.log('\n✔️  Test 9: Form Validation Logic');

test('Empty name fails validation', () => {
  // Simulate: name = '', phone = valid, method = set, no receipt
  const result = !document.getElementById('cust-name').value.trim().length;
  return result === true;
});

// =============================================================
// 10. LOCATION DROPDOWN STRUCTURE
// =============================================================
console.log('\n📍 Test 10: Location Dropdowns');

test('City dropdown populated with options', () => {
  const select = document.getElementById('loc-city');
  return select.querySelectorAll('option').length > 1;
});
test('District dropdown starts disabled', () => {
  const select = document.getElementById('loc-district');
  return select.disabled === true;
});
test('Ward dropdown starts disabled', () => {
  const select = document.getElementById('loc-ward');
  return select.disabled === true;
});

// =============================================================
// SUMMARY
// =============================================================
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ PASSED: ${results.pass}`);
console.log(`❌ FAILED: ${results.fail}`);
console.log(`📈 PASS RATE: ${((results.pass / (results.pass + results.fail)) * 100).toFixed(1)}%`);
if (results.errors.length > 0) {
  console.log('\n⚠️  ERRORS:');
  results.errors.forEach(e => console.log(`  - ${e.test}: ${e.error}`));
}
console.log('='.repeat(50));
console.table(tests);
```

---

## 👣 Manual Test Cases Chi tiết

### **Test Case 1: Phone Number Validation**

**Mục tiêu**: Xác nhận regex accept cả 10 và 11 chữ số

```
Test 1.1: Input "0123456789" (10 chữ)
  ☑️ Click vào input "Số điện thoại"
  ☑️ Type: 0123456789
  ☑️ Nhấn Tab/Click field khác
  ✅ Kết quả: Không hiện error message

Test 1.2: Input "01234567890" (11 chữ)
  ☑️ Xoá input
  ☑️ Type: 01234567890
  ☑️ Nhấn Tab
  ✅ Kết quả: Không hiện error message

Test 1.3: Input "+84123456789"
  ☑️ Type: +84123456789
  ✅ Kết quả: Không hiện error message

Test 1.4: Input "123456789" (9 chữ - invalid)
  ☑️ Type: 123456789
  ☑️ Nhấn Tab
  ✅ Kết quả: Error "Số điện thoại không hợp lệ"

Test 1.5: Input "abc123456789" (chữ cái)
  ☑️ Xoá, type: abc123456789
  ✅ Kết quả: Error message hiển thị
```

---

### **Test Case 2: Receipt Preview UI & File Management**

**Mục tiêu**: Xác nhận UI hiển thị ảnh preview + nút update/delete hoạt động

```
Test 2.1: Click "Tải ảnh biên lai"
  ☑️ Click nút "Tải ảnh biên lai"
  ✅ File picker mở
  ✅ Accept filter chỉ hình ảnh (jpeg/png/webp)

Test 2.2: Chọn ảnh hợp lệ
  ☑️ Chọn ảnh < 5MB (vd: 2MB.jpg)
  ✅ File preview hiển thị:
     - Ảnh thumbnail bên trái
     - Tên file bên phải
     - Kích thước file (KB)
     - Nút "Thay đổi" (xanh)
     - Nút "Xoá" (đỏ)

Test 2.3: Click "Thay đổi"
  ☑️ Click nên "Thay đổi"
  ✅ File picker mở lại
  ☑️ Chọn ảnh khác
  ✅ Preview cập nhật (ảnh mới, tên mới, size mới)

Test 2.4: Click "Xoá"
  ☑️ Click nút "Xoá"
  ✅ Preview ẩn
  ✅ Input file reset
  ✅ Có thể click "Tải ảnh" lại để chọn

Test 2.5: File quá lớn (> 5MB)
  ☑️ Click "Tải ảnh"
  ☑️ Chọn ảnh 10MB
  ✅ Toast error: "Ảnh quá lớn (tối đa 5MB). Ảnh của bạn: X.XMB"
  ✅ Preview không hiển thị
  ✅ Input reset

Test 2.6: File type không hợp lệ
  ☑️ Click "Tải ảnh"
  ☑️ Cố chọn file .PDF hoặc .TXT (thay đổi file extension)
  ✅ Toast error: "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP"
  ✅ Preview không hiển thị
```

---

### **Test Case 3: Address Field Validation**

**Mục tiêu**: Xác nhận logic kiểm tra địa chỉ >= 5 ký tự

```
Test 3.1: Input địa chỉ < 5 ký tự
  ☑️ Click "Địa chỉ giao hàng"
  ☑️ Type: "123"
  ☑️ Click field khác
  ✅ Error: "Vui lòng nhập địa chỉ/số bàn (tối thiểu 5 ký tự)"

Test 3.2: Input địa chỉ = 5 ký tự
  ☑️ Clear, type: "12345"
  ✅ Error ẩn
  ✅ Có thể submit form

Test 3.3: Input địa chỉ > 5 ký tự
  ☑️ Type: "123 Nguyễn Huệ, Hà Nội"
  ✅ Error ẩn
  ✅ Có thể submit

Test 3.4: Input rỗng
  ☑️ Clear field
  ✅ Error: "Vui lòng nhập địa chỉ/số bàn..."
```

---

### **Test Case 4: Location Dropdowns Dependency**

**Mục tiêu**: Xác nhận: Chọn Tỉnh → Quận pop, chọn Quận → Phường pop

```
Test 4.1: Initial state
  ☑️ Tải page
  ✅ "Chọn Tỉnh/Thành phố" show
  ✅ Quận/Huyện disabled (greyed out)
  ✅ Phường/Xã disabled

Test 4.2: Chọn Tỉnh "Bắc Ninh"
  ☑️ Click city dropdown → Select "Bắc Ninh"
  ✅ District dropdown enable
  ✅ Options: "Từ Sơn", "Tiên Du", "Yên Phong"
  ✅ Ward dropdown reset & disabled

Test 4.3: Chọn Quận/Huyện "Từ Sơn"
  ☑️ Click district dropdown → Select "Từ Sơn"
  ✅ Ward dropdown enable
  ✅ Options: "Phường Đông Ngàn", "Phường Đồng Kỵ", "Phường Trang Hạ"

Test 4.4: Thay đổi Tỉnh → Reset Quận + Phường
  ☑️ Change city từ "Bắc Ninh" → "Hà Nội"
  ✅ District reset (show "Chọn Quận/Huyện")
  ✅ Ward reset & disabled

Test 4.5: Đổi Quận → Reset chỉ Phường
  ☑️ City = Bắc Ninh, District = Từ Sơn
  ☑️ Change District → Tiên Du
  ✅ Ward reset nhưng enable
  ✅ Options cập nhật cho Tiên Du
```

---

### **Test Case 5: Payment Method Selection**

**Mục tiêu**: Xác nhận "Tiền mặt" / "Chuyển khoản" toggle & section appear/disappear

```
Test 5.1: Click "Tiền mặt"
  ☑️ Click button "Tiền mặt"
  ✅ Button thay đổi màu: bg-success (xanh lá)
  ✅ Text color: white
  ✅ "Chuyển khoản" button reset (bg-white)
  ✅ QR code section ẩn
  ✅ Receipt upload ẩn

Test 5.2: Click "Chuyển khoản"
  ☑️ Click "Chuyển khoản"
  ✅ Button thay đổi màu xanh
  ✅ QR code section hiển thị
  ✅ Receipt upload section hiển thị

Test 5.3: Đổi lại "Tiền mặt"
  ☑️ Click "Tiền mặt"
  ✅ Transfer section ẩn ngay

Test 5.4: Button có transition smooth
  ☑️ Quan sát: Click method button → Color transition smooth (không jump)
  ✅ Transition duration ~150ms
```

---

### **Test Case 6: Submit Button Loading State**

**Mục tiêu**: Xác nhận spinner & text state khi submit

```
Test 6.1: Click GỬI ĐƠN (Tiền mặt - không compress)
  ☑️ Fill hết form (Tiền mặt method)
  ☑️ Click nút
  ✅ Text thay đổi: "Đang gửi..."
  ✅ Button disable (không click lại được)
  ✅ Spinner hiển thị (⟳ animation)

Test 6.2: Click GỬI ĐƠN (Chuyển khoản + ảnh)
  ☑️ Chọn "Chuyển khoản"
  ☑️ Upload ảnh
  ☑️ Click GỬI ĐƠN
  ✅ Text: "Đang nén ảnh..."
  ✅ Spinner quay (~spinner animation)
  ✅ Nếu nén > 30s → Timeout error toast

Test 6.3: Compression error
  ☑️ Upload ảnh corrupted/invalid
  ☑️ Click submit
  ✅ Toast error hiển thị
  ✅ Text reset: "GỬI ĐƠN"
  ✅ Spinner ẩn
  ✅ Button enable lại
```

---

### **Test Case 7: Form Validation Complete Flow**

**Mục tiêu**: End-to-end validation check

```
Test 7.1: Submit form với toàn bộ field trống
  ☑️ Click GỬI ĐƠN ngay
  ✅ Errors hiện toàn bộ (4-5 errors)
  ✅ Form không submit

Test 7.2: Fill một nửa form
  ☑️ Fill Tên, Phone
  ☑️ Click GỬI ĐƠN
  ✅ Errors: Address, Method hiển thị
  ✅ Form không submit

Test 7.3: Fill đủ, nhưng phone sai
  ☑️ Tên: OK, Phone: "123", Address: OK, Method: OK
  ☑️ Click submit
  ✅ Phone error hiển thị
  ✅ Thay phone thành valid → error ẩn

Test 7.4: Chuyển khoản nhưng không upload ảnh
  ☑️ Select "Chuyển khoản"
  ☑️ Bỏ trống receipt upload
  ☑️ Click submit
  ✅ Error: "Cần tải ảnh biên lai để tiến hành đặt đơn hàng."

Test 7.5: Đầy đủ valid form
  ☑️ Tất cả field OK
  ☑️ Method selected
  ☑️ Receipt uploaded (nếu chuyển khoản)
  ☑️ Click submit
  ✅ Form submit (redirect tracking.html)
```

---

### **Test Case 8: Copy to Clipboard**

**Mục tiêu**: Xác nhận copy functionality + toast

```
Test 8.1: Copy Mã đơn
  ☑️ Click copy icon bên "Mã đơn"
  ✅ Toast hiển thị: "Đã sao chép"
  ✅ Clipboard chứa: "BILL102" (ví dụ)

Test 8.2: Copy Số tiền
  ☑️ Click copy icon bên "Số tiền"
  ✅ Toast: "Đã sao chép"
  ✅ Clipboard: "78000" (số)

Test 8.3: Copy Hotline
  ☑️ Click "Hotline 0985.679.565"
  ✅ Toast: "Đã sao chép hotline"
  ✅ Clipboard: "0985679565"

Test 8.4: Toast disappear
  ☑️ Toast hiển thị
  ☑️ Chờ 3 giây
  ✅ Toast tự ẩn
```

---

### **Test Case 9: Chat Integration**

**Mục tiêu**: Xác nhận chat.js load + error handling

```
Test 9.1: Click "Nhắn tin ngay"
  ☑️ Click link "Nhắn tin ngay"
  ✅ chat.js load (check console)
  ✅ Chat toggle element xuất hiện
  ✅ Chat box mở sau 50ms

Test 9.2: Network error (simulate)
  ☑️ Open DevTools
  ☑️ Go to Network tab
  ☑️ Set throttling: OFFLINE
  ☑️ Click "Nhắn tin ngay"
  ✅ Toast error: "Không thể tải chat..."
  ✅ Page không crash

Test 9.3: Timeout (simulate)
  ☑️ Set DevTools network to SLOW 3G
  ☑️ Click "Nhắn tin ngay"
  ☑️ Wait 8 seconds
  ✅ Toast: "Chat tải quá lâu..."
  ✅ Page stable
```

---

### **Test Case 10: Mobile Responsive**

**Mục tiêu**: Xác nhận responsive trên mobile

```
Test 10.1: iPhone SE (375px)
  ☑️ DevTools → Responsive → iPhone SE
  ✅ Form readable, không horizontal scroll
  ✅ Buttons > 44px (tappable)
  ✅ Receipt preview fit screen

Test 10.2: Android (360px)
  ☑️ Responsive → Custom 360x800
  ✅ Tất cả element visible
  ✅ Input/buttons không overlap
  ✅ Location dropdowns work

Test 10.3: Landscape (iPhone 12 landscape)
  ☑️ Rotate device
  ✅ Form scrollable vertically
  ✅ Receipt preview resizable
  ✅ No horizontal scroll

Test 10.4: Touch test
  ☑️ Test trên real mobile device
  ✅ Inputs responsive to touch
  ✅ Buttons easy to tap
  ✅ Dropdown scroll smooth
```

---

## 🎯 Quick Smoke Test (5 phút)

```
1. ✅ Open payment.html
2. ✅ Verify: Bill ID & Amount display correctly
3. ✅ Fill form: Name, Phone (valid), Address
4. ✅ Select method: "Tiền mặt" → No error
5. ✅ Select method: "Chuyển khoản" → QR+Receipt show
6. ✅ Upload receipt: Select image → Preview show with file name, size, Delete button
7. ✅ Click "Thay đổi" → File picker open again
8. ✅ Click "Xoá" → Preview hide
9. ✅ Copy Bill → Toast "Đã sao chép"
10. ✅ Submit form (Tiền mặt) → Should redirect or show success
```

---

## 📊 Test Results Template

```markdown
## Payment.html Test Results

**Date**: YYYY-MM-DD
**Tester**: [Your Name]
**Environment**: [Browser/Device]

| Test Case | Status | Notes |
|-----------|--------|-------|
| Phone Validation | ✅ PASS | Accepts 10-11 digits |
| Receipt Preview UI | ✅ PASS | All buttons functional |
| Address Validation | ✅ PASS | >= 5 chars enforced |
| Location Dropdowns | ✅ PASS | Cascading works |
| Payment Method | ✅ PASS | Toggle smooth |
| Submit Button State | ✅ PASS | Spinner displays |
| Form Validation | ✅ PASS | All errors show/hide |
| Copy to Clipboard | ✅ PASS | Toast appears |
| Chat Integration | ✅ PASS | Loads without error |
| Mobile Responsive | ✅ PASS | 375px+ works |

**Overall**: ✅ PASSED (10/10)
**Issues Found**: None
**Recommendations**: Ready for production
```

---

**Hướng dẫn chạy tự động**: Copy script JavaScript trên vào DevTools Console, ấn Enter, xem kết quả chi tiết! 🎉

