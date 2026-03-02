# Test Cases for Bug Fixes

## Issue 1: Order Detail Modal Not Displaying

### Test Case 1.1: Click Order Should Show Modal
**Steps**:
1. Login to Admin Dashboard
2. Ensure at least 1 order exists in the order list
3. Click on any order card in "Đơn hàng" tab
4. **Expected**: Modal popup should appear with order details (bill #, customer info, items, total)
5. **Verify Elements**:
   - Order bill number displays correctly (e.g., "Đơn #ORDER001")
   - Customer name and phone show
   - Order items list displays with quantities and prices
   - Total price displays correctly
   - Status badge shows (TM/CK, order status)
   - Close button (×) is visible

### Test Case 1.2: Close Modal
**Steps**:
1. Display modal (from Test 1.1)
2. Click the × button on top right
3. **Expected**: Modal disappears, order list is still visible

### Test Case 1.3: Close Modal by Clicking Outside
**Steps**:
1. Display modal (from Test 1.1)
2. Click on the dark background area outside the modal box
3. **Expected**: Modal disappears

### Test Case 1.4: Modal Actions
**Steps**:
1. Display modal with unverified_cash or pending_transfer order
2. Click [Duyệt] button
3. **Expected**:
   - Status updates to "Đang pha chế"
   - Modal refreshes with updated status
   - Success toast shows "✓ Cập nhật trạng thái thành công: Đang pha chế"

---

## Issue 2: Toast Loading Not Dismissing

### Test Case 2.1: Add Menu Item with Image - Toast Dismissal
**Steps**:
1. Login to Admin Dashboard
2. Go to "Menu" tab
3. Click "Thêm món" button
4. Fill in:
   - Tên món: "Test Coffee"
   - Giá (k): "25"
   - Mô tả: "Test description"
   - Upload an image file (any image, less than 10MB)
   - Select a category
5. Click "Lưu" button
6. **Expected Behavior**:
   - Toast "🔄 Đang nén ảnh..." appears
   - After 2-3 seconds, loading toast DISAPPEARS
   - Toast "✓ Thêm món thành công" appears
   - Modal closes
   - New item appears in menu list

### Test Case 2.2: Add Menu Item WITHOUT Image
**Steps**:
1. Go to Menu tab  
2. Click "Thêm món" button
3. Fill name, price, description WITHOUT selecting image
4. Click "Lưu"
5. **Expected**: No loading toast appears, direct "✓ Thêm món thành công" toast

### Test Case 2.3: Edit Menu Item with New Image
**Steps**:
1. In Menu tab, click "Sửa" on existing item
2. Select a new image file
3. Click "Lưu"
4. **Expected**:
   - Loading toast appears and DISAPPEARS after compression
   - Success toast shows
   - Item is updated in list

### Test Case 2.4: Invalid Image Upload
**Steps**:
1. In Menu tab, click "Thêm món"
2. Try to upload a file larger than 10MB or non-image file
3. **Expected**: Error toast appears immediately

---

## Summary Checklist

- [ ] Order detail modal displays when clicking order card
- [ ] Modal shows correct order information
- [ ] Close button (×) works
- [ ] Clicking outside modal closes it
- [ ] Status update buttons work and show success toast
- [ ] Loading toast appears when compressing image
- [ ] Loading toast disappears after compression completes
- [ ] Success toast appears after item created/updated
- [ ] Modal closes after successful item creation
- [ ] New item appears in list after creation
- [ ] Edit with new image works correctly
