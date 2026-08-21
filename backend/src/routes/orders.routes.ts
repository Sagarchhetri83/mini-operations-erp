import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { PrismaClient, OrderStatus, TransactionType } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/orders - List all orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.customerOrder.findMany({
      include: {
        customer: true,
        items: {
          include: {
            item: true,
            inventory: {
              include: { location: true }
            }
          }
        },
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - Get a single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.customerOrder.findUnique({
      where: { id: req.params.id as string },
      include: {
        customer: true,
        items: {
          include: {
            item: true,
            inventory: {
              include: { location: true }
            }
          }
        },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (err) {
    console.error('Failed to fetch order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create an order (DRAFT)
// Accessible by ADMIN, OPERATIONS_USER, and SALES_USER
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, items, notes } = req.body;

    if (!customerId) {
      res.status(400).json({ error: 'customerId is required' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items array is required and must not be empty' });
      return;
    }

    for (const orderItem of items) {
      if (!orderItem.inventoryId || !orderItem.itemId || typeof orderItem.quantity !== 'number' || orderItem.quantity <= 0) {
        res.status(400).json({ error: 'Each item must have inventoryId, itemId, and a positive quantity' });
        return;
      }
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // Verify all items exist
    for (const orderItem of items) {
      const dbItem = await prisma.item.findUnique({ where: { id: orderItem.itemId } });
      if (!dbItem) {
        res.status(400).json({ error: `Item ${orderItem.itemId} not found` });
        return;
      }
      orderItem.itemName = dbItem.name; // Snapshot
    }

    const count = await prisma.customerOrder.count();
    const orderNo = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const order = await prisma.customerOrder.create({
      data: {
        orderNo,
        customerId,
        notes,
        status: OrderStatus.DRAFT,
        createdById: req.user!.id,
        items: {
          create: items.map(item => ({
            inventoryId: item.inventoryId,
            itemId: item.itemId,
            quantity: item.quantity,
            itemName: item.itemName
          }))
        }
      },
      include: {
        customer: true,
        items: true
      }
    });

    res.status(201).json(order);
  } catch (err: any) {
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/confirm - Confirm order and reserve stock
// Accessible only by ADMIN, OPERATIONS_USER
router.put('/:id/confirm', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id as string;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== OrderStatus.DRAFT) {
        throw new Error(`Cannot confirm order with status ${order.status}`);
      }

      for (const item of order.items) {
        // Atomically increment reservedQty
        const updatedInventory = await tx.inventory.update({
          where: { id: item.inventoryId },
          data: { reservedQty: { increment: item.quantity } }
        });

        // Concurrency check: fail if reservedQty > physicalQty
        if (updatedInventory.reservedQty > updatedInventory.physicalQty) {
          throw new Error(`Insufficient stock for item ${item.itemName} (Requested: ${item.quantity})`);
        }

        // Audit Trail
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: item.inventoryId,
            type: TransactionType.RESERVATION,
            quantity: item.quantity,
            referenceId: `${order.id}-${item.id}`,
            note: `Stock reserved for order ${order.orderNo}`,
            createdById: req.user!.id
          }
        });
      }

      // Update status
      const confirmedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
        include: {
          customer: true,
          items: {
            include: {
              item: true,
              inventory: { include: { location: true } }
            }
          }
        }
      });

      return confirmedOrder;
    });

    res.json(updatedOrder);
  } catch (err: any) {
    if (err.message === 'Order not found') return res.status(404).json({ error: err.message });
    if (err.message.startsWith('Cannot confirm') || err.message.startsWith('Insufficient stock')) {
      return res.status(400).json({ error: err.message });
    }
    
    // Check for unique constraint failure on audit (prevent duplicate reservation)
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Order reservation has already been processed' });
    }

    console.error('Order confirmation failed:', err);
    res.status(500).json({ error: 'Failed to confirm order' });
  }
});

export default router;
