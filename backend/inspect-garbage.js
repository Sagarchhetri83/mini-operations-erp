const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    const u = await prisma.user.count();
    
    const orders = await prisma.customerOrder.findMany({ select: { orderNo: true } });
    const badO = orders.filter(x => x.orderNo.includes('178') || x.orderNo.startsWith('NEW-'));
    
    const wos = await prisma.workOrder.findMany({ select: { workOrderNo: true } });
    const badW = wos.filter(x => x.workOrderNo.includes('178') || x.workOrderNo.startsWith('TEST-'));
    
    const t = await prisma.internalTransfer.findMany({ select: { transferNo: true } });
    const badT = t.filter(x => x.transferNo.includes('178') || x.transferNo.startsWith('TEST-'));
    
    const inv = await prisma.inventory.findMany({ select: { batch: true } });
    const badInv = inv.filter(x => x.batch.includes('178') || x.batch === 'CONC_BATCH' || x.batch === 'ATOM_FAIL' || x.batch.startsWith('ORDER_BATCH'));
    
    console.log(`Users: ${u}`);
    console.log(`Orders: ${orders.length} | Bad: ${badO.length}`);
    console.log(`WorkOrders: ${wos.length} | Bad: ${badW.length}`);
    console.log(`Transfers: ${t.length} | Bad: ${badT.length}`);
    console.log(`Inventory: ${inv.length} | Bad: ${badInv.length}`);
    
    if (badO.length > 0) console.log('Sample bad orders:', badO.slice(0,3).map(o=>o.orderNo));
    if (badW.length > 0) console.log('Sample bad wos:', badW.slice(0,3).map(w=>w.workOrderNo));
    if (badInv.length > 0) console.log('Sample bad inv:', badInv.slice(0,3).map(i=>i.batch));

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
