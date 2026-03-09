# Ke hoach chuyen doi Dynamic Size System

## 1. Muc tieu
- Loai bo co che size co dinh `S/M/L`.
- Chuyen sang size dong, cho phep ten bat ky: `350ml`, `Chai 1L`, `Ly lon`...
- Khong gioi han so luong size tren moi mon.
- Giu tuong thich nguoc voi du lieu cu va khong lam gay luong Firebase.

## 2. Cau truc du lieu moi

### 2.1 Menu item (moi)
```json
{
  "id": "tea-mango-cc",
  "name": "Mango Cream Cheese Tea",
  "priceK": 52,
  "hasSizes": true,
  "availableSizes": [
    { "label": "350ml", "priceK": 45, "isDefault": false },
    { "label": "500ml", "priceK": 52, "isDefault": true },
    { "label": "700ml", "priceK": 58, "isDefault": false }
  ],
  "desc": "...",
  "img": "...",
  "cat": "cat-tea",
  "visible": true
}
```

### 2.2 Order item snapshot
```json
{
  "id": "tea-mango-cc",
  "name": "Mango Cream Cheese Tea",
  "size": "500ml",
  "unitPriceK": 52,
  "priceK": 52,
  "qty": 2,
  "img": "..."
}
```

## 3. Backward compatibility
- Neu item chi co `sizes: {S,M,L}` + `defaultSize`: he thong tu convert runtime sang `availableSizes[]`.
- Neu item khong co size: van dung `priceK`.
- Moi cong thuc tinh tien uu tien `unitPriceK`, fallback `priceK`.

## 4. Ke hoach trien khai

### Pha 1 - Data layer
1. `menu-store.js`
- Chuyen `DEFAULT_ITEMS` sang `availableSizes[]`.
- Them `getItemAvailableSizes(item)` de chuan hoa du lieu moi/cu.
- Sua `getItemPriceK(item, label)` theo nhan size dong.
- `getMenuForCustomer()` tra ve `availableSizes` va giu key legacy (`sizes`, `defaultSize`) de an toan.

### Pha 2 - Customer UI
1. `index.html` + `app.js`
- Modal size render dong theo `availableSizes[]`.
- Dung `flex-wrap` (khong hard-code 3 cot).
- Nut size mobile dat chuan `min-h-[44px]`.
- Luu `modalState.size` bang label size.
- Cart key tinh theo label size, tong tien theo `unitPriceK`.

### Pha 3 - Payment/Tracking/Admin
1. `payment.html`, `tracking.html`
- Hien thi ten mon + size label.
- Tinh tien theo `unitPriceK || priceK`.

2. `admin.js`, `admin-dashboard.html`
- Chi tiet don: co cot `Size`.
- Quan ly menu: thay input S/M/L co dinh bang editor dynamic (Them/Xoa size).
- Excel export co cot `Size`, don gia dung theo `unitPriceK || priceK`.

### Pha 4 - Hoan thien
- Chay regression test E2E.
- Kiem tra du lieu cu (khong size) khong bi NaN/vo giao dien.
- Chot tai lieu schema.

## 5. Danh sach file chinh can sua
- `menu-store.js`
- `index.html`
- `app.js`
- `payment.html`
- `tracking.html`
- `admin.js`
- `admin-dashboard.html`

## 6. Test checklist
1. Mon co 1, 2, 4+ size deu render dung trong modal.
2. Co the dat ten size tuy y (khong phu thuoc S/M/L).
3. Cart, payment, tracking, admin deu hien thi dung label size.
4. Don cu khong co size van tinh tong dung.
5. Export Excel co cot `Size`.
