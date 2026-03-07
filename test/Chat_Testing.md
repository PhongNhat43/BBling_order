# Chat System – Test Cases & Bug Log

> **Environment**: `http://localhost:8080` (python3 -m http.server 8080)  
> **Last updated**: 2026-03-07  
> **Version tested**: chat.js `v=20260307-4`, admin.js `v=20260307-4`

---

## Root Causes Found & Fixed

### BUG-01 · Admin chat full-reload on reply (FIXED ✅)

**Symptom**: When admin sends a reply, the entire chat panel flickers/reloads from the top — all messages disappear and re-render.

**Root cause**:  
`setupGuestChatsListener()` and `setupOrdersListener()` both called `renderDetail()` on every Firestore snapshot.  
Sending a reply triggers `lastMessageAt` update on the `guestChats` document → `guestChats` snapshot fires → `renderDetail()` runs → `chat.innerHTML = ''` wipes everything → new `messagesUnsub` created → all messages reload.

**Fix** (`admin.js`):  
Removed `renderDetail()` from both `setupGuestChatsListener()` and `setupOrdersListener()`.  
These listeners now only call `renderThreads()` (sidebar). `renderDetail()` is only triggered by explicit user click on a thread.

---

### BUG-02 · Customer messages duplicate in chat widget (FIXED ✅)

**Symptom**: Customer sends a message — it appears twice in the chat bubble area.

**Root causes** (three layers):

| Layer | Cause | Fix |
|---|---|---|
| A | Firestore fires snapshot twice per write: once with `hasPendingWrites:true` (optimistic) and once after server commit. Both triggered the render path if the guard was missing. | Added `if (ch.doc.metadata.hasPendingWrites) return;` |
| B | No deduplication by document ID — even if a message somehow slipped through the `from !== 'admin'` guard, it could render again. | Added `_renderedMsgIds` Set; skip if `ch.doc.id` already in set |
| C | `sendText()` could theoretically be called twice if Enter key fires `keydown` AND something else triggers click concurrently | Added `_sending` debounce flag — ignores calls within 600ms of first call |
| D | If `ChatManager` instantiated twice (e.g. script loaded twice), two listeners would be set up | Added `window.__bbChatInit` singleton guard on `DOMContentLoaded` |

**Fix** (`chat.js`):
```javascript
// In setupFirebaseChat():
this._renderedMsgIds = new Set(); // reset on re-init
// In snapshot listener:
if (ch.doc.metadata.hasPendingWrites) return;
if (this._renderedMsgIds.has(ch.doc.id)) return;
// ... only then render and mark
this._renderedMsgIds.add(ch.doc.id);

// In sendText():
if (this._sending) return;
this._sending = true;
setTimeout(() => { this._sending = false; }, 600);

// DOMContentLoaded:
if (window.__bbChatInit) return;
window.__bbChatInit = true;
```

---

### BUG-03 · Admin scroll on wrong DOM element (FIXED ✅)

**Symptom**: After admin sends a reply, page scrolls from top or does not auto-scroll to latest message.

**Root cause**:  
`chat.scrollTop = chat.scrollHeight` operated on `#chat-log`, which has **no** `overflow-y`.  
The actual scrollable container is its parent div (`#chat-scroll-container` added via HTML fix).

**Fix** (`admin.js` `renderDetail()`):
```javascript
const scrollContainer = qs('#chat-scroll-container');
// Smart scroll only when user is near bottom (< 120px threshold):
function smartScroll() {
  const nearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 120;
  if (nearBottom) scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
}
```

---

### BUG-04 · Orders showing in Chat sidebar (FIXED ✅)

**Symptom**: Admin chat sidebar showed mock/real orders (`#BILL087011`, `jhagjksagf`, etc.) mixed with guest chats.

**Root cause**: `renderThreads()` iterated both `orders` array and `guestChats` array.

**Fix**: `renderThreads()` rewritten to only render `guestChats`. Shows empty-state placeholder when no guests.

---

### BUG-05 · Chat panel height too small (FIXED ✅)

**Symptom**: Chat section only occupies ~50% of viewport height.

**Root cause**: `h-[calc(70vh-80px)]` on the inner grid div; the outer section had no `min-height`.

**Fix** (`admin-dashboard.html`):
- Section: `class="flex flex-col" style="min-height: 88vh;"`
- Grid: `class="flex-1 min-h-0 grid ..."`

---

### BUG-06 · Customer duplicate — `type="submit"` default button (FIXED ✅ v4)

**Symptom**: Every message customer sends appears twice in the chat widget.

