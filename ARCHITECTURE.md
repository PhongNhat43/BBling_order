# Sơ Đồ Kiến Trúc B.BLING

## Sơ Đồ Luồng Dữ Liệu

```mermaid
graph TB
    subgraph Customer["👤 KHÁCH HÀNG"]
        A1["📱 index.html<br/>Menu & Shopping"]
        A2["💳 payment.html<br/>Thanh Toán"]
        A3["💬 Chat Widget<br/>Liên Hệ Support"]
    end

    subgraph Admin["👨‍💼 ADMIN"]
        B1["📊 Dashboard<br/>Quản Lý Đơn"]
        B2["💬 Chat Threads<br/>Hỗ Trợ Khách"]
        B3["🍽️ Menu Manager<br/>Cập Nhật Menu"]
        B4["📈 Reports<br/>Báo Cáo Excel"]
    end

    subgraph Firebase["🔥 FIRESTORE DATABASE"]
        DB1["📋 /orders/{id}<br/>Order Data"]
        DB2["💭 /messages/{id}<br/>Chat Messages"]
        DB3["🍽️ /menu/data<br/>Menu Items"]
        DB4["🧪 /test<br/>Connection Test"]
    end

    subgraph Local["💾 LOCAL STORAGE"]
        L1["Menu Cache<br/>bb_categories<br/>bb_items"]
        L2["Session Data<br/>order_BILLXXXXXX"]
    end

    A1 -->|"1. Browse Menu"| A2
    A2 -->|"2. Checkout"| Firebase
    Firebase -->|"Store"| DB1
    Firebase -->|"Write"| L1
    
    A2 -->|"3. Chat (if transfer)"| A3
    A3 -->|"Send messages"| Firebase
    Firebase -->|"Listen"| DB2
    
    Admin -->|"Login"| B1
    B1 -->|"Read orders"| Firebase
    Firebase -->|"Real-time Snapshot"| B1
    Firebase -->|"Listen"| DB1
    
    B1 -->|"Update status"| Firebase
    B2 -->|"Chat with customer"| Firebase
    B2 -->|"Listen messages"| DB2
    
    B3 -->|"Edit menu"| Firebase
    Firebase -->|"Sync"| DB3
    Firebase -->|"Update event"| A1
    
    B4 -->|"Export orders"| DB1
    B1 -->|"View bills"| DB1

    style Customer fill:#e1f5ff
    style Admin fill:#fff3e0
    style Firebase fill:#f3e5f5
    style Local fill:#f1f8e9
```

## Sơ Đồ Chi Tiết Các Trang

### 🏠 Trang Khách (index.html)
```mermaid
graph LR
    A["🔥 Firebase<br/>Menu Data"]
    B["💾 LocalStorage<br/>Fallback"] 
    C["📝 Menu Store<br/>menu-store.js"]
    
    D["🎨 Render Menu<br/>Categories"]
    E["🛒 Shopping Cart<br/>State"]
    F["✏️ Product Modal<br/>Options"]
    G["📋 Order Sheet<br/>Review"]
    
    A -->|Load| C
    B -->|If offline| C
    C -->|Data| D
    D -->|User pick| F
    F -->|Add to cart| E
    E -->|View cart| G
    G -->|Submit| H["💳 Payment Page"]
    
    style A fill:#f3e5f5
    style B fill:#f1f8e9
    style H fill:#fff3e0
```

### 💳 Trang Thanh Toán (payment.html)
```mermaid
graph TD
    A["📋 Order Data<br/>from sessionStorage"]
    B["👤 Customer Form<br/>Name • Phone • Address"]
    C["🔍 Location Data<br/>City → District → Ward"]
    
    D{{"Payment<br/>Method?"}}
    
    E["💵 Cash<br/>Status: unverified_cash"]
    F["🏦 Transfer<br/>Status: pending_transfer"]
    
    E -->|Submit| G["📤 Save to Firebase"]
    F -->|Generate QR| H["📸 Upload Receipt"]
    H -->|Submit| G
    
    G -->|Success| I["✅ Redirect to<br/>Tracking Page"]
    
    style E fill:#fff3e0
    style F fill:#fff3e0
    style G fill:#f3e5f5
    style I fill:#e8f5e9
```

### 📊 Dashboard Admin (admin-dashboard.html)
```mermaid
graph LR
    subgraph Tabs["TABS"]
        T1["📋 Orders<br/>List & Filter"]
        T2["💬 Chat<br/>Threads"]
        T3["🍽️ Menu<br/>Management"]
        T4["📈 Reports<br/>Export"]
    end
    
    subgraph Detail["ORDER DETAIL"]
        D1["👤 Customer Info"]
        D2["🛍️ Items List"]
        D3["📸 Bill Preview"]
        D4["💬 Chat Panel"]
    end
    
    subgraph Firebase["FIREBASE"]
        F1["Read /orders"]
        F2["Update status"]
        F3["Write message"]
        F4["Get /menu"]
    end
    
    T1 -->|Select| Detail
    T2 -->|Chat with| Detail
    T3 -->|Edit| F4
    T4 -->|Export| F1
    
    Detail -->|Push update| Firebase
    Firebase -->|Snapshot listener| T1
    Firebase -->|Message listener| D4
    
    style Tabs fill:#fff3e0
    style Detail fill:#e1f5ff
    style Firebase fill:#f3e5f5
```

