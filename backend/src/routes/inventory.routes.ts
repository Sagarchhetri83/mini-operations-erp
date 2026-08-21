/**
 * Inventory routes — Phase 2
 *
 * Will implement:
 *   GET    /api/inventory           — List inventory with available qty
 *   GET    /api/inventory/:id       — Get single inventory record
 *   POST   /api/inventory           — Create inventory record (ADMIN, OPERATIONS_USER)
 *   PUT    /api/inventory/:id       — Adjust physical stock (ADMIN, OPERATIONS_USER)
 *   GET    /api/inventory/:id/transactions — Audit log
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router: Router = Router();

router.use(requireAuth);

// Placeholder — will be fully implemented in Phase 2
router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Inventory module not yet implemented.' });
});

export default router;