**Root cause (definitive)**:
In `rebuildUI()`, the send button was declared without a `type` attribute:
```html
<button id="chat-send" class="...">Gửi</button>
```
HTML spec: a `<button>` **defaults to `type="submit"`** when no type is given.  
Result: pressing **Enter** in `#chat-input` fires BOTH the `keydown` event (→ `sendText()` #1) AND the browser's implicit form submit which clicks the submit button (→ `sendText()` #2) = **2 local bubbles + 2 Firestore writes**.

**Fix** (`chat.js` `rebuildUI()`):
```html
<button id="chat-send" type="button" class="...">Gửi</button>
```

---

### BUG-07 · Admin never sees own reply (FIXED ✅ v4)

**Symptom**: Admin sends a reply, input clears, but no bubble appears. Chat seems stuck until clicking the thread again (which reloads everything).

**Root cause**:
In v3, I added `if (change.doc.metadata.hasPendingWrites) return;` to `renderDetail()`.  
Firestore's behavior for a **new write from the same client**:
1. First snapshot: `type: 'added'`, `hasPendingWrites: true` → ❌ SKIPPED by guard
2. After server commit: `type: 'modified'`, `hasPendingWrites: false` → ❌ SKIPPED by `type !== 'added'` check

Net: admin messages **never appeared**. The admin clicked the thread to "check why nothing happened" → `renderDetail()` called → `chat.innerHTML = ''` → full reload → perceived as "reload on reply".

Unlike the **customer** side (which renders locally in `sendText()` first), admin relies entirely on the Firestore snapshot to render. The `hasPendingWrites` guard is wrong here.

**Fix** (`admin.js` `renderDetail()`):  
Remove `hasPendingWrites` guard. Rely solely on `data-msg-id` dedup to prevent duplicates.

---

### BUG-08 · Admin has no Enter-to-send (FIXED ✅ v4)

**Fix** (`admin.js` `bindOrders()`):
```javascript
input&&input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send&&send.click(); }
});
```

---



### TC-01 · Customer sends text message

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Open `http://localhost:8080` in browser | Page loads, chat toggle visible | — |
| 2 | Click chat toggle button | Chat panel opens, greeting shown | — |
| 3 | Type `"test message"` in input, press **Enter** | Bubble appears ONCE on right side, status "Đang gửi..." → "Đã gửi" | — |
| 4 | Wait 2 seconds | No duplicate bubble appears | — |
| 5 | Open Admin (`http://localhost:8080/admin-dashboard.html`) → Chat tab | Guest thread appears in sidebar | — |
| 6 | Click thread | Message `"test message"` visible in chat pane | — |

**Verify**: Exactly 1 bubble in customer panel and 1 in admin panel.

---

### TC-02 · Admin replies — no reload

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Admin selects a guest thread with multiple messages | All messages visible, scroll at bottom | — |
| 2 | Admin types reply and clicks **Gửi** | Reply appears as new bubble at bottom — existing messages DO NOT disappear | — |
| 3 | Customer panel | Admin reply bubble appears (from snapshot, `from === 'admin'`) | — |
| 4 | Admin sends 5 more messages in succession | Each appends without wiping history | — |

**Verify**: `chat.innerHTML` is NOT cleared on reply; only new `div` appended.

---

### TC-03 · Smart scroll behavior

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Admin chat has 20+ messages; scroll to top manually | User can read old messages without disruption | — |
| 2 | Customer sends a new message while admin is scrolled up | Chat does NOT auto-jump to bottom (threshold > 120px from bottom) | — |
| 3 | Admin scrolls back to near-bottom (< 120px from bottom) | Next new message auto-scrolls to bottom smoothly | — |

---

### TC-04 · Rapid send (debounce test)

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Customer: type message, press Enter **twice rapidly** | Only 1 bubble appears (debounce 600ms active) | — |
| 2 | Customer: click Send button twice rapidly | Only 1 bubble appears | — |
| 3 | Wait 1 second, send again | New message sends normally | — |

---

### TC-05 · Page refresh idempotency

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Customer: send a message | Message visible | — |
| 2 | Hard-refresh page (Cmd+Shift+R) | Previous chat history NOT shown (session is fresh, `lastProcessedTime` reset) | — |
| 3 | Admin: still shows all historical messages | Admin chat history intact (loaded from Firestore) | — |

---

### TC-06 · Admin sidebar — no mock data

| Step | Action | Expected | Status |
|---|---|---|---|
| 1 | Open Admin → Chat tab with no active guest sessions | Sidebar shows empty state placeholder `"Chưa có tin nhắn nào"` | — |
| 2 | Check sidebar: no order IDs like `#BILL087011` visible | ✅ Only guest chats listed | — |

---

## Debug Checklist

If issues recur, open browser DevTools → Console and check:

```
// For customer duplicate — should see EXACTLY 1 of these per message:
// "[Chat] snapshot ..." should NOT appear for customer's own messages

// For admin reload — should NOT see:
// renderDetail called from snapshot listener

// For scroll — #chat-scroll-container should have overflow-y: auto:
document.getElementById('chat-scroll-container').style.overflowY  // → "auto"
document.getElementById('chat-log').scrollHeight  // value
document.getElementById('chat-scroll-container').scrollHeight  // should match or be larger
```

### Known Limitation

- Customer chat history is not persisted across page refreshes (by design — `lastProcessedTime = Date.now()` on init prevents loading old messages into the widget).
- If admin tab is kept open for hours and a new message comes in from a customer, the `guestChats` reorder in the sidebar may briefly re-render the thread list (this is a sidebar-only update; the active chat pane is unaffected after the BUG-01 fix).
