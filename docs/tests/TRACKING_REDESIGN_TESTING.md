---
title: "Tracking Redesign Testing Guide"
date: 2026-03-05
tags: [test, tracking, verification, manual, automated]
---

# Tracking Page Redesign - Testing & Verification Guide

**Status**: Ready for testing  
**Created**: 2026-03-05  

---

## Quick Verification (2 minutes)

### Test 1: Search Mode - Status Hidden
```
1. Open: tracking.html?mode=search&orderId=BILL001
2. Look for status card (large box above order details)
3. Expected: ❌ NOT VISIBLE
4. Expected: ✅ Status badge shows in order header (inline)
```

### Test 2: Checkout Mode - Status Visible
```
1. Open: tracking.html?mode=checkout&orderId=BILL001
2. Look for status card
3. Expected: ✅ VISIBLE (large box)
4. Expected: ✅ Shows simplified status text only
5. Expected: Order details visible below
```

### Test 3: Status Badge Display (Search Mode)
```
1. Search for order with different statuses:
   - BILL001 (processing)
   - BILL002 (pending_transfer)
   - BILL003 (completed)
   - BILL004 (failed)
   - BILL005 (canceled)
2. Expected: ✅ Each shows colored badge with icon
   - Processing: ☕ (blue badge)
   - Pending transfer: 🔄 (amber badge)
   - Completed: ✓ (green badge)
   - Failed: ✗ (red badge)
   - Canceled: ⊘ (gray badge)
```

---

## Manual Test Suite

### MT-001: Search Flow - Status Card Hidden
**Objective**: Verify status card is not shown in search mode  
**Precondition**: Order BILL001 exists in Firestore

```
Step 1: Open tracking.html?mode=search&orderId=BILL001
Step 2: Wait for data to load (1-2 seconds)
Step 3: Observe layout

Expected Results:
  ✓ Status card NOT visible
  ✓ Only order details box visible
  ✓ Status badge appears in order header
  ✓ Status shows correct label (e.g., "Chờ xác nhận")
```

**Result**: _____ Pass / Fail

---

### MT-002: Checkout Flow - Status Card Visible
**Objective**: Verify status card shows in checkout mode  
**Precondition**: Order BILL001 exists

```
Step 1: Open tracking.html?mode=checkout&orderId=BILL001
Step 2: Wait for data to load
Step 3: Observe layout

Expected Results:
  ✓ Status card IS visible (large box above order details)
  ✓ Status text is concise (e.g., "Chờ xác nhận" - not verbose)
  ✓ No description text (changed from before)
  ✓ Order details visible below
```

**Result**: _____ Pass / Fail

---

### MT-003: Direct Mode - Status Card Visible (Default)
**Objective**: Verify status card shows when no mode specified  
**Precondition**: Order BILL001 exists

```
Step 1: Open tracking.html?orderId=BILL001 (no mode param)
Step 2: Wait for data to load
Step 3: Observe layout

Expected Results:
  ✓ Status card IS visible
  ✓ Behaves like checkout mode
  ✓ Status text simplified
```

**Result**: _____ Pass / Fail

---

### MT-004: Status Badge Colors - All States
**Objective**: Verify status badges are color-coded correctly  
**Preconditions**: All 6 test orders exist in Firestore

```
Search for each order and check status badge color:

BILL-CASH (status: unverified_cash):
  ✓ Icon: ⏳
  ✓ Label: "Chờ xác nhận"
  ✓ Color: AMBER (bg-amber-50, amber borders)

BILL-TRANSFER (status: pending_transfer):
  ✓ Icon: 🔄
  ✓ Label: "Xác minh thanh toán"
  ✓ Color: AMBER

BILL-PROCESSING (status: processing):
  ✓ Icon: ☕
  ✓ Label: "Đang pha chế"
  ✓ Color: BLUE (bg-blue-50, blue borders)

BILL-COMPLETED (status: completed):
  ✓ Icon: ✓
  ✓ Label: "Hoàn thành"
  ✓ Color: GREEN (bg-green-50, green borders)

BILL-FAILED (status: failed):
  ✓ Icon: ✗
  ✓ Label: "Thất bại"
  ✓ Color: RED (bg-red-50, red borders)

BILL-CANCELED (status: canceled):
  ✓ Icon: ⊘
  ✓ Label: "Huỷ"
  ✓ Color: GRAY (bg-gray-50, gray borders)
```

