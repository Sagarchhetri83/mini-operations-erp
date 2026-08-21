/**
 * Seed data for Fundsroom Mini Operations ERP
 *
 * Creates demo data to exercise ALL key business scenarios:
 *   - Sufficient stock (normal transfers, reservations)
 *   - Insufficient stock (shortage detection, reservation rejection)
 *   - Multi-location inventory (transfers between warehouses)
 *   - Multiple batches (batch-level tracking)
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Fundsroom Mini Operations ERP database...\n');

  // ─── 1. USERS ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { password: passwordHash },
    create: {
      name: 'Admin User',
      email: 'admin@erp.com',
      password: passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const opsUser1 = await prisma.user.upsert({
    where: { email: 'ops@erp.com' },
    update: { password: passwordHash },
    create: {
      name: 'Operations User',
      email: 'ops@erp.com',
      password: passwordHash,
      role: Role.OPERATIONS_USER,
      status: UserStatus.ACTIVE,
    },
  });

  const salesUser1 = await prisma.user.upsert({
    where: { email: 'sales@erp.com' },
    update: { password: passwordHash },
    create: {
      name: 'Sales User',
      email: 'sales@erp.com',
      password: passwordHash,
      role: Role.SALES_USER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('  ✅ Users created:');
  console.log('     admin@erp.com       → ADMIN');
  console.log('     ops@erp.com         → OPERATIONS_USER');
  console.log('     sales@erp.com       → SALES_USER');
  console.log('     Password for all:   Password123\n');

  // ─── 2. CATEGORIES ────────────────────────────────────────────────────────
  const catElectronics = await prisma.category.upsert({
    where: { name: 'Electronics' },
    update: {},
    create: { name: 'Electronics', description: 'Electronic components and devices' },
  });

  const catRawMaterials = await prisma.category.upsert({
    where: { name: 'Raw Materials' },
    update: {},
    create: { name: 'Raw Materials', description: 'Manufacturing raw materials' },
  });

  const catPackaging = await prisma.category.upsert({
    where: { name: 'Packaging' },
    update: {},
    create: { name: 'Packaging', description: 'Packaging and shipping supplies' },
  });

  console.log('  ✅ Categories: Electronics, Raw Materials, Packaging\n');

  // ─── 3. LOCATIONS ─────────────────────────────────────────────────────────
  const mainWarehouse = await prisma.location.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: 'Plot 12, Industrial Area, Sector 5',
    },
  });

  const branchWarehouse = await prisma.location.upsert({
    where: { code: 'WH-BRANCH' },
    update: {},
    create: {
      name: 'Branch Warehouse',
      code: 'WH-BRANCH',
      address: 'Unit 7, East Storage Facility',
    },
  });

  const shopFloor = await prisma.location.upsert({
    where: { code: 'LOC-SHOP' },
    update: {},
    create: {
      name: 'Shop Floor',
      code: 'LOC-SHOP',
      address: 'Building A, Production Floor',
    },
  });

  console.log('  ✅ Locations: Main Warehouse, Branch Warehouse, Shop Floor\n');

  // ─── 4. ITEMS ─────────────────────────────────────────────────────────────
  const itemWidget = await prisma.item.upsert({
    where: { sku: 'WDG-A100' },
    update: {},
    create: {
      name: 'Widget A100',
      sku: 'WDG-A100',
      categoryId: catElectronics.id,
      unit: 'PCS',
      description: 'Standard electronic widget, 100mm form factor',
    },
  });

  const itemSteel = await prisma.item.upsert({
    where: { sku: 'STL-ROD-6M' },
    update: {},
    create: {
      name: 'Steel Rod 6m',
      sku: 'STL-ROD-6M',
      categoryId: catRawMaterials.id,
      unit: 'PCS',
      description: '6-meter mild steel rod, 12mm diameter',
    },
  });

  const itemBox = await prisma.item.upsert({
    where: { sku: 'BOX-MED-001' },
    update: {},
    create: {
      name: 'Medium Shipping Box',
      sku: 'BOX-MED-001',
      categoryId: catPackaging.id,
      unit: 'PCS',
      description: 'Medium cardboard shipping box, 30x20x15cm',
    },
  });

  const itemCircuit = await prisma.item.upsert({
    where: { sku: 'CKT-PCB-V2' },
    update: {},
    create: {
      name: 'PCB Circuit Board V2',
      sku: 'CKT-PCB-V2',
      categoryId: catElectronics.id,
      unit: 'PCS',
      description: 'Printed circuit board, version 2 revision',
    },
  });

  console.log('  ✅ Items: Widget A100, Steel Rod 6m, Medium Shipping Box, PCB Circuit Board V2\n');

  // ─── 5. INVENTORY ─────────────────────────────────────────────────────────
  // Strategy:
  //   - Widget A100: plenty of stock at Main Warehouse (good for transfers, reservations)
  //   - Widget A100: some stock at Branch Warehouse
  //   - Steel Rod: stock only at Main Warehouse (for shortage scenarios)
  //   - Box: lots at both warehouses
  //   - PCB: low stock at Main, NONE at Branch (tests transfer need)
  //   - Multiple batches for Widget to test batch-level tracking

  const invWidgetMainA = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemWidget.id, locationId: mainWarehouse.id, batch: 'BATCH-2026-A' } },
    update: {},
    create: {
      itemId: itemWidget.id,
      locationId: mainWarehouse.id,
      batch: 'BATCH-2026-A',
      physicalQty: 200,
      reservedQty: 0,
    },
  });

  const invWidgetMainB = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemWidget.id, locationId: mainWarehouse.id, batch: 'BATCH-2026-B' } },
    update: {},
    create: {
      itemId: itemWidget.id,
      locationId: mainWarehouse.id,
      batch: 'BATCH-2026-B',
      physicalQty: 150,
      reservedQty: 30,  // 30 already reserved — tests that only 120 available
    },
  });

  const invWidgetBranch = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemWidget.id, locationId: branchWarehouse.id, batch: 'BATCH-2026-A' } },
    update: {},
    create: {
      itemId: itemWidget.id,
      locationId: branchWarehouse.id,
      batch: 'BATCH-2026-A',
      physicalQty: 50,
      reservedQty: 0,
    },
  });

  const invSteelMain = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemSteel.id, locationId: mainWarehouse.id, batch: 'DEFAULT' } },
    update: {},
    create: {
      itemId: itemSteel.id,
      locationId: mainWarehouse.id,
      batch: 'DEFAULT',
      physicalQty: 35,   // Only 35 available — useful for work order showing shortage of 15 when 50 required
      reservedQty: 0,
    },
  });

  // No steel at branch — for testing shortage / transfer workflow

  const invBoxMain = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemBox.id, locationId: mainWarehouse.id, batch: 'DEFAULT' } },
    update: {},
    create: {
      itemId: itemBox.id,
      locationId: mainWarehouse.id,
      batch: 'DEFAULT',
      physicalQty: 500,
      reservedQty: 0,
    },
  });

  await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemBox.id, locationId: branchWarehouse.id, batch: 'DEFAULT' } },
    update: {},
    create: {
      itemId: itemBox.id,
      locationId: branchWarehouse.id,
      batch: 'DEFAULT',
      physicalQty: 250,
      reservedQty: 0,
    },
  });

  // PCB: critically low stock — demonstrates shortage workflow
  const invPcbMain = await prisma.inventory.upsert({
    where: { itemId_locationId_batch: { itemId: itemCircuit.id, locationId: mainWarehouse.id, batch: 'DEFAULT' } },
    update: {},
    create: {
      itemId: itemCircuit.id,
      locationId: mainWarehouse.id,
      batch: 'DEFAULT',
      physicalQty: 10,
      reservedQty: 0,
    },
  });

  console.log('  ✅ Inventory created:');
  console.log('     Widget A100 @ Main Warehouse (BATCH-2026-A): physical=200, reserved=0,  available=200');
  console.log('     Widget A100 @ Main Warehouse (BATCH-2026-B): physical=150, reserved=30, available=120');
  console.log('     Widget A100 @ Branch Warehouse (BATCH-2026-A): physical=50, reserved=0, available=50');
  console.log('     Steel Rod   @ Main Warehouse (DEFAULT):        physical=35, reserved=0,  available=35');
  console.log('     Med Box     @ Main Warehouse (DEFAULT):        physical=500, reserved=0, available=500');
  console.log('     Med Box     @ Branch Warehouse (DEFAULT):      physical=250, reserved=0, available=250');
  console.log('     PCB V2      @ Main Warehouse (DEFAULT):        physical=10, reserved=0,  available=10\n');

  // ─── 6. CUSTOMERS ─────────────────────────────────────────────────────────
  await prisma.customer.upsert({
    where: { id: 'seed-cust-1' },
    update: {},
    create: {
      id: 'seed-cust-1',
      name: 'Acme Corporation',
      email: 'orders@acme.com',
      phone: '9876543210',
    },
  });

  await prisma.customer.upsert({
    where: { id: 'seed-cust-2' },
    update: {},
    create: {
      id: 'seed-cust-2',
      name: 'BuildRight Ltd',
      email: 'procurement@buildright.com',
      phone: '9876543211',
    },
  });

  await prisma.customer.upsert({
    where: { id: 'seed-cust-3' },
    update: {},
    create: {
      id: 'seed-cust-3',
      name: 'TechParts Inc',
      email: 'supply@techparts.com',
      phone: '9876543212',
    },
  });

  console.log('  ✅ Customers: Acme Corporation, BuildRight Ltd, TechParts Inc\n');

  // ─── 7. SAMPLE WORK ORDER ─────────────────────────────────────────────────
  // One existing work order to demonstrate the shortage scenario:
  // Required 50 Steel Rods but only 35 available → shortage = 15
  await prisma.workOrder.upsert({
    where: { workOrderNo: 'WO-2026-0001' },
    update: {},
    create: {
      workOrderNo: 'WO-2026-0001',
      locationId: mainWarehouse.id,
      itemId: itemSteel.id,
      requiredQty: 50,
      shortageQty: 15,   // 50 required - 35 available = 15 shortage
      status: 'ASSIGNED',
      assignedUserId: opsUser1.id,
      createdById: adminUser.id,
      notes: 'Urgent production run — needs steel rods',
    },
  });

  console.log('  ✅ Sample Work Order WO-2026-0001 (Steel Rod, required=50, available=35, shortage=15)\n');

  // ─── 8. SAMPLE CUSTOMER ORDER (CONFIRMED with reservation) ────────────────
  // Demonstrates how reservedQty works: 30 Widgets reserved in BATCH-2026-B
  const existingOrder = await prisma.customerOrder.findUnique({
    where: { orderNo: 'ORD-2026-0001' },
  });

  if (!existingOrder) {
    await prisma.customerOrder.create({
      data: {
        orderNo: 'ORD-2026-0001',
        customerId: 'seed-cust-1',
        status: 'CONFIRMED',
        createdById: salesUser1.id,
        notes: 'Existing confirmed order — demonstrates reserved stock',
        items: {
          create: [
            {
              inventoryId: invWidgetMainB.id,
              itemId: itemWidget.id,
              quantity: 30,
              itemName: 'Widget A100',
            },
          ],
        },
      },
    });
  }

  console.log('  ✅ Sample Customer Order ORD-2026-0001 (30x Widget A100 from BATCH-2026-B, CONFIRMED)\n');

  // ─── 9. SAMPLE INVENTORY TRANSACTIONS (audit log) ─────────────────────────
  // Log the initial stock receipts
  const txns = [
    { inventoryId: invWidgetMainA.id, type: 'STOCK_IN' as const, quantity: 200, note: 'Initial stock receipt — Widget A100 BATCH-2026-A' },
    { inventoryId: invWidgetMainB.id, type: 'STOCK_IN' as const, quantity: 150, note: 'Initial stock receipt — Widget A100 BATCH-2026-B' },
    { inventoryId: invWidgetBranch.id, type: 'STOCK_IN' as const, quantity: 50, note: 'Initial stock receipt — Widget A100 @ Branch' },
    { inventoryId: invSteelMain.id,   type: 'STOCK_IN' as const, quantity: 35,  note: 'Initial stock receipt — Steel Rod 6m' },
    { inventoryId: invBoxMain.id,     type: 'STOCK_IN' as const, quantity: 500, note: 'Initial stock receipt — Medium Shipping Box' },
    { inventoryId: invPcbMain.id,     type: 'STOCK_IN' as const, quantity: 10,  note: 'Initial stock receipt — PCB Circuit Board V2' },
  ];

  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];
    await prisma.inventoryTransaction.upsert({
      where: {
        referenceId_type: {
          referenceId: `seed-init-${i + 1}`,
          type: t.type,
        },
      },
      update: {},
      create: {
        inventoryId: t.inventoryId,
        type: t.type,
        quantity: t.quantity,
        referenceId: `seed-init-${i + 1}`,
        note: t.note,
        createdById: adminUser.id,
      },
    });
  }

  console.log('  ✅ Inventory transactions (audit log) created\n');

  console.log('🎉 Seed complete!');
  console.log('');
  console.log('📋 Login credentials:');
  console.log('   admin@erp.com   / Password123  (ADMIN)');
  console.log('   ops@erp.com     / Password123  (OPERATIONS_USER)');
  console.log('   sales@erp.com   / Password123  (SALES_USER)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