## Sơ Đồ Trạng Thái Đơn Hàng

```mermaid
stateDiagram-v2
    [*] --> Create: Customer<br/>Submit Order
    
    Create --> CashDecision{Payment<br/>Method?}
    
    CashDecision -->|Cash| Unverified: Status:<br/>unverified_cash
    CashDecision -->|Transfer| Pending: Status:<br/>pending_transfer
    
    Unverified -->|Admin Approve| Processing: Status:<br/>processing
    Pending -->|Admin Verify| Processing
    
    Processing -->|Admin Complete| Completed: Status:<br/>completed
    Completed --> [*]
    
    Unverified -->|Admin Cancel| Canceled: Status:<br/>canceled
    Pending -->|Admin Cancel| Canceled
    Processing -->|Admin Cancel| Canceled
    Canceled --> [*]
    
    Unverified -->|Admin Fail| Failed: Status:<br/>failed
    Pending -->|Admin Fail| Failed
    Processing -->|Admin Fail| Failed
    Failed --> [*]
    
    style Create fill:#e1f5ff
    style Unverified fill:#fff3e0
    style Pending fill:#fff3e0
    style Processing fill:#e3f2fd
    style Completed fill:#e8f5e9
    style Canceled fill:#ffcccc
    style Failed fill:#ffcccc
```

## Sơ Đồ Chat Real-time

```mermaid
graph LR
    subgraph Customer["👤 Customer"]
        C1["📱 Chat Widget<br/>on index.html"]
    end
    
    subgraph Firebase["🔥 FIRESTORE"]
        F1["/{orderId}/messages"]
    end
    
    subgraph Admin["👨‍💼 Admin"]
        A1["💬 Chat Threads<br/>on dashboard"]
    end
    
    C1 -->|1. Send message| Firebase
    Firebase -->|2. On Snapshot| A1
    A1 -->|3. Admin reply| Firebase
    Firebase -->|4. On Snapshot| C1
    
    C1 -.->|Auto scroll| C1
    A1 -.->|New notification| A1
    
    style Customer fill:#e1f5ff
    style Admin fill:#fff3e0
    style Firebase fill:#f3e5f5
```

## Sơ Đồ Code Architecture

```mermaid
graph TD
    subgraph Frontend["FRONTEND FILES"]
        HTML1["index.html"]
        HTML2["payment.html"]
        HTML3["admin-dashboard.html"]
        HTML4["admin-login.html"]
    end
    
    subgraph JS["JAVASCRIPT MODULES"]
        JS1["firebase-config.js<br/><small>@init Firebase SDK</small>"]
        JS2["menu-store.js<br/><small>@menu data layer</small>"]
        JS3["app.js<br/><small>@customer flow</small>"]
        JS4["admin.js<br/><small>@admin dashboard</small>"]
        JS5["chat.js<br/><small>@chat widget</small>"]
    end
    
    subgraph Config["CONFIGURATION"]
        C1["firestore.rules<br/><small>Database rules</small>"]
        C2["firestore.indexes.json<br/><small>Query indexes</small>"]
        C3["storage.rules<br/><small>Storage rules</small>"]
    end
    
    HTML1 --> JS1
    HTML1 --> JS2
    HTML1 --> JS3
    HTML1 --> JS5
    
    HTML2 --> JS1
    
    HTML3 --> JS1
    HTML3 --> JS2
    HTML3 --> JS4
    HTML3 --> JS5
    
    HTML4 --> JS1
    
    JS1 --> C1
    JS1 --> C2
    JS1 --> C3
    
    style Frontend fill:#e1f5ff
    style JS fill:#fff3e0
    style Config fill:#f3e5f5
```

## Sơ Đồ Firestore Collections

```mermaid
graph TD
    subgraph Firestore["B.BLING COFFEE - b-bling-coffee"]
        subgraph Orders["📋 /orders/{billId}"]
            OD1["id: BILLXXXXXX"]
            OD2["items: Array"]
            OD3["customer: Object"]
            OD4["method: cash|transfer"]
            OD5["status: unverified_cash|..."]
            OD6["createdAt: timestamp"]
            OD7["billUrl: string"]
            OD8["note: string"]
            
            subgraph Msgs["· /messages/{msgId}"]
                M1["from: admin|customer"]
                M2["type: text|image"]
                M3["content: string"]
                M4["createdAt: timestamp"]
            end
            
            OD1 --> Msgs
        end
        
        subgraph Menu["🍽️ /menu/data"]
            MN1["categories: Array"]
            MN2["items: Array"]
        end
        
        subgraph Test["🧪 /test/connection-test"]
            T1["timestamp: number"]
        end
    end
    
    style Orders fill:#e3f2fd
    style Msgs fill:#f1f8e9
    style Menu fill:#fff3e0
    style Test fill:#ffcccc
```