**Result**: _____ Pass / Fail

---

### MT-005: Order Details Visual Hierarchy
**Objective**: Verify order details has proper structure and spacing  

```
Step 1: Search for any order (search mode)
Step 2: Observe order-box structure

Expected Layout:
  ┌──────────────────────────────────┐
  │ Chi tiết đơn  [✓ Done] [Tiền]   │  ← Header with badges
  │ Mã đơn: #BILL001                │
  ├──────────────────────────────────┤  ← Divider
  │ Customer name · Phone · Address  │  ← Customer section
  ├──────────────────────────────────┤  ← Divider
  │ Item 1 name            x1        │  ← Items section
  │ 50,000 đ                         │
  │ Item 2 name            x2        │
  │ 100,000 đ                        │
  ├──────────────────────────────────┤  ← Divider
  │ Tổng cộng:      150,000 đ        │  ← Total section
  └──────────────────────────────────┘

Expected:
  ✓ Clean dividers between sections
  ✓ Proper spacing (not cramped)
  ✓ Status badge inline with header
  ✓ Payment method badge visible (secondary)
  ✓ Right-aligned total
```

**Result**: _____ Pass / Fail

---

### MT-006: Status Text Simplified (No Descriptions)
**Objective**: Verify status messages are concise  
**Mode**: Checkout (to see status card)

```
Step 1: Open tracking.html?mode=checkout&orderId=BILL001
Step 2: Observe status card

Check each status type visible order:

Pending Status (spinner):
  ✓ Text shown: "Chờ xác nhận" OR similar
  ✓ NO description text below
  ❌ Old format had: "Vui lòng giữ kết nối..."

Error Status (failed/canceled):
  ✓ Text shown: "Thất bại" OR "Huỷ"
  ✓ NO description text
  ❌ Old format had: "Ảnh biên lai chưa hợp lệ..."

Success Status:
  ✓ Text shown: "Hoàn thành"
  ✓ NO description text
  ❌ Old format had: "Bạn sẽ nhận thông báo..."
```

**Result**: _____ Pass / Fail

---

### MT-007: Mobile Responsive
**Objective**: Verify layout works on mobile devices  

```
Step 1: Open DevTools (F12)
Step 2: Toggle device toolbar (Ctrl+Shift+M)
Step 3: Set to iPhone 12 (390x844)
Step 4: Search for an order
Step 5: Scroll through order details

Expected:
  ✓ Status badge doesn't overflow
  ✓ Payment badge moves below if needed
  ✓ Text readable (no clipping)
  ✓ All sections visible
  ✓ No horizontal scroll
```

**Result**: _____ Pass / Fail

---

### MT-008: Real-time Updates
**Objective**: Verify status updates in real-time (search mode)  

```
Step 1: Open two tabs:
  - Tab A: tracking.html?mode=search&orderId=BILL001
  - Tab B: Firebase admin console (Firestore)

Step 2: In Tab A, observe status badge
Step 3: In Tab B, change order status (e.g., processing → completed)
Step 4: In Tab A, observe Tab update

Expected:
  ✓ Status badge updates immediately (within 1 second)
  ✓ Label changes (e.g., "Đang pha chế" → "Hoàn thành")
  ✓ Icon changes (☕ → ✓)
  ✓ Color changes (blue → green)
  ✓ No page refresh needed
```

**Result**: _____ Pass / Fail

---

## Browser DevTools Tests

### Automated Structure Test
Run this in DevTools Console:

