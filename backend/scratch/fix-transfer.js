const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTransfers() {
  try {
    const trf2 = await prisma.internalTransfer.findUnique({
      where: { transferNo: 'TRF-2026-0002' }
    });

    if (!trf2) {
      console.log('TRF-2026-0002 not found, maybe already deleted.');
      return;
    }

    const itemSteel = await prisma.item.findUnique({ where: { sku: 'STL-ROD-6M' }});
    const mainWh = await prisma.location.findUnique({ where: { code: 'WH-MAIN' }});
    const branchWh = await prisma.location.findUnique({ where: { code: 'WH-BRANCH' }});

    if (!itemSteel || !mainWh || !branchWh) {
      throw new Error('Required reference data not found');
    }

    const invMain = await prisma.inventory.findUnique({
      where: { itemId_locationId_batch: { itemId: itemSteel.id, locationId: mainWh.id, batch: 'DEFAULT' } }
    });
    
    const invBranch = await prisma.inventory.findUnique({
      where: { itemId_locationId_batch: { itemId: itemSteel.id, locationId: branchWh.id, batch: 'DEFAULT' } }
    });

    console.log('--- BEFORE TRANSACTION ---');
    console.log(`Main WH Steel: ${invMain.physicalQty}`);
    console.log(`Branch WH Steel: ${invBranch.physicalQty}`);

    await prisma.$transaction([
      // 1. Delete transactions
      prisma.inventoryTransaction.deleteMany({
        where: { referenceId: trf2.id }
      }),
      // 2. Delete transfer
      prisma.internalTransfer.delete({
        where: { id: trf2.id }
      }),
      // 3. Restore Main WH
      prisma.inventory.update({
        where: { id: invMain.id },
        data: { physicalQty: 25 } // Restore to 25
      }),
      // 4. Restore Branch WH
      prisma.inventory.update({
        where: { id: invBranch.id },
        data: { physicalQty: 10 } // Restore to 10
      })
    ]);

    const postInvMain = await prisma.inventory.findUnique({ where: { id: invMain.id } });
    const postInvBranch = await prisma.inventory.findUnique({ where: { id: invBranch.id } });
    const postTrf1 = await prisma.internalTransfer.findUnique({ where: { transferNo: 'TRF-2026-0001' } });
    
    console.log('--- AFTER TRANSACTION ---');
    console.log(`Main WH Steel: ${postInvMain.physicalQty} | Reserved: ${postInvMain.reservedQty}`);
    console.log(`Branch WH Steel: ${postInvBranch.physicalQty} | Reserved: ${postInvBranch.reservedQty}`);
    console.log(`TRF-2026-0001 status: ${postTrf1.status}`);

  } catch (err) {
    console.error('Failed to fix transfers:', err);
  } finally {
    await prisma.$disconnect();
  }
}

fixTransfers();
