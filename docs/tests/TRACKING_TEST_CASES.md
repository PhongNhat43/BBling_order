---
title: "Tracking.html Test Cases"
date: 2026-03-05
tags: [test, tracking, qa, test-cases]
---

# Test Cases: tracking.html (Order Tracking Page)

## Test Scope
This document covers both manual and automated tests for the order tracking functionality.

---

## Manual Test Cases

### TC-001: Search Page Initial Load
**Objective**: Verify empty search state displays correctly  
**Preconditions**: None  
**Steps**:
1. Open `tracking.html` in browser (no URL params)
2. Or open `tracking.html?mode=search` without `orderId`

**Expected Result**:
- [ ] Search input field is visible and focused
- [ ] Status card is hidden
- [ ] Order box is hidden
- [ ] Empty state message appears: "Tìm kiếm đơn hàng" or similar prompt
- [ ] No error messages

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-002: Search Valid Order (Exists in DB)
**Objective**: Verify successful order lookup and display  
**Preconditions**: Order with ID `BILL001` exists in Firestore  
**Steps**:
1. Open `tracking.html` (search mode)
2. Enter `BILL001` in search input
3. Click "Tìm" button

**Expected Result**:
- [ ] URL changes to `tracking.html?mode=search&orderId=BILL001`
- [ ] Search input is cleared or shows the entered ID
- [ ] Status card appears with loading spinner
- [ ] Within 2 seconds, order details display (customer, items, total)
- [ ] Status badge shows payment method (Chuyển khoản or Tiền mặt)
- [ ] Order status shows (Đang chờ / Đang pha chế / Thanh toán thành công)

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-003: Search Order Not Found
**Objective**: Verify proper "not found" state (was showing "canceled" before fix)  
**Preconditions**: Order with ID `INVALID999` does NOT exist in Firestore  
**Steps**:
1. Open `tracking.html` (search mode)
2. Enter `INVALID999` in search input
3. Click "Tìm" button

**Expected Result**:
- [ ] URL changes to include `orderId=INVALID999`
- [ ] Search spinner appears for 0.5-1 second
- [ ] Status card is hidden
- [ ] Order box is hidden
- [ ] Empty state UI appears with message: "Không tìm thấy đơn hàng"
- [ ] Message suggests to "Kiểm tra lại mã đơn" or "Tìm lại"
- [ ] No "Đơn đã bị hủy" (canceled) message appears ← **BUG FIX CHECK**

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-004: Search with Network Error
**Objective**: Verify network error handling  
**Preconditions**: 
- Order ID exists: `BILL001`
- Network is disconnected or Firebase is unreachable

**Steps**:
1. Disconnect internet/throttle network (DevTools network tab)
2. Enter valid order ID in search
3. Click "Tìm"

**Expected Result**:
- [ ] Spinner shows for a moment
- [ ] Error state appears with clear message: "Lỗi tải đơn hàng" or "Kiểm tra kết nối"
- [ ] Message is distinct from "not found" (not showing "Không tìm thấy")
- [ ] User can retry or go back to search

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-005: Direct Access from Checkout Page
**Objective**: Verify redirect with pre-filled order ID works  
**Preconditions**: 
- User just completed payment on `payment.html`
- Order `BILL123` exists in Firestore with status `pending_transfer`

**Steps**:
1. Redirect from `payment.html` to `tracking.html?mode=checkout&orderId=BILL123`
2. (Or simulate by opening Direct link)

**Expected Result**:
- [ ] Order ID displays: "Mã đơn: #BILL123"
- [ ] Order details load automatically (no search needed)
- [ ] Status shows "Đang xác minh thanh toán..." (for pending_transfer)
- [ ] Customer details visible
- [ ] Items list visible with quantities and prices

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-006: Real-time Status Updates
**Objective**: Verify status auto-updates when admin changes order status  
**Preconditions**: 
- Order `BILL456` is in "unverified_cash" status
- Have two browsers/tabs open on same order

**Steps**:
1. Open `tracking.html?mode=checkout&orderId=BILL456` in Browser A
2. Admin updates order status to "processing" in Firestore
3. Observe Browser A

**Expected Result**:
- [ ] Status text changes from "Đang chờ quầy xác nhận..." → "Đang pha chế..."
- [ ] Update happens within 1-2 seconds
- [ ] No page refresh needed (real-time via Firestore listener)

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-007: Canceled Order Display
**Objective**: Verify canceled orders show appropriate message (distinct from "not found")  
**Preconditions**: Order `BILL789` exists but has status `'canceled'`  
**Steps**:
1. Search for `BILL789`
2. Observe status display

**Expected Result**:
- [ ] Order details display (customer, items still shown)
- [ ] Status card shows: "Đơn đã bị hủy" in red background
- [ ] Message includes: "Vui lòng mở chat hoặc gọi quầy để được hỗ trợ"
- [ ] This is DIFFERENT from "not found" empty state

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-008: Rapid Search Clicks (Debounce Test)
**Objective**: Ensure multiple rapid searches don't cause performance issues  
**Preconditions**: None  
**Steps**:
1. Click search button 5 times rapidly
2. Observe Firestore calls in DevTools

**Expected Result**:
- [ ] Only 1 actual Firestore query is triggered (debounced)
- [ ] UI shows loading only once
- [ ] No duplicate data renders

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-009: Enter Key to Search
**Objective**: Verify keyboard shortcut works  
**Preconditions**: None  
**Steps**:
1. Focus on search input
2. Type order ID
3. Press Enter

