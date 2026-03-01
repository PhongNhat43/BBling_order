# Hướng dẫn sửa lỗi Firebase không hiển thị dữ liệu

## Vấn đề
Log cho thấy write/read thành công nhưng Firebase Console không hiển thị dữ liệu.

## Nguyên nhân
File `firestore.rules` thiếu rule cho collection `test` → ghi dữ liệu bị chặn ngầm.

## Giải pháp

### Bước 1: Cập nhật Firestore Rules (đã fix trong code)
File `firestore.rules` đã được cập nhật thêm:
```
match /test/{document=**} {
  allow read, write: if true;
}
```

### Bước 2: Deploy rules lên Firebase
```bash
# Cài Firebase CLI nếu chưa có
npm install -g firebase-tools

# Đăng nhập
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

### Bước 3: Test lại
1. Mở `firebase-test.html`
2. Bấm "Test Write to Firestore"
3. Kiểm tra log:
   - Nếu thấy "✅ Write test successful - Data verified in Firestore" → OK
   - Nếu thấy "⚠️ Write completed but document not found" → Rules chưa được deploy

### Bước 4: Xác minh trên Firebase Console
1. Mở https://console.firebase.google.com/project/b-bling-coffee/firestore
2. Kiểm tra collection `test` → phải có document `connection-test`
3. Kiểm tra collection `orders` → phải có các BILL... documents
4. Kiểm tra collection `menu` → phải có document `data`

## Cải tiến đã thực hiện
- Thêm verify sau mỗi lần write để đảm bảo dữ liệu thực sự được lưu
- Hiển thị error code chi tiết khi gặp lỗi
- Thêm link trực tiếp đến Firebase Console để kiểm tra document
- Cảnh báo về việc deploy rules trên giao diện test

## Kiểm tra nhanh
```javascript
// Trong Console của firebase-test.html
const testDoc = await window.bbDb.collection('test').doc('connection-test').get();
console.log('Document exists:', testDoc.exists);
console.log('Data:', testDoc.data());
```

Nếu `exists: false` → Rules chưa deploy hoặc chưa có quyền ghi.
