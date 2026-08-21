# Mini Operations ERP Demo Flow

This document outlines a standard end-to-end demonstration flow for the Fundsroom Mini Operations ERP application, proving out the full lifecycle from identifying a stock shortage to fulfilling a customer order.

## Prerequisites
Ensure the application is running:
- Backend: `npm run dev` in `backend/`
- Frontend: `npm run dev` in `frontend/`
- Database seeded with `npm run seed`

## Step 1: Login
1. Navigate to `http://localhost:5173/login`.
2. Observe the different roles available.
3. Log in as **Admin** (`admin@erp.com` / `Password123`).
4. You will be redirected to the Dashboard, which verifies the JWT token and RBAC capabilities.

## Step 2: Inventory Overview
1. Click on **Inventory** in the sidebar.
2. Note the stock levels for `Steel Rod 6m` at the **Main Warehouse**. The physical quantity is 35, and the reserved quantity is 0 (Available: 35).
3. Note the stock levels for `PCB Circuit Board V2` — currently sitting at 10.

## Step 3: Work Order (Shortage Detection)
1. Click on **Work Orders** in the sidebar.
2. Click **+ Create Work Order**.
3. Create a work order for **Main Warehouse**, requiring **50** units of `Steel Rod 6m`. Assign it to Operations User 1.
4. After creation, observe the Work Order list. The system has automatically calculated a **Shortage of 15** because only 35 units were available.
5. (Optional) Try progressing the Work Order to `IN_PROGRESS` to demonstrate status tracking.

## Step 4: Internal Transfer (Resolving a Shortage)
*(Assume we need to move PCB Circuit Boards from Branch to Main, or we just want to demonstrate a transfer).*
1. Click on **Transfers** in the sidebar.
2. Click **+ Request Transfer**.
3. Select **Branch Warehouse** as Source, **Main Warehouse** as Destination.
4. Select `Widget A100` and request a quantity of **10**.
5. The transfer appears as `REQUESTED`.
6. Click **Dispatch**. The source physical quantity drops immediately.
7. Click **Receive**. The destination physical quantity increases.
8. Go back to **Inventory** to verify the stock physically moved.

## Step 5: Customer Order (Creation)
1. Log out (via sidebar profile menu) and log back in as **Sales User** (`sales1@erp.com` / `Password123`).
2. Click on **Customer Orders**.
3. Click **+ Create Order**.
4. Select a customer and add `Widget A100` from the Main Warehouse. Request **20** units.
5. Click Create. The order appears as `DRAFT`.
6. Go to **Inventory**. Notice the physical and reserved quantities have *not* changed yet (Draft orders do not lock stock).

## Step 6: Stock Reservation
1. As the **Sales User**, click **Confirm** on the Draft order you just created.
2. The order status securely changes to `CONFIRMED`.
3. Navigate to **Inventory** (or observe the Customer Orders list output).
4. You will see the **Reserved Quantity** for that batch has increased by 20, and the **Available Quantity** has decreased by 20.
5. The transaction was fully atomic and safely protected against concurrent requests!
