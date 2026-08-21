# Phase 2 Review: Inventory Management Module

This document reflects the actual verified state of Phase 2 (Inventory) implementation for the Fundsroom Mini Operations ERP case study.

## What Was Implemented
- **Backend Inventory API**: Implemented fully functional REST endpoints for retrieving, creating, and adjusting inventory records, replacing the previous Phase 1 stubs.
- **Backend Business Rules & Validation**:
  - Implemented strict quantity validation preventing negative physical or reserved quantities.
  - Automatically calculates `availableQty` (`physicalQty - reservedQty`) on the fly for all returned records.
  - Returns `400 Bad Request` if a physical adjustment would result in a negative `availableQty`.
- **Database Constraints & Audit Log**:
  - Validates and enforces the Prisma composite unique constraint on `(itemId, locationId, batch)` preventing duplicate batch records.
  - Wraps inventory creation and adjustments in Prisma `$transaction` blocks.
  - Automatically writes immutable audit trails to `InventoryTransaction` whenever physical stock changes.
- **Role Authorization (RBAC)**:
  - Enforced `requireRole('ADMIN', 'OPERATIONS_USER')` on POST and PUT endpoints directly at the middleware layer. 
  - `SALES_USER` can view the inventory but receives `403 Forbidden` if attempting to modify it.
- **Frontend Inventory UI**:
  - Replaced the placeholder page with a fully functional data table displaying Item, SKU, Category, Location, Batch, Physical, Reserved, and dynamically calculated Available quantities.
  - Implemented loading indicators, empty states, and error handling.
  - Built a modal overlay for receiving new stock batches with dropdowns for Items and Locations.
  - Conditionally renders management buttons ("Receive Stock" and "Adjust") only for authorized roles (`ADMIN`, `OPERATIONS_USER`), matching the backend restrictions.

## Files Created / Modified
**Backend**:
- `backend/src/routes/inventory.routes.ts`: Fully implemented with DB transactions and validation.
- `backend/src/__tests__/inventory.test.ts`: Added comprehensive integration tests.
- `backend/src/__tests__/auth.test.ts`: Updated to hit `/api/work-orders` (stub) instead of `/api/inventory` for the 501 test.

**Frontend**:
- `frontend/src/pages/Inventory.tsx`: Fully implemented functional component.
- `frontend/src/index.css`: Added minimal `.modal-overlay` and `.modal-content` styles.

## Tests Run and Their Results
- **Test File**: `backend/src/__tests__/inventory.test.ts`
- **Scenarios Covered**:
  1. `GET` - Unauthenticated users receive 401.
  2. `GET` - `availableQty` correctly computed as `physicalQty - reservedQty`.
  3. `POST` - `SALES_USER` receives 403 Forbidden.
  4. `POST` - Duplicate `(itemId, locationId, batch)` receives 409 Conflict.
  5. `POST` - Negative `physicalQty` receives 400 Bad Request.
  6. `POST` - Valid creation returns 201 Created and adds an `InventoryTransaction`.
  7. `PUT` - Adjusting physical quantity below reserved quantity returns 400 Bad Request.
  8. `PUT` - Valid adjustment returns 200 OK and logs `InventoryTransaction`.
- **Test Results**: Ran `npm test`. All 20 tests (12 auth + 8 inventory) passed successfully.

## Build / Compile Results
- **Backend Build**: `npm run build` completed successfully with zero TypeScript errors after casting `req.params.id`.
- **Frontend Build**: `npm run build` completed successfully (Vite).

## Database & Migration Status
- Connected successfully to `fundsroom_operations_erp`.
- No new schema changes were required for Phase 2. `npx prisma migrate status` remains synced and up to date. The existing unique constraints and transaction models were perfectly sufficient.

## Security & Git Verification
- Confirmed `backend/.gitignore` and `frontend/.gitignore` are actively ignoring `.env` files.
- `git status` shows no exposed secrets.
- Pushed to `origin/main` without force-pushing or modifying past commit history.

## Known Limitations / Assumptions
- The physical quantity adjustment prompt currently uses a basic browser `prompt()` for simplicity and speed as per the instructions not to over-design the UI.
- `availableQty` is computed in memory before sending the JSON response. For massive datasets, this might require raw SQL queries if pagination/sorting on `availableQty` is needed in the future.
