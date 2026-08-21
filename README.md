# Fundsroom Mini Operations ERP

## Purpose
A full-stack case study project designed for managing internal warehouse operations including Inventory, Work Orders, Internal Transfers, and Customer Orders with concurrency-safe stock reservation.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, React Router, Axios
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** JWT & bcrypt
- **Testing:** Vitest & Supertest

## Current Setup (Phase 1 Complete)
- Project scaffolding and directory structure created (`frontend/`, `backend/`).
- Custom `Prisma` schema defined for the exact case study requirements.
- PostgreSQL database (`mini_operations_erp`) migrated.
- Seed data generated for users, locations, inventory batches, and customers.
- JWT and Role-Based Access Control (RBAC) implemented.
- `Vitest` testing infrastructure created.
- Simple React single-page application router and layouts prepared.

## Environment Variables
The backend requires a `.env` file (copied from `.env.example`):
```env
DATABASE_URL="postgresql://postgres:S@gar8347@localhost:5432/mini_operations_erp?schema=public"
JWT_SECRET="fundsroom-erp-jwt-secret-change-in-production-2026"
PORT=5001
FRONTEND_URL=http://localhost:5173
```
The frontend uses:
```env
VITE_API_URL=http://localhost:5001
```

## Local Setup
1. **Database:** Ensure PostgreSQL is running and you have created a database named `mini_operations_erp`.
2. **Backend:**
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   ```
3. **Frontend:**
   ```bash
   cd frontend
   npm install
   ```

## Development Commands
- **Backend:**
  - `npm run dev` (starts development server on port 5001)
  - `npm test` (runs integration tests)
- **Frontend:**
  - `npm run dev` (starts Vite on port 5173)

## Demo Credentials
- Admin: `admin@erp.com`
- Operations: `ops1@erp.com`
- Sales: `sales1@erp.com`
- Password: `Password123`
