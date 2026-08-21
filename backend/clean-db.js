const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const seedTxns = ['seed-init-1', 'seed-init-2', 'seed-init-3', 'seed-init-4', 'seed-init-5', 'seed-init-6'];
  const seedBatches = ['BATCH-2026-A', 'BATCH-2026-B', 'DEFAULT'];
  const seedSkus = ['WDG-A100', 'STL-ROD-6M', 'BOX-MED-001', 'CKT-PCB-V2'];
  const seedLocations = ['WH-MAIN', 'WH-BRANCH', 'LOC-SHOP'];
  const seedCustomers = ['seed-cust-1', 'seed-cust-2', 'seed-cust-3'];

  try {
    console.log('Starting DB Cleanup...');

    await prisma.$transaction([
      // 1. Delete bad Inventory Transactions
      prisma.inventoryTransaction.deleteMany({
        where: { OR: [ { referenceId: { notIn: seedTxns } }, { referenceId: null } ] }
      }),

      // 2. Delete bad Customer Orders (cascades to OrderItem)
      prisma.customerOrder.deleteMany({
        where: { orderNo: { not: 'ORD-2026-0001' } }
      }),

      // 3. Delete bad Internal Transfers (seed has none, so delete all)
      prisma.internalTransfer.deleteMany({}),

      // 4. Delete bad Work Orders
      prisma.workOrder.deleteMany({
        where: { workOrderNo: { not: 'WO-2026-0001' } }
      }),

      // 5. Delete bad Inventory
      prisma.inventory.deleteMany({
        where: { batch: { notIn: seedBatches } }
      }),

      // 6. Delete bad Items
      prisma.item.deleteMany({
        where: { sku: { notIn: seedSkus } }
      }),

      // 7. Delete bad Locations
      prisma.location.deleteMany({
        where: { code: { notIn: seedLocations } }
      }),

      // 8. Delete bad Customers
      prisma.customer.deleteMany({
        where: { id: { notIn: seedCustomers } }
      })
    ]);

    console.log('Cleanup completed successfully!');
  } catch (err) {
    console.error('Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

clean();
