---
title: "Tracking.html Code Review"
date: 2026-03-05
tags: [review, tracking, bugs, ui-ux]
---

# Code Review: tracking.html (Order Tracking Page)

## Overview
`tracking.html` provides two workflows:
1. **Search mode** (`mode=search`): User enters order ID from homepage
2. **Direct mode** (`mode=checkout` or from payment page): User is redirected with `orderId` in URL

## Current Issues

### 1. **Critical: Incorrect Status on Not Found** ❌
**Location**: Lines 252-255 (Firestore listener)  
**Issue**: When order doesn't exist or search returns no results, code sets status to `'canceled'`.  
**Problem**: Shows "Đơn đã bị hủy" (Order canceled) instead of real empty-state message.  
**Impact**: User confusion—thinks their order was canceled when it simply doesn't exist.

```javascript
if (!doc.exists) {
  setStatus('canceled')  // WRONG: should indicate "not found"
  renderOrder({})
  return
}
```

**Expected Behavior**: Display "Không tìm thấy đơn hàng" with instructions to re-enter order ID.

---

### 2. **Missing Empty State UI** ❌
**Location**: Lines 73-77 (Initial hiding logic)  
**Issue**: When `mode=search` and no `orderId`, both status card and order box are hidden, leaving blank screen.  
**Expected**: Show a centered, friendly message like "Nhập mã đơn để tìm kiếm" with icon and instructions.

```javascript
if (mode === 'search' && !orderId) {
  statusCard.classList.add('hidden')
  orderBox.classList.add('hidden')  // ← No alternative UI shown
}
```

---

### 3. **Error Handling Ambiguity** ⚠️
**Location**: Lines 258-263 (Error callback)  
**Issue**: Network errors and permission errors both show "Không tải được đơn hàng".  
**Problem**: Doesn't distinguish between "order not found" vs. "network error" vs. "invalid order ID".

```javascript
}, function (err) {
  setStatus('canceled')
  document.getElementById('fail-title').textContent = 'Không tải được đơn hàng'
  document.getElementById('fail-desc').textContent = 'Kiểm tra kết nối mạng hoặc mã đơn.'
})
```

---

### 4. **URL Flow Ambiguity** ⚠️
**Location**: Lines 160-161  
**Issue**: On search, the code rebuilds URL with `mode=search` but doesn't reset search input. User may not realize they clicked "search" and got redirected.

```javascript
const qs = new URLSearchParams({ mode: 'search', orderId: v }).toString()
location.href = 'tracking.html?' + qs
```

---

## Code Quality Issues

### Variable Naming
| Issue | Location | Suggestion |
|-------|----------|-----------|
| `k` in `formatVND()` is unclear | Line 172 | Rename to `priceInThousands` or `kValue` |
| `im` for image element | Line 174 | Rename to `imgElement` |
| `v` for search value | Line 158 | Rename to `searchValue` |

### Event Handling
- **Issue**: Search button and input both trigger `doSearch()`, but no debounce—rapid clicks cause multiple Firestore queries.
- **Fix**: Add debounce flag or disable button during search.

### Rendering Logic
- **Issue**: `renderOrder({})` is called with empty object when order not found. This still renders "Chi tiết đơn" heading but no items, which is confusing.
- **Expected**: Should not render order details box if order doesn't exist.

---

## Proposed Fixes

### Fix 1: Add Empty State UI Container
Insert before the closing `</div>` of main container (after order-box):

```html
<div id="empty-state" class="hidden rounded-2xl bg-white p-8 shadow-soft text-center">
  <div class="w-16 h-16 rounded-full bg-cream flex items-center justify-center mx-auto mb-3">
    <svg class="w-8 h-8 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  </div>
  <div class="font-serif italic text-lg mb-1" id="empty-title">Không tìm thấy đơn hàng</div>
  <div class="text-xs text-primary/70 mb-4" id="empty-desc">Vui lòng kiểm tra lại mã đơn của bạn</div>
  <button onclick="document.getElementById('search').focus()" class="px-3 py-2 text-xs rounded-lg bg-primary text-white">Tìm lại</button>
</div>
```

