# Fundsroom Mini Operations ERP

A streamlined, modern Enterprise Resource Planning (ERP) platform designed specifically for inventory tracking, internal stock transfers, work order management, and customer order fulfillment. Built with a focus on auditability, data integrity, and strict Role-Based Access Control (RBAC).

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Testing](https://img.shields.io/badge/Tests-53%2F53_Passing-brightgreen?style=for-the-badge)
![Build](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge)

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Project Objectives](#3-project-objectives)
4. [Functional Scope](#4-functional-scope)
5. [User Roles & RBAC](#5-user-roles--rbac)
6. [System Architecture](#6-system-architecture)
7. [Request Flow](#7-request-flow)
8. [Database Architecture](#8-database-architecture)
9. [Database Integrity](#9-database-integrity)
10. [Inventory Model](#10-inventory-model)
11. [Stock Reservation](#11-stock-reservation)
12. [Customer Order Workflow](#12-customer-order-workflow)
13. [Work Orders](#13-work-orders)
14. [Internal Transfers](#14-internal-transfers)
15. [Inventory Transaction / Audit System](#15-inventory-transaction--audit-system)
16. [Frontend Architecture](#16-frontend-architecture)
17. [Reusable Modal Architecture](#17-reusable-modal-architecture)
18. [REST API](#18-rest-api)
19. [Authentication & Security](#19-authentication--security)
20. [Testing Strategy](#20-testing-strategy)
21. [Build & Verification](#21-build--verification)
22. [Database Cleanup & Final Seed State](#22-database-cleanup--final-seed-state)
23. [Seed Data](#23-seed-data)
24. [Local Development](#24-local-development)
25. [Complete Project Structure](#25-complete-project-structure)
26. [Design Decisions](#26-design-decisions)
27. [Challenges & Solutions](#27-challenges--solutions)
28. [Current Limitations](#28-current-limitations)
29. [Future Improvements](#29-future-improvements)
30. [Final Verification Checklist](#30-final-verification-checklist)

---

## 1. Project Overview

The Fundsroom Mini Operations ERP is a centralized web application that digitizes operations between sales, warehouse, and production floors. It replaces disjointed spreadsheets by providing a unified, real-time view of inventory levels, committed stock, internal stock movements, and manufacturing shortages.

## 2. Problem Statement

Manufacturing and distribution businesses often suffer from a disconnect between sales commitments and warehouse reality. When sales representatives sell stock that isn't physically available (or is already promised to another customer), it leads to fulfillment delays. Similarly, when production floors run out of materials, work orders stall. The Mini Operations ERP solves this by enforcing a strict physical vs. reserved inventory model and offering a transparent internal transfer mechanism to resolve stock shortages.

## 3. Project Objectives

| Objective | Description |
|---|---|
| **Inventory Control** | Real-time tracking of item quantities across multiple physical locations and distinct batches. |
| **Stock Reservation** | Strictly preventing the overselling of stock by tracking committed (reserved) quantities against physical stock. |
| **Internal Transfers** | Enabling multi-step, auditable movement of stock between different warehouse locations (Dispatch & Receive). |
| **Work Orders** | Managing production tasks, assigning them to operators, and calculating real-time material shortages. |
| **Customer Orders** | Empowering sales teams to create orders that safely lock down inventory for customer fulfillment. |
| **Auditability** | Maintaining a complete, immutable ledger of every single stock movement, adjustment, and reservation. |

## 4. Functional Scope

| Module | Functionality | Roles | Status |
|---|---|---|---|
| **Authentication** | Login via JWT | All | Implemented |
| **Inventory** | View real-time availability across locations | All | Implemented |
| **Inventory** | Adjust stock physically on hand | Admin, Operations | Implemented |
| **Inventory** | Receive new stock into a location | Admin, Operations | Implemented |
| **Transfers** | Create Internal Transfer request | Admin, Operations | Implemented |
| **Transfers** | Dispatch transfer (deduct from source) | Admin, Operations | Implemented |
| **Transfers** | Receive transfer (add to destination) | Admin, Operations | Implemented |
| **Work Orders** | Create Work Order | Admin, Operations | Implemented |
| **Work Orders** | Transition Work Order (Start/Complete) | Admin, Operations | Implemented |
| **Customer Orders** | Create Draft Order | Admin, Sales | Implemented |
| **Customer Orders** | Confirm Order (triggers reservation) | Admin, Sales | Implemented |
| **Customer Orders** | Cancel Order (releases reservation) | Admin, Sales | Implemented |

## 5. User Roles & RBAC

The system employs strict Role-Based Access Control enforced at both the UI (route guarding, element hiding) and the API level (JWT verification and middleware role checks).

| Capability | `ADMIN` | `OPERATIONS_USER` | `SALES_USER` |
|---|:---:|:---:|:---:|
| **View Dashboard & Inventory** | ✓ | ✓ | ✓ |
| **Receive / Adjust Inventory** | ✓ | ✓ | ✗ |
| **Create & Process Transfers** | ✓ | ✓ | ✗ |
| **Manage Work Orders** | ✓ | ✓ | ✗ |
| **Create Customer Orders** | ✓ | ✗ | ✓ |
| **Confirm / Cancel Orders** | ✓ | ✗ | ✓ |

* **Authentication Strategy**: The backend issues a signed JWT containing the user ID, email, and role. This token is passed via the `Authorization: Bearer <token>` header. 
* **Middleware (`requireAuth`, `requireRole`)**: Routes are strictly guarded to reject unauthorized or out-of-role requests before they reach business logic.

---

## 6. System Architecture

```mermaid
flowchart LR
    U[Users: Admin / Ops / Sales] -->|HTTPS| F[React Frontend\nTypeScript, Vite]
    F -->|Axios JSON API| B[Express.js Backend\nREST API]
    
    subgraph Backend Services
        B --> AUTH[Auth Middleware\nJWT / RBAC]
        AUTH --> BL[Business Logic Layer\nValidation & Orchestration]
        BL --> ORM[Prisma ORM\nTyped Queries & Transactions]
    end
    
    ORM -->|TCP/IP| DB[(PostgreSQL Database)]
```

## 7. Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API (Express)
    participant Auth Middleware
    participant Controller
    participant Prisma
    participant PostgreSQL
    
    User->>Frontend: Clicks "Confirm Order"
    Frontend->>API: PUT /api/orders/:id/confirm (JWT Bearer)
    API->>Auth Middleware: Validate token & roles
    Auth Middleware-->>API: Authorized
    API->>Controller: Execute order confirmation
    Controller->>Prisma: Begin $transaction
    Prisma->>PostgreSQL: Verify available stock (SELECT FOR UPDATE logically)
    PostgreSQL-->>Prisma: Stock data
    Controller->>Prisma: Increase reservedQty on Inventory
    Controller->>Prisma: Insert RESERVATION into Audit Log
    Controller->>Prisma: Update OrderStatus to CONFIRMED
    Prisma->>PostgreSQL: COMMIT Transaction
    Controller-->>Frontend: 200 OK + Updated Order
    Frontend-->>User: UI updates to reflect reservation
```

---

## 8. Database Architecture

The data layer is managed by Prisma and backed by PostgreSQL.

| Model | Purpose | Important Relationships |
|---|---|---|
| `User` | Authentication and RBAC | Assigned to Work Orders, Creator of entities |
| `Category` | Categorization for Items | 1:M with Item |
| `Item` | Definition of a product / raw material | 1:M with Inventory, WorkOrders, Transfers, OrderItems |
| `Location` | Physical warehouses or zones | 1:M with Inventory, Transfers (Src/Dest) |
| `Inventory` | Core ledger state per Item+Location+Batch | M:1 with Item, Location. 1:M with Transactions |
| `InventoryTransaction` | Immutable audit log of all stock changes | M:1 with Inventory, User |
| `WorkOrder` | Manufacturing directives | M:1 with Item, Location, Assigned User |
| `InternalTransfer` | Stock movement workflow | M:1 with Item, Source Loc, Dest Loc |
| `Customer` | External buyer | 1:M with CustomerOrder |
| `CustomerOrder` | Sales record | 1:M with OrderItems |
| `OrderItem` | Line items for a specific order | M:1 with CustomerOrder, Inventory, Item |

**Entity Relationship Diagram:**

```mermaid
erDiagram
    Item ||--o{ Inventory : "stored as"
    Location ||--o{ Inventory : "houses"
    Inventory ||--o{ InventoryTransaction : "audits"
    User ||--o{ WorkOrder : "assigned to"
    WorkOrder }|--|| Item : "requires"
    InternalTransfer }|--|| Location : "source"
    InternalTransfer }|--|| Location : "destination"
    CustomerOrder ||--o{ OrderItem : "contains"
    OrderItem }|--|| Inventory : "reserves from"
    Customer ||--o{ CustomerOrder : "places"
```

## 9. Database Integrity

- **Idempotency Guards:** The `InventoryTransaction` table enforces a unique constraint on `[referenceId, type]` to prevent accidental double-processing of events (like receiving a transfer twice).
- **Concurrency Protection:** Multi-step business logic (such as Confirming an Order) relies on Prisma `$transaction` blocks to ensure atomic updates. If a stock reservation fails, the entire order state rollback occurs automatically.
- **Constraints:** `Inventory` requires unique rows per `[itemId, locationId, batch]` to prevent fragmented ledger states.

---

## 10. Inventory Model

The system differentiates between physical assets and business commitments.

```text
┌──────────────────────────┐
│     Physical Stock       │ (Actual boxes sitting in the warehouse)
│           100            │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│    Reserved Stock        │ (Committed to CONFIRMED customer orders)
│            30            │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Available Stock        │ (Calculated at query time: Physical - Reserved)
│            70            │
└──────────────────────────┘
```

Available stock is **never stored** in the database directly. It is computed in the application layer or at query time to prevent data drift and synchronization anomalies.

## 11. Stock Reservation

**Workflow:**
1. Sales User creates a `DRAFT` Customer Order. (No inventory impact).
2. Sales User reviews and clicks **Confirm**.
3. System verifies `AvailableQty >= OrderQty`.
4. If valid, the system strictly increases `reservedQty` on the related Inventory record.
5. An audit `RESERVATION` transaction is created.

If the order is subsequently **Cancelled**, the `reservedQty` is decreased, and a `RESERVATION_RELEASE` transaction is logged, restoring the available balance.

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create Order
    DRAFT --> CONFIRMED: Confirm Order\n(Increases Reserved Stock)
    CONFIRMED --> CANCELLED: Cancel Order\n(Decreases Reserved Stock)
    DRAFT --> CANCELLED: Cancel Draft\n(No Stock Impact)
```

## 12. Customer Order Workflow

| Status | Meaning | Inventory Effect |
|---|---|---|
| `DRAFT` | Initial state; being built by Sales. | None. |
| `CONFIRMED` | Sale finalized; items committed. | `reservedQty` increases. |
| `CANCELLED` | Order aborted. | `reservedQty` decreases (if previously confirmed). |

## 13. Work Orders

Work Orders are manufacturing directives sent to the floor. The system automatically calculates shortages based on `requiredQty` vs. `availableQty` of the needed item at the specified location.

```mermaid
stateDiagram-v2
    [*] --> ASSIGNED: Create Work Order
    ASSIGNED --> IN_PROGRESS: Start Production
    IN_PROGRESS --> COMPLETED: Finish Production
```

*Note: Work Orders currently provide tracking and shortage visibility, but they do not automatically consume raw materials in this project iteration.*

## 14. Internal Transfers

Moving stock between facilities is a multi-step process ensuring goods aren't lost in transit.

**Stock Effect Table:**

| Event | Source Physical | Source Reserved | Destination Physical |
|---|---|---|---|
| **Created** (`REQUESTED`) | No change | No change | No change |
| **Dispatched** (`DISPATCHED`) | **Decreases** by TransferQty | No change | No change (Goods in transit) |
| **Received** (`RECEIVED`) | No change | No change | **Increases** by TransferQty |

```mermaid
stateDiagram-v2
    [*] --> REQUESTED: Create Transfer Request
    REQUESTED --> DISPATCHED: Dispatch from Source
    DISPATCHED --> RECEIVED: Receive at Destination
```

## 15. Inventory Transaction / Audit System

Every change to an `Inventory` record's `physicalQty` or `reservedQty` **must** be accompanied by a row in the `InventoryTransaction` ledger.

* `STOCK_IN` / `STOCK_OUT`: Manual stock adjustments/receipts.
* `TRANSFER_OUT` / `TRANSFER_IN`: System-driven facility movements.
* `RESERVATION` / `RESERVATION_RELEASE`: System-driven sales commitments.

```mermaid
flowchart LR
    A[Business Action] --> B{Transaction Block}
    B -->|Update| C[Inventory Ledger]
    B -->|Insert| D[Audit Transaction]
    D --> E[Permanent History]
```

---

## 16. Frontend Architecture

The frontend is built with React 18, Vite, and TypeScript. 

```text
frontend/
├── src/
│   ├── components/
│   │   ├── UI/
│   │   │   └── Modal.tsx        (Reusable generic modal structure)
│   │   ├── Layout.tsx           (App shell, sidebar, header)
│   │   └── ProtectedRoute.tsx   (RBAC UI guard)
│   ├── context/
│   │   └── AuthContext.tsx      (Global user and JWT state)
│   ├── lib/
│   │   └── api.ts               (Axios instance with JWT interceptor)
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── Transfers.tsx
│   │   ├── WorkOrders.tsx
│   │   └── CustomerOrders.tsx
│   ├── index.css                (Global design system and modal CSS)
│   └── main.tsx
└── package.json
```

## 17. Reusable Modal Architecture

To ensure a highly professional and consistent UI, the application utilizes a centralized `Modal` component.

* **Backdrop**: Fixed positioning, darkened overlay, blocks background interaction.
* **Container**: Centered, responsive max-width, elevated shadow, border-radius.
* **Header / Body / Footer**: Flexbox-based content separation to ensure scrollable long-forms without losing access to primary action buttons.

**Consumers of the Modal Architecture:**
1. `Inventory.tsx` (Receive Stock, Adjust Stock)
2. `Transfers.tsx` (Create Transfer Request)
3. `WorkOrders.tsx` (Create Work Order)
4. `CustomerOrders.tsx` (Create Customer Order with inline dynamic line-items)

---

## 18. REST API

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | Public | — | Authenticate and retrieve JWT |
| `GET`  | `/api/auth/me` | JWT | All | Retrieve current user profile |
| `GET`  | `/api/auth/users` | JWT | Admin, Ops | List users for assignments |
| `GET`  | `/api/inventory` | JWT | All | View current inventory |
| `POST` | `/api/inventory` | JWT | Admin, Ops | Receive new stock |
| `PUT`  | `/api/inventory/:id` | JWT | Admin, Ops | Adjust physical stock manually |
| `GET`  | `/api/transfers` | JWT | All | View transfers |
| `POST` | `/api/transfers` | JWT | Admin, Ops | Request a transfer |
| `POST` | `/api/transfers/:id/dispatch` | JWT | Admin, Ops | Dispatch transfer (deduct stock) |
| `POST` | `/api/transfers/:id/receive` | JWT | Admin, Ops | Receive transfer (add stock) |
| `GET`  | `/api/work-orders` | JWT | All | View work orders |
| `POST` | `/api/work-orders` | JWT | Admin, Ops | Create work order |
| `PUT`  | `/api/work-orders/:id` | JWT | Admin, Ops | Update work order status |
| `GET`  | `/api/orders` | JWT | All | View customer orders |
| `POST` | `/api/orders` | JWT | Admin, Sales | Create draft order |
| `PUT`  | `/api/orders/:id/confirm` | JWT | Admin, Sales | Confirm order (reserve stock) |
| `PUT`  | `/api/orders/:id/cancel` | JWT | Admin, Sales | Cancel order (release stock) |

## 19. Authentication & Security

* **JWT Verification**: Tokens expire and are signed with a secure 256-bit secret.
* **Password Hashing**: BCrypt handles one-way password salting and hashing.
* **RBAC Guarding**: A custom middleware array determines if a user's role is permitted to execute an endpoint route.
* **CORS**: Securely configured for the frontend origin.

---

## 20. Testing Strategy

The backend API uses **Vitest** and **Supertest** to execute comprehensive integration and end-to-end business rule testing against an isolated test database.

| Area | Tests Included | Result |
|---|---|---|
| **Authentication** | Login failures, successful token issuance, route guarding. | PASS |
| **Inventory** | Creation, fetching, physical stock adjustments, validation. | PASS |
| **Transfers** | Status transitions, source depletion logic, destination accretion logic, idempotency guards. | PASS |
| **Orders** | Draft creation, line-item insertion, reservation quantity math, cancellation reversals. | PASS |
| **Work Orders** | Creation, proper assignment linkage, status transitions. | PASS |

> **Current Result**: 53 out of 53 tests passing (100% coverage of core business rules).

## 21. Build & Verification

| Verification | Command | Result |
|---|---|---|
| **Backend API Build** | `npm run build` (tsc) | PASS |
| **Frontend UI Build** | `npm run build` (vite build) | PASS |
| **Backend Tests** | `npm test` (vitest run) | 53/53 PASS |

## 22. Database Cleanup & Final Seed State

During final audits, duplicate test data (specifically an errant transfer `TRF-2026-0002` and its unlinked transactions) was surgically removed to guarantee perfect mathematical purity in the application state.

**Cleanup Sequence:**
```mermaid
flowchart LR
    A[Identify Duplicate\nTRF-2026-0002] --> B[Prisma $transaction]
    B --> C[Revert Source\nPhysical Qty]
    B --> D[Revert Dest\nPhysical Qty]
    B --> E[Delete TRANSFER_IN\nAudit Record]
    B --> F[Delete TRANSFER_OUT\nAudit Record]
    B --> G[Delete Transfer Record]
    G --> H[System Validated]
```

## 23. Seed Data

To facilitate testing and development, `prisma/seed.ts` loads the following deterministic dataset.

| Entity | Example Seed Data | Purpose |
|---|---|---|
| **Users** | `admin@erp.com`, `ops@erp.com`, `sales@erp.com` | Development Login & RBAC |
| **Warehouses** | `Main Warehouse`, `Branch Warehouse` | Multi-facility logic testing |
| **Items** | `Steel Rod 6m`, `Widget A100`, `PCB Circuit Board V2` | Product representations |
| **Inventory** | Initial stock loads across batches | Testing transfers and reservations |
| **Customers** | `Acme Corporation`, `BuildRight Ltd` | Orders mapping |

## 24. Local Development

### Prerequisites
* Node.js v18+
* PostgreSQL v14+
* npm or yarn

### 1. Database Setup
Ensure PostgreSQL is running. Configure your environment variables.
Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fundsroom_operations_erp?schema=public"
JWT_SECRET="<your-secret>"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

### 2. Backend Initialization
```bash
cd backend
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

### 3. Frontend Initialization
Create a `.env` file in the `frontend/` directory (if different from default):
```env
VITE_API_URL="http://localhost:3000/api"
```

```bash
cd frontend
npm install
npm run dev
```

## 25. Complete Project Structure

```text
mini-operations-erp/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── __tests__/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   └── API_DOCUMENTATION.md
└── README.md
```

## 26. Design Decisions

| Decision | Reason |
|---|---|
| **Prisma ORM** | Provides end-to-end type safety against the PostgreSQL schema and offers robust `$transaction` handling for critical multi-table updates (like dispatching transfers). |
| **PostgreSQL** | Chosen for its strict ACID compliance, which is absolutely mandatory for an ERP managing real-world physical assets. |
| **JWT** | Stateless authentication allows the API to scale easily without session affinity. |
| **Virtual "Available Stock"** | Rather than storing `availableQty` in the DB (which creates three sources of truth that can fall out of sync), we store Physical and Reserved, and compute Available on the fly. |
| **Reusable Modal Component** | Replaced fragmented `window.prompt` and disparate HTML dialogs with a single React abstraction to enforce visual consistency and brand guidelines. |

## 27. Challenges & Solutions

| Challenge | Solution |
|---|---|
| **Preventing Phantom Inventory Discrepancies** | Replaced ad-hoc updates with strict `$transaction` blocks ensuring an `Inventory` modification **cannot** commit without its accompanying `InventoryTransaction` audit record. |
| **Duplicate Transfer Processing** | Implemented unique idempotency constraints on `InventoryTransaction([referenceId, type])` so that a user furiously clicking "Receive" on a slow network cannot credit the destination warehouse twice. |
| **UI Form Inconsistencies** | Created a centralized `Modal.tsx` and `.modal-backdrop` CSS architecture, migrating all legacy dialogs to use the unified design. |

## 28. Current Limitations
* **Negative Physical Inventory:** The system relies on users accurately reporting physical quantities; there are no hard stops preventing physical stock from being adjusted to zero during active orders (though the UI warns the user).
* **Work Order Consumption:** Work Orders calculate and report shortages, but completing a Work Order does not yet automatically consume the raw materials or output the finished goods into the inventory ledger.

## 29. Future Improvements
* **Automated BOM Consumption:** Implementing a Bill of Materials engine so that when a Work Order is marked `COMPLETED`, raw materials are automatically depleted and the finished item is created in inventory.
* **Barcode / QR Scanning:** Enhancing the frontend to accept input from external scanners for extremely rapid stock adjustments and transfer verifications on the warehouse floor.
* **Real-time WebSockets:** Pushing inventory ledger updates to all connected clients immediately to prevent two Sales Users from simultaneously attempting to reserve the last unit of stock.

---

## 30. Final Verification Checklist

- [x] Backend builds successfully (`npm run build`)
- [x] Frontend builds successfully (`npm run build`)
- [x] Automated tests pass (53/53 tests green)
- [x] Prisma schema thoroughly verified and documented
- [x] Seed data confirmed to be deterministic and safe
- [x] Inventory ledger mathematically pure
- [x] Duplicate transfer / bad test data eliminated
- [x] Audit transactions are 1:1 linked with stock changes
- [x] Global Modal system standardized across the application
- [x] Customer Orders modal migrated to new architecture
- [x] Work Orders modal migrated to new architecture
- [x] Transfers modal migrated to new architecture
- [x] Inventory adjustment native prompts eliminated and migrated
- [x] No underlying business logic changed during documentation
- [x] No `.env` secrets or passwords exposed in public history
