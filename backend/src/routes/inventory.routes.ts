import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { PrismaClient, TransactionType } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

router.use(requireAuth);

// GET /api/inventory - List all inventory records
router.get('/', async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        item: { include: { category: true } },
        location: true,
      },
      orderBy: [
        { item: { name: 'asc' } },
        { location: { name: 'asc' } },
        { batch: 'asc' }
      ]
    });

    const inventoryWithAvailable = inventory.map(inv => ({
      ...inv,
      availableQty: inv.physicalQty - inv.reservedQty
    }));

    res.json(inventoryWithAvailable);
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/locations - Get all locations (helper for dropdowns)
router.get('/locations', async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: 'asc' } });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/inventory/items - Get all items (helper for dropdowns)
router.get('/items', async (req: Request, res: Response) => {
  try {
    const items = await prisma.item.findMany({ 
      include: { category: true },
      orderBy: { name: 'asc' } 
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});


// GET /api/inventory/:id - Get a single inventory record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const inv = await prisma.inventory.findUnique({
      where: { id: req.params.id as string },
      include: {
        item: { include: { category: true } },
        location: true,
      }
    });

    if (!inv) {
      res.status(404).json({ error: 'Inventory record not found' });
      return;
    }

    res.json({
      ...inv,
      availableQty: inv.physicalQty - inv.reservedQty
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inventory record' });
  }
});

// POST /api/inventory - Create a new inventory record
router.post('/', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const { itemId, locationId, batch, physicalQty } = req.body;

    if (!itemId || !locationId || !batch) {
      res.status(400).json({ error: 'itemId, locationId, and batch are required' });
      return;
    }

    if (physicalQty === undefined || typeof physicalQty !== 'number' || physicalQty < 0) {
      res.status(400).json({ error: 'physicalQty must be a valid non-negative number' });
      return;
    }

    // Check if duplicate combination exists
    const existing = await prisma.inventory.findUnique({
      where: { itemId_locationId_batch: { itemId, locationId, batch } }
    });

    if (existing) {
      res.status(409).json({ error: 'Inventory record already exists for this Item + Location + Batch' });
      return;
    }

    // Wrap in transaction to add initial StockMovement audit log
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.create({
        data: {
          itemId,
          locationId,
          batch,
          physicalQty,
          reservedQty: 0
        }
      });

      if (physicalQty > 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: inv.id,
            type: TransactionType.STOCK_IN,
            quantity: physicalQty,
            note: 'Initial inventory creation',
            createdById: req.user!.id
          }
        });
      }

      return tx.inventory.findUnique({
        where: { id: inv.id },
        include: { item: true, location: true }
      });
    });

    res.status(201).json({
      ...result,
      availableQty: result!.physicalQty - result!.reservedQty
    });
  } catch (err: any) {
    console.error('Failed to create inventory:', err);
    res.status(500).json({ error: 'Failed to create inventory' });
  }
});

// PUT /api/inventory/:id - Adjust physical quantity of an existing record
router.put('/:id', requireRole('ADMIN', 'OPERATIONS_USER'), async (req: Request, res: Response) => {
  try {
    const { physicalQty } = req.body;

    if (physicalQty === undefined || typeof physicalQty !== 'number' || physicalQty < 0) {
      res.status(400).json({ error: 'physicalQty must be a valid non-negative number' });
      return;
    }

    // Execute within a transaction to maintain audit log and ensure constraints
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventory.findUnique({
        where: { id: req.params.id as string }
      });

      if (!existing) {
        throw new Error('NOT_FOUND');
      }

      if (physicalQty < existing.reservedQty) {
        throw new Error('NEGATIVE_AVAILABLE');
      }

      const diff = physicalQty - existing.physicalQty;
      
      const updated = await tx.inventory.update({
        where: { id: req.params.id as string },
        data: { physicalQty }
      });

      if (diff !== 0) {
        await tx.inventoryTransaction.create({
          data: {
            inventoryId: updated.id,
            type: diff > 0 ? TransactionType.STOCK_IN : TransactionType.STOCK_OUT,
            quantity: Math.abs(diff),
            note: 'Manual inventory adjustment',
            createdById: req.user!.id
          }
        });
      }

      return tx.inventory.findUnique({
        where: { id: updated.id },
        include: { item: true, location: true }
      });
    });

    res.json({
      ...result,
      availableQty: result!.physicalQty - result!.reservedQty
    });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      res.status(404).json({ error: 'Inventory record not found' });
    } else if (err.message === 'NEGATIVE_AVAILABLE') {
      res.status(400).json({ error: 'Physical quantity cannot be less than reserved quantity (would result in negative available quantity)' });
    } else {
      console.error('Failed to update inventory:', err);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  }
});

export default router;
