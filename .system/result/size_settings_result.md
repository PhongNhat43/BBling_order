# Ket qua trien khai Dynamic Size System

## 1. Tong ket
Da chuyen doi he thong size co dinh `S/M/L` sang co che size dong `availableSizes[]`.

- Ho tro ten size tuy y: `350ml`, `Chai 1L`, `Ly lon`...
- Khong gioi han so luong size tren moi mon.
- Van giu fallback cho du lieu cu de khong gay luong hien tai.

## 2. Danh sach file da sua
1. `menu-store.js`
2. `index.html`
3. `app.js`
4. `admin.js`
5. `admin-dashboard.html`
6. `.system/planning/size_setting.md`
7. `.system/result/size_settings_result.md`

## 3. Item JSON mau (cau truc moi)
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
  "desc": "Xoai chin va kem cheese beo min.",
  "img": "https://...",
  "cat": "cat-tea",
  "visible": true
}
```

## 4. Ket qua ky thuat theo tung khu vuc

### 4.1 `menu-store.js`
- Chuyen `DEFAULT_ITEMS` sang `availableSizes[]`.
- Them `getItemAvailableSizes(item)` de doc duoc ca schema moi va schema cu.
- Cap nhat `getItemPriceK(item, label)` theo label size dong.
- `getMenuForCustomer()` tra ve `availableSizes` + key legacy (`sizes`, `defaultSize`) de an toan.

### 4.2 `app.js` + `index.html`
- Modal size render dong theo du lieu thuc te, khong fix cung 3 nut.
- Container size su dung `flex flex-wrap`.
- Nut size mobile dat chuan `min-h-[44px]`.
- `modalState.size` luu label size.
- Cart key va snapshot don tiep tuc ho tro size label + `unitPriceK`.

### 4.3 `admin.js` + `admin-dashboard.html`
- Quan ly menu: bo 3 input S/M/L co dinh, thay bang editor size dong (Them/Xoa size).
- Admin co the nhap `Ten size` + `Gia` cho moi dong size.
- Chi tiet don hang hien thi bang co cot `Size` ro rang.
- `exportDay()` xuat cot `Size`, don gia theo `unitPriceK || priceK`.

## 5. Backward Compatibility (quan trong)
1. **Item cu (schema S/M/L):**
- Neu co `sizes + defaultSize`, he thong tu convert runtime sang `availableSizes[]`.

2. **Don cu khong co `unitPriceK`:**
- Moi noi tinh tien deu fallback `unitPriceK || priceK || 0`.

3. **Don cu khong co `size`:**
- UI hien thi `Size = —` hoac an nhan size, khong vo giao dien.

4. **Firebase flow:**
- Khong doi collection/chinh sua luong submit don.
- Payload van giu `priceK` de an toan trong giai doan chuyen tiep.

## 6. Luu y UI/UX
- Giu tone Vintage Minimalist hien tai.
- Nut size trong modal dam bao touch target tren mobile (`min-h-[44px]`).
- So luong size thay doi linh hoat theo item, khong phu thuoc `S/M/L`.

## 7. Trang thai
- Dynamic size system: **DA TRIEN KHAI**.
- Tuong thich nguoc: **DA BAO TOAN**.
- San sang test E2E: **CO**.
