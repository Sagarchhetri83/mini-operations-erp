import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { PrismaClient, TransferStatus, TransactionType } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// Helper to get available qty
async function getAvailableQty(inventory: any) {
  return Math.max(0, inventory.physicalQty - inventory.reservedQty);
}

// GET /api/transfers - List all transfers
router.get('/', async (req: Request, res: Response) => {
  try {
    const transfers = await prisma.internalTransfer.findMany({
      include: {
        item: { include: { category: true } },
        sourceLocation: true,
        destLocation: true,
        createdBy: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transfers);
  } catch (err) {
    console.error('Failed to fetch transfers:', err);
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// GET /api/transfers/:id - Get a single transfer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transfer = await prisma.internalTransfer.findUnique({
      where: { id: req.params.id as string },
      include: {
        item: { include: { category: true } },
        sourceLocation: true,
        destLocation: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!transfer) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    res.json(transfer);
  } catch (err) {
    console.error('Failed to fetch transfer:', err);
    res.status(500).json({ error: 'Failed to fetch transfer' });
  }
});

// POST /api/transfers - Create transfer request
router.post('/', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const { sourceLocationId, destLocationId, itemId, batch = 'DEFAULT', quantity, notes } = req.body;

    if (!sourceLocationId || !destLocationId || !itemId) {
      res.status(400).json({ error: 'sourceLocationId, destLocationId, and itemId are required' });
      return;
    }

    if (sourceLocationId === destLocationId) {
      res.status(400).json({ error: 'Source and destination locations must be different' });
      return;
    }

    if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
      res.status(400).json({ error: 'quantity must be a positive number' });
      return;
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const sourceInventory = await prisma.inventory.findUnique({
      where: {
        itemId_locationId_batch: {
          itemId,
          locationId: sourceLocationId,
          batch
        }
      }
    });

    if (!sourceInventory) {
      res.status(400).json({ error: 'Source inventory does not exist' });
      return;
    }

    const availableQty = await getAvailableQty(sourceInventory);
    if (quantity > availableQty) {
      res.status(400).json({ error: `Cannot transfer more than available quantity (${availableQty})` });
      return;
    }

    const count = await prisma.internalTransfer.count();
    const transferNo = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const transfer = await prisma.internalTransfer.create({
      data: {
        transferNo,
        sourceLocationId,
        destLocationId,
        itemId,
        batch,
        quantity,
        notes,
        status: TransferStatus.REQUESTED,
        createdById: req.user!.id
      },
      include: {
        item: true,
        sourceLocation: true,
        destLocation: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    res.status(201).json(transfer);
  } catch (err: any) {
    console.error('Failed to create transfer:', err);
    res.status(500).json({ error: 'Failed to create transfer' });
  }
});

// POST /api/transfers/:id/dispatch - Dispatch transfer
router.post('/:id/dispatch', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const transferId = req.params.id as string;

    // Run in transaction to guarantee concurrency safety
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // 1. Fetch current transfer
      const transfer = await tx.internalTransfer.findUnique({
        where: { id: transferId }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.REQUESTED) {
        throw new Error(`Cannot dispatch transfer with status ${transfer.status}`);
      }

      // 2. Fetch source inventory to get its ID
      const sourceInventory = await tx.inventory.findUnique({
        where: {
          itemId_locationId_batch: {
            itemId: transfer.itemId,
            locationId: transfer.sourceLocationId,
            batch: transfer.batch
          }
        }
      });

      if (!sourceInventory) {
        throw new Error('Source inventory not found');
      }

      // 3. Atomically decrement physicalQty
      const updatedInventory = await tx.inventory.update({
        where: { id: sourceInventory.id },
        data: { physicalQty: { decrement: transfer.quantity } }
      });

      // 4. Validate availableQty constraint to prevent concurrent oversell
      if (updatedInventory.physicalQty < updatedInventory.reservedQty) {
        throw new Error('Insufficient available stock at source location');
      }

      // 5. Update transfer status
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.DISPATCHED,
          dispatchedAt: new Date()
        },
        include: {
          item: true,
          sourceLocation: true,
          destLocation: true
        }
      });

      // 6. Audit log
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: sourceInventory.id,
          type: TransactionType.TRANSFER_OUT,
          quantity: transfer.quantity,
          referenceId: transfer.id,
          note: `Transfer dispatch: ${transfer.transferNo}`,
          createdById: req.user!.id
        }
      });

      return updatedTransfer;
    });

    res.json(updatedTransfer);
  } catch (err: any) {
    if (err.message === 'Transfer not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Source inventory not found') return res.status(400).json({ error: err.message });
    if (err.message.startsWith('Cannot dispatch') || err.message === 'Insufficient available stock at source location') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Dispatch failed:', err);
    res.status(500).json({ error: 'Failed to dispatch transfer' });
  }
});

// POST /api/transfers/:id/receive - Receive transfer
router.post('/:id/receive', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const transferId = req.params.id as string;

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // 1. Fetch current transfer
      const transfer = await tx.internalTransfer.findUnique({
        where: { id: transferId }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.DISPATCHED) {
        throw new Error(`Cannot receive transfer with status ${transfer.status}`);
      }

      // 2. Upsert destination inventory
      const destInventory = await tx.inventory.upsert({
        where: {
          itemId_locationId_batch: {
            itemId: transfer.itemId,
            locationId: transfer.destLocationId,
            batch: transfer.batch
          }
        },
        create: {
          itemId: transfer.itemId,
          locationId: transfer.destLocationId,
          batch: transfer.batch,
          physicalQty: transfer.quantity,
          reservedQty: 0
        },
        update: {
          physicalQty: { increment: transfer.quantity }
        }
      });

      // 3. Update transfer status
      const updatedTransfer = await tx.internalTransfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.RECEIVED,
          receivedAt: new Date()
        },
        include: {
          item: true,
          sourceLocation: true,
          destLocation: true
        }
      });

      // 4. Audit log
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: destInventory.id,
          type: TransactionType.TRANSFER_IN,
          quantity: transfer.quantity,
          referenceId: transfer.id,
          note: `Transfer receipt: ${transfer.transferNo}`,
          createdById: req.user!.id
        }
      });

      return updatedTransfer;
    });

    res.json(updatedTransfer);
  } catch (err: any) {
    if (err.message === 'Transfer not found') return res.status(404).json({ error: err.message });
    if (err.message.startsWith('Cannot receive')) return res.status(400).json({ error: err.message });
    
    // Check for Prisma unique constraint failure on inventoryTransaction.referenceId+type
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Transfer receipt has already been processed' });
    }
    
    console.error('Receive failed:', err);
    res.status(500).json({ error: 'Failed to receive transfer' });
  }
});

export default router;