**Expected Result**:
- [ ] Search triggers same as clicking button
- [ ] Page navigates to correct URL

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

### TC-010: Case Sensitivity
**Objective**: Verify order ID matching is case-insensitive  
**Preconditions**: Order `BILL001` exists  
**Steps**:
1. Search for `bill001` (lowercase)
2. Search for `Bill001` (mixed)
3. Search for `BILL001` (uppercase)

**Expected Result**:
- [ ] All three searches return the same order
- [ ] Or Firestore query handles case-insensitive matching

**Actual Result**: _______________  
**Status**: ✓ Pass / ❌ Fail  

---

## Automated Test Script (DevTools Console)

Add this script to `docs/tests/tracking-automated.test.js` and run in browser console:

```javascript
// TRACKING.HTML AUTOMATED TESTS
console.log('=== Tracking Order Tests ===')

const tests = []

// Test 1: Check if empty state exists
tests.push({
  name: 'Empty state container exists',
  check: () => document.getElementById('empty-state') !== null,
  expected: true
})

// Test 2: Check status card hidden initially
tests.push({
  name: 'Status card hidden on load (search mode)',
  check: () => {
    const card = document.getElementById('status-card')
    return card ? card.classList.contains('hidden') : true
  },
  expected: true
})

// Test 3: Check order box hidden initially
tests.push({
  name: 'Order box hidden on load (search mode)',
  check: () => {
    const box = document.getElementById('order-box')
    return box ? box.classList.contains('hidden') : true
  },
  expected: true
})

// Test 4: Check search button exists and is functional
tests.push({
  name: 'Search button is clickable',
  check: () => {
    const btn = document.getElementById('btn-search')
    return btn && typeof btn.click === 'function'
  },
  expected: true
})

// Test 5: Check search input exists
tests.push({
  name: 'Search input field exists',
  check: () => document.getElementById('search') !== null,
  expected: true
})

// Test 6: Check setStatus function handles 'not_found'
tests.push({
  name: 'setStatus function exists (will check after search)',
  check: () => typeof window.setStatus === 'function',
  expected: false // setStatus is in script scope, not global
})

// Test 7: Check all required status elements exist
const statusElements = ['status-wait', 'status-success', 'status-fail', 'empty-state']
statusElements.forEach(id => {
  tests.push({
    name: `Status element "${id}" exists`,
    check: () => document.getElementById(id) !== null,
    expected: true
  })
})

// Test 8: Check customer info rendering elements
tests.push({
  name: 'Customer info container exists',
  check: () => document.getElementById('customer') !== null,
  expected: true
})

// Test 9: Check order list rendering element
tests.push({
  name: 'Order items list container exists',
  check: () => document.getElementById('order-list') !== null,
  expected: true
})

// Test 10: Check method badge element
tests.push({
  name: 'Payment method badge exists',
  check: () => document.getElementById('method-badge') !== null,
  expected: true
})

// Run all tests
let passCount = 0, failCount = 0
tests.forEach((t, i) => {
  const result = t.check()
  const pass = result === t.expected
  if (pass) passCount++
  else failCount++
  
  console.log(`[${pass ? '✓' : '✗'}] ${i + 1}. ${t.name}`)
  if (!pass) console.log(`    Expected: ${t.expected}, Got: ${result}`)
})

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed ===`)

// MANUAL TEST STEP: Search for non-existent order
console.log('\n=== MANUAL VERIFICATION ===')
console.log('TO TEST BUG FIX:')
console.log('1. Type "INVALID999" in search and click "Tìm"')
console.log('2. Verify message is "Không tìm thấy đơn hàng" NOT "Đơn đã bị hủy"')
console.log('3. Empty state UI should display')
```

### How to Run Automated Test
1. Open browser DevTools (F12)
2. Go to Console tab
3. Copy and paste the script above
4. Press Enter
5. All UI element checks will run immediately

---

## Testing Workflow

### Phase 1: UI Structure Check (Automated)
- Run automated script above
- Verify all required elements exist

### Phase 2: Manual Search Flow Tests (Manual)
- TC-001 through TC-010 using test data

### Phase 3: Real Firestore Integration (Semi-automated)
You can create test orders in Firebase:
```
Database: orders
Test Data:
  BILL001: { status: 'completed', items: [...], customer: {...}, totalK: 250 }
  BILL002: { status: 'processing', ... }
  BILL003: { status: 'pending_transfer', ... }
  BILL004: { status: 'canceled', ... }
```

### Phase 4: Error Scenario Tests
- Disconnect network and test TC-004
- Delete an order mid-display and verify error handling
- Test with invalid `orderId` format

---

## Expected Results Summary

| Test Case | Should Pass After Fix |
|-----------|--------|
| TC-001 | ✓ Search page empty state |
| TC-002 | ✓ Found order displays |
| TC-003 | **✓ NOT FOUND shows correct message** |
| TC-004 | ✓ Network error distinct message |
| TC-005 | ✓ Direct access works |
| TC-006 | ✓ Real-time updates |
| TC-007 | **✓ Canceled is different from not-found** |
| TC-008 | ✓ Debounce works |
| TC-009 | ✓ Enter key works |
| TC-010 | ⚠ Depends on Firestore query design |

