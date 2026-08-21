# API Documentation

The Fundsroom Mini Operations ERP uses a RESTful JSON API. All protected endpoints require a valid JWT token sent in the `Authorization: Bearer <token>` header.

---

## 1. Authentication
All users must authenticate to obtain a token.

### `POST /api/auth/login`
**Public Route**
- **Description:** Authenticates a user and returns a JWT.
- **Request Body:**
  ```json
  { "email": "admin@erp.com", "password": "Password123" }
  ```
- **Responses:**
  - `200 OK`: Returns `{ "token": "...", "user": { ... } }`
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account is inactive.

### `GET /api/auth/me`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Retrieves the current authenticated user's profile.

### `GET /api/auth/users`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Lists all active users (used for populating dropdowns like assignee selection).

---

## 2. Inventory
Manages locations, items, and current stock levels.

### `GET /api/inventory`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Lists all inventory across all locations, including `physicalQty`, `reservedQty`, and calculated `availableQty`.

### `POST /api/inventory`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Creates a new inventory record.
- **Request Body:** `{ itemId, locationId, batch, physicalQty }`

### `PUT /api/inventory/:id`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Modifies existing inventory `physicalQty` (generates audit transaction).
- **Request Body:** `{ physicalQty }`

### `GET /api/inventory/items` & `GET /api/inventory/locations`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Retrieves reference data for dropdowns.

---

## 3. Work Orders
Manages manufacturing and maintenance work orders. Shortages are calculated automatically by the backend.

### `GET /api/work-orders`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Lists all work orders.

### `POST /api/work-orders`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Creates a new work order.
- **Request Body:** `{ locationId, itemId, requiredQty, assignedUserId, notes }`

### `PUT /api/work-orders/:id`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Updates the status of a work order (`ASSIGNED` -> `IN_PROGRESS` -> `COMPLETED`).
- **Request Body:** `{ status }`
- **Errors:** `400 Bad Request` if attempting an invalid status transition.

---

## 4. Internal Transfers
Manages physical stock movement between locations securely and transactionally.

### `GET /api/transfers`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Lists all transfers.

### `POST /api/transfers`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Requests a new transfer (`REQUESTED` status).
- **Request Body:** `{ sourceLocId, destLocId, itemId, batch, quantity }`

### `POST /api/transfers/:id/dispatch`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Dispatches a requested transfer. Atomically decrements the source location's physical quantity.
- **Errors:** `400` if source lacks sufficient available stock, or if not in `REQUESTED` state.

### `POST /api/transfers/:id/receive`
- **Roles:** `ADMIN`, `OPERATIONS_USER`
- **Description:** Receives a dispatched transfer. Atomically increments the destination location's physical quantity.
- **Errors:** `400` if not in `DISPATCHED` state (prevents duplicate receipt).

---

## 5. Customer Orders (Reservations)
Manages customer demands and atomic stock reservation.

### `GET /api/orders`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Lists all customer orders.

### `POST /api/orders`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Creates a `DRAFT` customer order. No stock is reserved yet.
- **Request Body:** 
  ```json
  {
    "customerId": "...",
    "items": [{ "inventoryId": "...", "itemId": "...", "quantity": 10 }]
  }
  ```

### `PUT /api/orders/:id/confirm`
- **Roles:** `ADMIN`, `OPERATIONS_USER`, `SALES_USER`
- **Description:** Atomically reserves stock for all items in a `DRAFT` order and transitions the order to `CONFIRMED`.
- **Logic:** Increments `reservedQty` across all referenced inventory records. Rolls back entirely if any single item exceeds available stock. Highly concurrency-safe.
- **Errors:** 
  - `400 Bad Request`: Insufficient stock for one or more items.
  - `409 Conflict`: Duplicate confirmation attempt.
