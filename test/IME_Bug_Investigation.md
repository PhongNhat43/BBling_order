# IME Duplicate Message Bug — Full Investigation Log

> **Environment**: macOS + Chrome, Vietnamese Telex/VNI input method  
> **Affected**: Admin chat panel (`admin.js`) + Customer chat widget (`chat.js`)  
> **Status**: FIXED ✅ (v=20260307-8)  
> **Date**: 2026-03-07

---

## The Bug

When typing Vietnamese with spaces (e.g. `"xin chào"`), pressing Enter to send causes the **last composed word** (`"chào"`) to appear a second time as a duplicate message.

- **With spaces**: bug appears — e.g. `"xin chào"` → sends `"xin chào"` then immediately sends `"chào"` again
- **Without spaces**: bug absent — e.g. `"xinchao"` sends exactly once
- **Clicking Gửi button** instead of Enter: no bug

---

## Debug Log Analysis

The debug page (`/tmp/ime_debug.html`) was run with full event instrumentation. Below is the critical sequence for `"xin chào"` + Enter:

```
[244] keydown(Enter) — value="xin chào"        ← USER presses Enter
[245] keydown — before btn.click()
[246] CLICK — captured t="xin chào"             ← correct capture
[247] CLICK — after inp.value="" → ""            ← input cleared ✓
[248] EVT:blur → ""
[249] CLICK — after inp.blur() → ""
[250] EVT:focus → ""
[251] CLICK — after inp.focus() → ""
[252] keydown — after btn.click() → ""
[253] keydown — after inp.value="" → ""
[254] EVT:input data="chào" → value="chào"       ← IME RE-INSERTS via 'input' event ❌
[255] EVT:keyup → "chào"
[256] keydown(Enter) — value="chào"              ← 2ND ENTER AUTO-FIRED BY macOS IME ❌
[257] keydown — before btn.click()
[258] CLICK — captured t="chào"                  ← SECOND SEND — THE BUG
[259] CLICK — after inp.value="" → ""
```

### Key Finding: `compositionend` NEVER fires in this scenario

All previous fix attempts were wrong because they targeted the wrong event:

| Fix Attempt | Why It Failed |
|---|---|
| `type="button"` on send button | Prevents form submit double-fire, unrelated to this bug |
| `input.blur(); input.focus()` after clear | Assumes `compositionend` fires synchronously — it does NOT |
| `compositionend` event listener + flag | `compositionend` never fires when Enter commits the composition |
| `setTimeout(30ms)` clear | The re-insertion (`input` [254]) and 2nd Enter ([256]) both happen at ~38ms, **after** the 30ms timeout fires |

### Why the 2nd keydown(Enter) appears

macOS IME commit sequence when Enter is pressed with active composition:
1. `keydown(Enter)` fires → our handler sends message, clears input
2. IME commits its buffer by firing `input` event (re-inserts last word, e.g. `"chào"`)
3. macOS passes through the original Enter keystroke → fires another `keydown(Enter)`

This is standard macOS WebKit/Blink behavior. There is no way to prevent step 2 or 3 individually — the only solution is to **detect and block the 2nd Enter**.

### Timing from debug log

| Event | Timestamp | Delta from 1st Enter |
|---|---|---|
| 1st `keydown(Enter)` | 289559ms | 0ms |
| IME `input` re-insert | 289592ms | +33ms |
| 2nd `keydown(Enter)` | 289597ms | +38ms |
| `setTimeout(30)` would fire | 289589ms | +30ms — **before** re-insert ❌ |

A 200ms debounce window easily covers the ~38ms gap.

---

## Root Cause (Definitive)

**macOS IME auto-fires a second `keydown(Enter)` approximately 38ms after the first**, after committing its composition buffer via an `input` event. This second Enter re-triggers the send handler with the re-inserted text.

---

## The Fix

### Pattern: `_justSent` debounce flag in keydown handler

```javascript
// admin.js (bindOrders) — same pattern used in chat.js (bindEvents)
let _adminJustSent = false;
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (_adminJustSent) {
      // This is the IME-passthrough 2nd Enter — discard it, clear re-inserted text
      input.value = '';
      _adminJustSent = false;
      return;
    }
    _adminJustSent = true;
    setTimeout(() => { _adminJustSent = false; input.value = ''; }, 200);
    send.click();       // captures text and sends
    input.value = '';   // clear input
  }
});
```

