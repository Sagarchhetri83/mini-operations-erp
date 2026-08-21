import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { PrismaClient, WorkOrderStatus } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Helper function to calculate current available quantity and shortage for a work order
async function calculateWorkOrderShortage(workOrder: any) {
  const inventoryRecords = await prisma.inventory.findMany({
    where: {
      itemId: workOrder.itemId,
      locationId: workOrder.locationId
    }
  });

  let totalAvailableQty = 0;
  for (const inv of inventoryRecords) {
    totalAvailableQty += (inv.physicalQty - inv.reservedQty);
  }

  // availableQty must never be negative in our logic, but to be safe:
  totalAvailableQty = Math.max(0, totalAvailableQty);

  const calculatedShortage = Math.max(0, workOrder.requiredQty - totalAvailableQty);

  return {
    ...workOrder,
    availableQty: totalAvailableQty,
    calculatedShortage
  };
}

// GET /api/work-orders - List all work orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        item: { include: { category: true } },
        location: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedWorkOrders = await Promise.all(workOrders.map(calculateWorkOrderShortage));

    res.json(enrichedWorkOrders);
  } catch (err) {
    console.error('Failed to fetch work orders:', err);
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/:id - Get a single work order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id as string },
      include: {
        item: { include: { category: true } },
        location: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!workOrder) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    const enrichedWorkOrder = await calculateWorkOrderShortage(workOrder);
    res.json(enrichedWorkOrder);
  } catch (err) {
    console.error('Failed to fetch work order:', err);
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// POST /api/work-orders - Create a new work order
router.post('/', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const { itemId, locationId, assignedUserId, requiredQty } = req.body;

    if (!itemId || !locationId || !assignedUserId) {
      res.status(400).json({ error: 'itemId, locationId, and assignedUserId are required' });
      return;
    }

    if (requiredQty === undefined || typeof requiredQty !== 'number' || requiredQty <= 0) {
      res.status(400).json({ error: 'requiredQty must be a positive number' });
      return;
    }

    // Generate unique work order number (simplified generator)
    const count = await prisma.workOrder.count();
    const workOrderNo = `WO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNo,
        itemId,
        locationId,
        assignedUserId,
        requiredQty,
        status: WorkOrderStatus.ASSIGNED,
        createdById: req.user!.id
      },
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    const enrichedWorkOrder = await calculateWorkOrderShortage(workOrder);

    // Update the snapshot shortageQty in DB
    await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: { shortageQty: enrichedWorkOrder.calculatedShortage }
    });

    res.status(201).json(enrichedWorkOrder);
  } catch (err: any) {
    console.error('Failed to create work order:', err);
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PUT /api/work-orders/:id - Update work order status or details
router.put('/:id', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const { status, requiredQty, assignedUserId } = req.body;

    const existing = await prisma.workOrder.findUnique({
      where: { id: req.params.id as string }
    });

    if (!existing) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    // Validate status transitions
    if (status && status !== existing.status) {
      if (existing.status === WorkOrderStatus.ASSIGNED && status !== WorkOrderStatus.IN_PROGRESS) {
        res.status(400).json({ error: 'Status can only transition from ASSIGNED to IN_PROGRESS' });
        return;
      }
      if (existing.status === WorkOrderStatus.IN_PROGRESS && status !== WorkOrderStatus.COMPLETED) {
        res.status(400).json({ error: 'Status can only transition from IN_PROGRESS to COMPLETED' });
        return;
      }
      if (existing.status === WorkOrderStatus.COMPLETED) {
        res.status(400).json({ error: 'Cannot transition status of a COMPLETED work order' });
        return;
      }
    }

    if (requiredQty !== undefined && (typeof requiredQty !== 'number' || requiredQty <= 0)) {
      res.status(400).json({ error: 'requiredQty must be a positive number' });
      return;
    }

    const updated = await prisma.workOrder.update({
      where: { id: existing.id },
      data: {
        status: status || existing.status,
        requiredQty: requiredQty || existing.requiredQty,
        assignedUserId: assignedUserId || existing.assignedUserId
      },
      include: {
        item: true,
        location: true,
        assignedUser: { select: { id: true, name: true, email: true } }
      }
    });

    const enrichedWorkOrder = await calculateWorkOrderShortage(updated);

    // Update snapshot shortageQty in DB
    await prisma.workOrder.update({
      where: { id: updated.id },
      data: { shortageQty: enrichedWorkOrder.calculatedShortage }
    });

    res.json(enrichedWorkOrder);
  } catch (err: any) {
    console.error('Failed to update work order:', err);
    res.status(500).json({ error: 'Failed to update work order' });
  }
});

export default router;
