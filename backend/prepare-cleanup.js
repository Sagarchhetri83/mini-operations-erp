const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function prepareCleanup() {
  try {
    const allUsers = await prisma.user.count();
    const seedEmails = ['admin@erp.com', 'ops@erp.com', 'sales@erp.com'];
    const badUsers = await prisma.user.count({ where: { email: { notIn: seedEmails } } });
    
    const allOrders = await prisma.customerOrder.count();
    const badOrders = await prisma.customerOrder.count({ where: { orderNo: { not: 'ORD-2026-0001' } } });
    
    const allWorkOrders = await prisma.workOrder.count();
    const badWorkOrders = await prisma.workOrder.count({ where: { workOrderNo: { not: 'WO-2026-0001' } } });
    
    const allTransfers = await prisma.internalTransfer.count();
    const badTransfers = allTransfers; // seed creates 0 transfers!
    
    const seedBatches = ['BATCH-2026-A', 'BATCH-2026-B', 'DEFAULT'];
    const allInventory = await prisma.inventory.count();
    const badInventory = await prisma.inventory.count({ where: { batch: { notIn: seedBatches } } });
    
    const seedSkus = ['WDG-A100', 'STL-ROD-6M', 'BOX-MED-001', 'CKT-PCB-V2'];
    const allItems = await prisma.item.count();
    const badItems = await prisma.item.count({ where: { sku: { notIn: seedSkus } } });
    
    const seedLocations = ['WH-MAIN', 'WH-BRANCH', 'LOC-SHOP'];
    const allLocations = await prisma.location.count();
    const badLocations = await prisma.location.count({ where: { code: { notIn: seedLocations } } });
    
    const seedCustomers = ['seed-cust-1', 'seed-cust-2', 'seed-cust-3'];
    const allCustomers = await prisma.customer.count();
    const badCustomers = await prisma.customer.count({ where: { id: { notIn: seedCustomers } } });
    
    // Transactions
    const seedTxns = ['seed-init-1', 'seed-init-2', 'seed-init-3', 'seed-init-4', 'seed-init-5', 'seed-init-6'];
    const allTxns = await prisma.inventoryTransaction.count();
    const badTxns = await prisma.inventoryTransaction.count({ where: { referenceId: { notIn: seedTxns } } });

    console.log("=== PROPOSED DELETION COUNTS ===");
    console.log(`Users: Delete ${badUsers} / ${allUsers} total`);
    console.log(`Customer Orders: Delete ${badOrders} / ${allOrders} total`);
    console.log(`Work Orders: Delete ${badWorkOrders} / ${allWorkOrders} total`);
    console.log(`Transfers: Delete ${badTransfers} / ${allTransfers} total`);
    console.log(`Inventory: Delete ${badInventory} / ${allInventory} total`);
    console.log(`Items: Delete ${badItems} / ${allItems} total`);
    console.log(`Locations: Delete ${badLocations} / ${allLocations} total`);
    console.log(`Customers: Delete ${badCustomers} / ${allCustomers} total`);
    console.log(`Transactions: Delete ${badTxns} / ${allTxns} total`);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

prepareCleanup();
