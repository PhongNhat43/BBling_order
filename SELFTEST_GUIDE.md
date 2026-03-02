# Self-Test Guide for Bug Fixes

## Changes Made

### 1. Toast.js Enhancement
- Added `dismiss()` method to manually close loading toast notifications
- Loading toast now supports being dismissed via `toast.dismiss()` method
- Solves: Toast loading notification staying visible indefinitely

### 2. admin.js Fixes
- **showDetailModal()**: 
  - Added explicit `modal.style.display = 'flex'` to ensure modal displays
  - Added console warnings for debugging if elements not found
  - Always calls `modal.classList.remove('hidden')` at the end
  
- **Image Upload Handlers**:
  - "Thêm món" handler: Stores loading toast in variable, dismisses it after compression
  - "Sửa món" handler: Same toast dismissal logic
  - Solves: Loading toast disappearing after image compression completes

## Testing Environment Setup

```bash
# Navigate to project
cd /Users/protonmn004/Documents/GitHub/BBling_order

# Start HTTP server
python3 -m http.server 8000

# Open in browser
# http://localhost:8000/admin-dashboard.html
```

---

## Issue 1: Order Detail Modal

### Self-Test Steps

#### Test 1.1: Modal Opens on Order Click
1. **Prerequisite**: Must have at least 1 order in the system
   - If no orders exist, create one:
     - Go to home page → "GỬI ĐƠN" → fill form → submit
     - Or use Firebase console to add test order
   
2. **Steps**:
   - [ ] Go to Admin Dashboard
   - [ ] Click "Đơn hàng" tab (should be default)
   - [ ] Verify at least one order card is visible
   - [ ] **Click on any order card**
   
3. **Expected Result**:
   - [ ] Black overlay appears (semi-transparent bg-black/60)
   - [ ] White modal box appears centered on screen
   - [ ] Modal shows order information:
     - Order bill number (e.g., "Đơn #ORDER001")
     - Payment method badge (TM or CK)
     - Order status badge (e.g., "Chờ xác nhận")
     - Customer name and phone
     - Order items with quantities and prices
     - Total amount in green text
     - × close button in top right
   
4. **Debug Info** (if fails):
   - Open browser console (F12)
   - Check for any red error messages
   - Should see no errors or warnings

#### Test 1.2: Modal Close Button Works
1. **Prerequisite**: Modal is open from Test 1.1
2. **Steps**:
   - [ ] Click the × (close) button in top right of modal
3. **Expected**: Modal disappears, order list visible again

#### Test 1.3: Click Outside Modal to Close
1. **Prerequisite**: Modal is open from Test 1.1
2. **Steps**:
   - [ ] Click on the dark black overlay area (outside the white modal box)
3. **Expected**: Modal disappears smoothly

#### Test 1.4: Status Update Button
1. **Prerequisite**: Modal open with order status "Chờ xác nhận" or "Chờ xác minh"
2. **Steps**:
   - [ ] Click "[Duyệt]" button
3. **Expected**:
   - [ ] Green toast appears: "✓ Cập nhật trạng thái thành công: Đang pha chế"
   - [ ] Modal refreshes with new status badge
   - [ ] Toast disappears after 3 seconds

---

## Issue 2: Toast Loading Dismissal

### Self-Test Steps

#### Test 2.1: Add Menu Item with Image (Main Test)
1. **Steps**:
   - [ ] Go to Admin Dashboard → "Menu" tab
   - [ ] Click "Thêm món" button
   - [ ] Fill in form:
     - Tên món: `Coffee Test ${Date.now()}` (unique name)
     - Giá (k): `30`
     - Mô tả: `Test coffee for bug fix`
     - Select any file (JPG, PNG under 10MB) - **REQUIRED**
     - Category: Select any category
   - [ ] Click "Lưu" button
   
