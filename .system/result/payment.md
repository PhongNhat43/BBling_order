# KET QUA CAP NHAT PAYMENT (10/03/2026)

## 1. Da trien khai theo yeu cau
- Chuyen luong dat hang sang **chi chuyen khoan** (loai bo lua chon tien mat tren UI checkout).
- Them hang so `SHOP_LOCATION = { lat, lng }` trong `payment.html`.
- Them ham `calculateDistance(lat1, lon1, lat2, lon2)` dung cong thuc Haversine.
- Bat buoc khach **ghim vi tri** truoc khi mo khoa thanh toan.
- Them geo-fencing ban kinh 2km:
	- `> 2km`: thong bao do va khoa thanh toan.
	- `<= 2km`: thong bao xanh va mo khoa VietQR + upload bien lai.

## 2. Luu tru Firestore
- Da bo sung truong bat buoc khi tao don:
	- `distance`: so km tinh duoc.
	- `coordinates`: `{ lat, lng }` cua vi tri da ghim.

## 3. Admin Dashboard
- Da bo sung hien thi khoang cach tren tung don trong Tab Orders bang badge:
	- Dinh dang: `📍 x.xx km`.
- Da bo sung hien thi khoang cach + toa do trong modal chi tiet don.

## 4. Telegram Notification
- Da cap nhat noi dung thong bao don moi theo format:
	- `Don hang moi - [So tien] - Cach quan [so km] km`

## 5. File da cap nhat
- `payment.html`
- `admin.js`
- `.system/planning/business_logic.md`
- `.system/result/payment.md`

## 6. Ghi chu
- Trang thai don tao moi hien tai: `pending_transfer`.
- Cac don cu co `cash` van duoc hien thi de tuong thich lich su.