**How it works:**

| Event | `_justSent` state | Action |
|---|---|---|
| 1st `keydown(Enter)` | `false` | Send message, set `_justSent = true` |
| IME `input` re-inserts "chào" | — | Value becomes "chào" |
| 2nd `keydown(Enter)` (+38ms) | `true` | Clear input, reset flag, **return without sending** ✅ |
| `setTimeout(200ms)` | — | Resets `_justSent = false` for next message |

---

## Self-Test Cases

### TC-IME-01 · Vietnamese Telex + Enter (with space — bug scenario)

| Step | Action | Expected |
|---|---|---|
| 1 | Admin chat: select a guest thread | Thread opens, input ready |
| 2 | Type `xin chàof` using Telex (x-i-n space c-h-a-o-f) | Input shows "xin chào" |
| 3 | Press **Enter** (do NOT add trailing space) | Bubble "xin chào" appears ONCE |
| 4 | Wait 500ms | No second bubble "chào" appears ✅ |
| 5 | Input field is empty | ✅ No leftover text |

---

### TC-IME-02 · Vietnamese Telex + Enter (long sentence)

| Step | Action | Expected |
|---|---|---|
| 1 | Type `tôi là nam` (Telex: t-o-i space l-a-f space n-a-m) — do NOT add trailing space | Input shows "tôi là nam" |
| 2 | Press **Enter** | ONE bubble "tôi là nam" |
| 3 | Wait 500ms | No second bubble "nam" ✅ |

---

### TC-IME-03 · No IME (plain ASCII) — must still work

| Step | Action | Expected |
|---|---|---|
| 1 | Type `hello world` (ASCII, no IME) | Input shows "hello world" |
| 2 | Press **Enter** | ONE bubble "hello world" |
| 3 | Input is empty | ✅ |

---

### TC-IME-04 · Rapid successive sends

| Step | Action | Expected |
|---|---|---|
| 1 | Type `xin chàof`, press Enter | One bubble "xin chào" |
| 2 | Immediately type `xin lỗif`, press Enter | One bubble "xin lỗi" — not blocked by previous 200ms window |
| 3 | Check: each message exactly once | ✅ |

> **Note**: The 200ms debounce resets after the 2nd Enter is consumed (~38ms). By the time user types the next message (>200ms), `_justSent` is already `false`.

---

### TC-IME-05 · Click Gửi button (bypass Enter entirely)

| Step | Action | Expected |
|---|---|---|
| 1 | Type `xin chàof` | Input "xin chào" |
| 2 | Click **Gửi** button (mouse) | ONE bubble "xin chào" |
| 3 | No duplicate | ✅ |

> Button click does not go through the keydown path; no IME passthrough Enter is triggered.

---

### TC-IME-06 · Customer widget (chat.js) — same fix applied

Repeat TC-IME-01 through TC-IME-05 on `http://localhost:8080` customer widget. Same `_imeSent` flag is in place.

---

## Console Debug Commands

Run in browser DevTools (admin tab open, Chat tab selected):

```javascript
// Confirm send button is type="button" (not submit)
document.getElementById('chat-send').type  // → "button"

// Confirm autocomplete is off
document.getElementById('chat-input').autocomplete  // → "off"

// Manually verify _adminJustSent is not stuck
// (access is not exposed, but if next Enter doesn't send, it means flag is stuck)
// Workaround: click Gửi button with mouse to bypass keydown path

// Check Firestore messages count for active thread
// (open Firebase console → guestChats → [sessionId] → messages)
```

---

## Fix History (all attempts for this single bug)

| Version | Approach | Result |
|---|---|---|
| v5 | `type="button"` on send button | ✅ Fixed form-submit double-fire, ❌ did not fix IME |
| v5 | `blur(); focus()` after clear | ❌ compositionend not guaranteed sync |
| v6 | `compositionend` listener + flag | ❌ compositionend never fires in this scenario |
| v7 | `compositionend` + `setTimeout(30)` | ❌ setTimeout fires before re-insertion at ~33ms |
| **v8** | **`_justSent` 200ms debounce flag** | **✅ Blocks the 2nd IME-passthrough Enter directly** |