### Fix 2: Update `setStatus()` to Handle "not_found"
```javascript
function setStatus(s) {
  const wait = document.getElementById('status-wait')
  const ok = document.getElementById('status-success')
  const fail = document.getElementById('status-fail')
  const empty = document.getElementById('empty-state')
  
  wait.classList.add('hidden')
  ok.classList.add('hidden')
  fail.classList.add('hidden')
  empty.classList.add('hidden')
  
  if (s === 'completed') {
    ok.classList.remove('hidden')
    document.getElementById('status-card').classList.add('bg-green-50')
  } else if (s === 'failed' || s === 'canceled') {
    fail.classList.remove('hidden')
    document.getElementById('status-card').classList.add('bg-red-50')
    if (s === 'failed')
      document.getElementById('fail-title').textContent = 'Xác minh chuyển khoản thất bại'
    else
      document.getElementById('fail-title').textContent = 'Đơn đã bị hủy'
  } else if (s === 'not_found') {
    empty.classList.remove('hidden')
  } else {
    wait.classList.remove('hidden')
    const text = document.getElementById('status-text')
    text.textContent = s === 'processing' ? 'Đang pha chế...' 
      : (s === 'pending_transfer' ? 'Đang xác minh thanh toán...' : 'Đang chờ quầy xác nhận...')
  }
}
```

### Fix 3: Update Firestore Listener
```javascript
db.collection('orders').doc(orderId).onSnapshot(function (doc) {
  if (!doc.exists) {
    setStatus('not_found')  // ← FIX: Show proper empty state
    orderBox.classList.add('hidden')  // Hide order details
    statusCard.classList.add('hidden')  // Hide status card
    return
  }
  // ... rest
}, function (err) {
  setStatus('error')  // Add new status for errors
  orderBox.classList.add('hidden')
  statusCard.classList.remove('hidden')
  document.getElementById('fail-title').textContent = 'Lỗi tải đơn hàng'
  document.getElementById('fail-desc').textContent = 'Vui lòng kiểm tra kết nối mạng.'
})
```

### Fix 4: Improve Initial UI State
```javascript
if (mode === 'search' && !orderId) {
  statusCard.classList.add('hidden')
  orderBox.classList.add('hidden')
  // Show empty state with placeholder
  const empty = document.getElementById('empty-state')
  empty.classList.remove('hidden')
  document.getElementById('empty-title').textContent = 'Tìm kiếm đơn hàng'
  document.getElementById('empty-desc').textContent = 'Nhập mã đơn (ví dụ: BILL102) ở trên'
}
```

### Fix 5: Add Search Debounce
```javascript
let searchTimeout
btnSearch.addEventListener('click', function() {
  if (searchTimeout) clearTimeout(searchTimeout)
  btnSearch.disabled = true
  btnSearch.textContent = 'Đang tìm...'
  searchTimeout = setTimeout(() => {
    doSearch()
    btnSearch.disabled = false
    btnSearch.textContent = 'Tìm'
  }, 300)
})
```

---

## Business Logic Validation

| Flow | Current Behavior | Expected Behavior | Status |
|------|------------------|-------------------|--------|
| **Search → Found** | Shows order status ✓ | Shows order status ✓ | ✓ OK |
| **Search → Not Found** | Shows "Đơn đã bị hủy" ❌ | Shows "Không tìm thấy" ✓ | ❌ BUG |
| **Search → Network Error** | Shows generic message ⚠️ | Clear "lỗi kết nối" message | ⚠️ NEEDS FIX |
| **Direct from checkout** | Shows order ✓ | Shows order ✓ | ✓ OK |
| **Empty search page** | Blank screen ❌ | Friendly prompt | ❌ BUG |

---

## Testing Recommendations
See [TRACKING_TEST_CASES.md](../tests/TRACKING_TEST_CASES.md) for detailed test scenarios.

---

## Summary of Changes
- ✅ Add empty-state UI container  
- ✅ Update setStatus() to handle "not_found" and "error" statuses  
- ✅ Fix Firestore listener to call setStatus('not_found') instead of 'canceled'  
- ✅ Hide order/status cards when order not found  
- ✅ Improve initial empty search state  
- ✅ Add search debounce to prevent repeated queries