2. **Expected Timeline**:
   - [ ] **Immediately**: Modal closes, blue loading toast appears: "🔄 Đang nén ảnh..."
   - [ ] **After 2-3 seconds**: Loading toast **DISAPPEARS** ✓
   - [ ] **Immediately after**: Green success toast appears: "✓ Thêm món thành công"
   - [ ] **After 3 seconds**: Success toast disappears
   - [ ] **Verify**: New menu item appears in the list
   
3. **Debug**: If loading toast doesn't disappear:
   - [ ] Check browser console for errors
   - [ ] Verify ImageUtils is loaded (should see it in Network tab)
   - [ ] Try smaller image file

#### Test 2.2: Add Item WITHOUT Image (Should Have No Loading Toast)
1. **Steps**:
   - [ ] Go to "Menu" tab
   - [ ] Click "Thêm món"
   - [ ] Fill name, price, description
   - [ ] **DO NOT select image**
   - [ ] Click "Lưu"
   
2. **Expected**:
   - [ ] No loading toast appears at all (skips compression)
   - [ ] Direct success toast appears immediately
   - [ ] Item added to list

#### Test 2.3: Edit Menu Item with New Image
1. **Steps**:
   - [ ] Go to "Menu" tab
   - [ ] Find existing item, click "Sửa"
   - [ ] **Current image should be visible in modal preview**
   - [ ] Select a new image file
   - [ ] Click "Lưu"
   
2. **Expected**:
   - [ ] Blue loading toast: "🔄 Đang nén ảnh..."
   - [ ] Loading toast **DISAPPEARS** after 2-3 seconds
   - [ ] Success toast: "✓ Cập nhật món thành công"
   - [ ] Item image updates in menu list preview

#### Test 2.4: Invalid Image (Error Handling)
1. **Steps**:
   - [ ] Try to upload non-image file or image > 10MB
   - [ ] Should get immediate error toast
   
2. **Expected**:
   - [ ] Red error toast appears
   - [ ] No loading toast shown
   - [ ] Modal remains open for retry

---

## Verification Checklist

### Issue 1 Verification
- [ ] Clicking order card opens modal
- [ ] Modal displays all order information correctly
- [ ] Close button (×) works
- [ ] Clicking background closes modal
- [ ] Status update buttons work and show success toast
- [ ] Modal refreshes after status change
- [ ] No console errors

### Issue 2 Verification
- [ ] Loading toast appears when uploading image
- [ ] Loading toast **DISAPPEARS** within 3-4 seconds
- [ ] Success toast appears after loading dismissal
- [ ] Menu item is created successfully
- [ ] Item appears in list with image
- [ ] Editing item with new image also shows/dismisses loading toast
- [ ] No loading toasts remain on screen after operations

---

## Troubleshooting

### Modal Not Appearing
1. **Check console** (F12 → Console tab)
   - Should see no errors, might see warnings about order not found
2. **Ensure orders exist**
   - Add a test order via home page first
3. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear cache

### Loading Toast Not Disappearing
1. **Check file size** - must be < 10MB
2. **Check browser console** for IMAGE utils errors
3. **Verify image-utils.js loaded** - check Network tab (F12 → Network)
4. **Try different image** - test with JPG first

### Both Issues Persist
1. Hard refresh the page
2. Clear browser cache
3. Check that these files were modified:
   - [ ] toast.js (has dismiss method)
   - [ ] admin.js (has updated handlers)
   - [ ] No syntax errors in either file

---

## Performance Notes

- Loading toast dismissal: ~300ms animation
- Image compression: 2-3 seconds depending on file size
- Toast auto-dismiss: 3 seconds for success, 4 seconds for error

---

## Success Criteria

✅ **All tests pass** if:
1. Order modal appears when clicking an order
2. Modal shows all order details correctly  
3. Modal can be closed (button or outside click)
4. Loading toast appears AND disappears when uploading menu images
5. Success toast appears after loading disappears
6. Menu items created/updated successfully

