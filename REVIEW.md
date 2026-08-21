 RBAC**: Implemented stateless JWT authentication and Role-Based Access Control (RBAC) supporting `ADMIN`, `OPERATIONS_USER`, and `SALES_USER` roles.
- **Backend API Foundation**: Created Express server with API routes for authentication and stubs for all future business modules.
- **Frontend App Shell**: Created a Vite + React application with Axios JWT interception, protected routes, a responsive sidebar layout, and placeholder pages for all required modules.
- **Testing Infrastructure**: Configured Vitest + Supertest for backend integration testing and wrote comprehensive auth tests.
- **Git Initialization**: Initialized a new git repository, committed the initial codebase securely (without exposing secrets), and pushed it to the `main` branch of the provided GitHub repository (`https://github.com/Sagarchhetri83/mini-operations-erp`).

## Files Created / Modified
**Backend (Created)**:
- `backend/package.json` & `backend/tsconfig.json`
- `backend/vitest.config.ts`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/prisma/schema.prisma` (New 11-model schema)
- `backend/prisma/seed.ts` (Comprehensive seed script)
- `backend/src/index.ts` (Express server entry)
- `backend/src/__tests__/setup.ts`
- `backend/src/__tests__/auth.test.ts`
- `backend/src/routes/inventory.routes.ts` (Stub)
- `backend/src/routes/work-orders.routes.ts` (Stub)
- `backend/src/routes/transfers.routes.ts` (Stub)
- `backend/src/routes/orders.routes.ts` (Stub)

**Frontend (Created)**:
- `frontend/package.json` & `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/vite-env.d.ts`
- `frontend/.env.example`
- `frontend/.gitignore`
- Placeholder pages: `Dashboard.tsx`, `Inventory.tsx`, `WorkOrders.tsx`, `Transfers.tsx`, `CustomerOrders.tsx`, `Unauthorized.tsx`

**Root**:
- `README.md`
- `REVIEW.md` (This file)

## Existing Files Reused/Adapted
The following patterns and files were carefully adapted from the READ-ONLY old project:
- **`backend/src/middleware/auth.ts`**: Reused JWT logic; adapted role validation for the 3 new roles and added an active/inactive status check.
- **`backend/src/routes/auth.routes.ts`**: Reused the bcrypt + JWT login pattern; adapted the returned user object shape.
- **`frontend/src/lib/api.ts`**: Reused Axios instance and JWT interceptor.
- **`frontend/src/context/AuthContext.tsx`**: Reused auth state management; changed user types to match new roles.
- **`frontend/src/components/ProtectedRoute.tsx`**: Reused role-gating wrapper logic.
- **`frontend/src/pages/Login.tsx`**: Adapted the UI structure, simplified routing to just `/dashboard`, and updated demo credentials.
- **`frontend/src/components/Layout.tsx`**: Adapted the sidebar, but simplified it significantly (removed extraneous navigation, restricted views based on new roles).
- **`frontend/src/App.tsx`**: Reused React Router, but replaced complex role-prefix routing (e.g. `/sales/`) with a cleaner single layout structure utilizing `ProtectedRoute`.
- **`frontend/src/index.css`**: Reused CSS variables and core structural classes, but stripped out non-relevant CRM components.

## Database Verification & Correction
- **Issue Discovered**: The project was initially connected to a database named `mini_operations_erp`. The requirement was to strictly use `fundsroom_operations_erp`.
- **Resolution**: Updated `backend/.env` to point `DATABASE_URL` to `fundsroom_operations_erp` on Port 5432 (without exposing credentials).
- **Exact Verification Steps Performed**:
  1. Updated `backend/.env` with the correct `DATABASE_URL` targeting `fundsroom_operations_erp`.
  2. Ran `npx prisma migrate dev --name init_fundsroom` to ensure the schema was applied to the correct database.
  3. Ran `npm run seed` to populate `fundsroom_operations_erp` with the 11 tables and demo data.
  4. Ran `npx prisma migrate status` which confirmed "Database schema is up to date!" on `fundsroom_operations_erp`.
  5. Ran `npm test` successfully, proving the backend can connect and query the database.
  6. Checked `git status` and `.gitignore` to ensure no `.env` files or credentials were exposed.
  7. Updated `README.md` to correctly reference `fundsroom_operations_erp` (and removed plaintext passwords from the document).

## Database / Schema Changes
A **completely new database** (`fundsroom_operations_erp`) is correctly configured and used. The old `mini_erp` and other databases were untouched. 
The new Prisma schema includes:
- **`User`**: Updated with new `Role` enum (`ADMIN`, `OPERATIONS_USER`, `SALES_USER`) and `UserStatus` enum.
- **`Category`, `Item`, `Location`**: New core master data tables.
- **`Inventory`**: New table tracking `physicalQty` and `reservedQty` per item/location/batch, with a composite unique constraint to prevent duplicate rows.
- **`InventoryTransaction`**: New immutable audit log for all stock movements.
- **`WorkOrder`**: New table for production runs, including a `shortageQty` field.
- **`InternalTransfer`**: New table representing dispatch/receipt workflows.
- **`Customer`, `CustomerOrder`, `OrderItem`**: Scaled-down CRM tables, focused heavily on the reservation aspect for the `CONFIRMED` status.

## APIs or Business Logic Changed
- Changed the authentication logic to enforce the 3 new specific roles (`ADMIN`, `OPERATIONS_USER`, `SALES_USER`).
- Created API stub definitions for all future business logic modules to solidify the `index.ts` routing layout.
- The business logic itself (e.g., transfers, order reservations) is strictly deferred to future phases; the stubs currently return HTTP `501 Not Implemented`.

## Tests Run and Their Results
- Configured **Vitest + Supertest** for backend integration tests.
- Created `src/__tests__/auth.test.ts`.
- **Test Results**: Ran `npm test` against `fundsroom_operations_erp`. All 12/12 tests passed (Duration ~1.18s).
  - Successfully verified login for all 3 roles.
  - Successfully verified incorrect password/email rejection.
  - Successfully verified JWT decoding via `GET /api/auth/me`.
  - Successfully verified 401 response for unauthenticated access.
  - Successfully verified RBAC middleware allows/denies appropriately based on roles.

## Build/Compile Results
- **Backend**: `npm run build` executed successfully (TypeScript compilation to `dist/`).
- **Frontend**: `npm run build` executed successfully (Vite production build to `dist/`, 1642 modules transformed, built in ~1.85s). *Note: The frontend build initially failed due to missing `ImportMeta` typings, which was permanently fixed by adding `src/vite-env.d.ts`.*

## Git & Security Verification
- **Git Hygiene**: Verified `backend/.gitignore` and `frontend/.gitignore` ignore `.env`, `node_modules`, `dist`, and log files.
- **Credential Check**: Verified that no `.env` files, passwords, or JWT secrets are tracked by Git. The `README.md` was also scrubbed of the local DB password.
- **Git Status**: Confirmed the working directory is clean (aside from these documentation updates) and branch `main` is up to date with `origin/main`.

## Assumptions or Decisions Made
1. **Frontend Routing Structure**: Assumed a single unified layout (`/dashboard`, `/inventory`, etc.) controlled by `<ProtectedRoute>` is superior to the old project's role-prefix routing (`/admin/dashboard`, `/sales/dashboard`), which causes unnecessary code duplication for a system of this size.
2. **Database Correction**: Carefully migrated to `fundsroom_operations_erp` without running `prisma migrate reset`, dropping databases, or deleting the old accidental `mini_operations_erp` database, adhering strictly to the safety constraints.
3. **Vitest over Jest**: Decided to use `vitest` for backend testing as it provides faster execution, native TypeScript support without `ts-jest`, and is the modern standard alongside the Vite frontend.
