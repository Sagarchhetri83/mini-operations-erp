const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const o = await prisma.customerOrder.findMany({ select: { orderNo: true } });
    console.log('Orders:', o.map(x => x.orderNo).join(', '));
    
    const w = await prisma.workOrder.findMany({ select: { workOrderNo: true } });
    console.log('WorkOrders:', w.map(x => x.workOrderNo).join(', '));

    const t = await prisma.internalTransfer.findMany({ select: { transferNo: true } });
    console.log('Transfers:', t.map(x => x.transferNo).join(', '));
  } finally {
    await prisma.$disconnect();
  }
}
check();
