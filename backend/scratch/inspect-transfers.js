const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTransfers() {
  try {
    const transfers = await prisma.internalTransfer.findMany({
      where: { transferNo: { in: ['TRF-2026-0001', 'TRF-2026-0002'] } },
      include: {
        item: true,
        sourceLocation: true,
        destLocation: true
      }
    });
    
    console.log("Transfers:", JSON.stringify(transfers, null, 2));

    const transferIds = transfers.map(t => t.id);
    const txns = await prisma.inventoryTransaction.findMany({
      where: { referenceId: { in: transferIds } }
    });
    console.log("Transactions:", JSON.stringify(txns, null, 2));

    const itemSteel = await prisma.item.findUnique({ where: { sku: 'STL-ROD-6M' }});
    const mainWh = await prisma.location.findUnique({ where: { code: 'WH-MAIN' }});
    const branchWh = await prisma.location.findUnique({ where: { code: 'WH-BRANCH' }});

    if (itemSteel && mainWh && branchWh) {
      const invMain = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: itemSteel.id, locationId: mainWh.id, batch: 'DEFAULT' } }
      });
      const invBranch = await prisma.inventory.findUnique({
        where: { itemId_locationId_batch: { itemId: itemSteel.id, locationId: branchWh.id, batch: 'DEFAULT' } }
      });
      console.log("Main WH Steel:", invMain);
      console.log("Branch WH Steel:", invBranch);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTransfers();
