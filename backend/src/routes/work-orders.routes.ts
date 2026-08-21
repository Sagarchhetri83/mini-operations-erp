/**
 * Work Order routes — Phase 3
 *
 * Will implement:
 *   POST   /api/work-orders         — Create work order (ADMIN only)
 *   GET    /api/work-orders         — List work orders
 *   GET    /api/work-orders/:id     — Get work order detail
 *   PATCH  /api/work-orders/:id/status — Update status (OPERATIONS_USER, ADMIN)
 *
 * Key business logic:
 *   - shortageQty = max(0, requiredQty - availableQty) computed at creation and status change
 *   - Status transitions: ASSIGNED → IN_PROGRESS → COMPLETED
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router: Router = Router();

router.use(requireAuth);

// Placeholder — will be fully implemented in Phase 3
router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Work Orders module not yet implemented.' });
});

export default router;