```javascript
console.clear()
console.log('=== TRACKING REDESIGN TESTS ===\n')

const tests = []
let pass = 0, fail = 0

function test(name, condition) {
  if (condition) pass++
  else fail++
  console.log(`[${condition ? '✓' : '✗'}] ${name}`)
}

// Structure tests
test('Status card exists', document.getElementById('status-card') !== null)
test('Order box exists', document.getElementById('order-box') !== null)
test('Status badge exists', document.getElementById('order-status-badge') !== null)
test('Status icon exists', document.getElementById('status-icon') !== null)
test('Status label exists', document.getElementById('status-label') !== null)

// CSS tests
test('Status badge hidden by default', 
  document.getElementById('order-status-badge').classList.contains('hidden'))

test('Order box has border dividers',
  document.getElementById('order-box').innerHTML.includes('border-b'))

test('Order box has proper spacing',
  document.getElementById('order-box').className.includes('p-4'))

// Function tests
test('getStatusInfo function exists', typeof getStatusInfo === 'function')

// Mode tests
const params = new URLSearchParams(location.search)
const mode = params.get('mode')
if (mode === 'search') {
  test('Status card hidden in search mode',
    document.getElementById('status-card').classList.contains('hidden'))
} else {
  test('Status card visible in non-search mode',
    !document.getElementById('status-card').classList.contains('hidden'))
}

console.log(`\n✓ Pass: ${pass}`)
console.log(`✗ Fail: ${fail}`)
console.log(`\nTotal: ${pass + fail} tests`)
```

---

## Test Data Setup

Firebase test documents needed:

```javascript
{
  "BILL001": {
    "status": "processing",
    "customer": { "name": "Nguyễn A", "phone": "090...", "address": "123 Nguyễn" },
    "items": [{ "name": "Cà phê", "priceK": 50, "qty": 1 }],
    "totalK": 50,
    "method": "cash"
  },
  "BILL002": {
    "status": "pending_transfer",
    "customer": { "name": "Trần B", "phone": "091...", "address": "456 Lê Lợi" },
    "items": [{ "name": "Cappuccino", "priceK": 55, "qty": 2 }],
    "totalK": 110,
    "method": "transfer"
  },
  "BILL003": {
    "status": "completed",
    "customer": { "name": "Lê C", "phone": "089...", "address": "789 Đồng Khởi" },
    "items": [{ "name": "Latte", "priceK": 60, "qty": 1 }],
    "totalK": 60,
    "method": "cash"
  },
  "BILL004": {
    "status": "failed",
    "customer": { "name": "Phạm D", "phone": "076...", "address": "321 Bến Nghé" },
    "items": [{ "name": "Americano", "priceK": 45, "qty": 1 }],
    "totalK": 45,
    "method": "transfer"
  },
  "BILL005": {
    "status": "canceled",
    "customer": { "name": "Hoàng E", "phone": "085...", "address": "654 Pasteur" },
    "items": [{ "name": "Mocha", "priceK": 65, "qty": 1 }],
    "totalK": 65,
    "method": "cash"
  },
  "BILL-CASH": {
    "status": "unverified_cash",
    "customer": { "name": "Test", "phone": "090...", "address": "Test" },
    "items": [{ "name": "Test", "priceK": 50, "qty": 1 }],
    "totalK": 50,
    "method": "cash"
  }
}
```

---

## Test Results Summary

| Test | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| MT-001: Search status hidden | Hidden | | |
| MT-002: Checkout status visible | Visible | | |
| MT-003: Direct mode default | Visible | | |
| MT-004: Status colors | 6 distinct | | |
| MT-005: Visual hierarchy | Clean | | |
| MT-006: Simplified text | Concise | | |
| MT-007: Mobile responsive | Works | | |
| MT-008: Real-time updates | 1s update | | |

---

## Sign-Off

**Tested by**: ________________  
**Date**: ________________  
**Status**: ✓ Pass / ✗ Fail  
**Notes**: 

---

## Issues Found (if any)

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| | | | |

---

## Approval

- [ ] Code reviewer approved
- [ ] QA tester approved  
- [ ] Product owner approved (if needed)

**Approved by**: ________________  
**Date**: ________________
