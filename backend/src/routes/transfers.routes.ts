/**
 * Internal Transfer routes — Phase 4
 *
 * Will implement:
 *   POST   /api/transfers             — Create transfer request (OPERATIONS_USER, ADMIN)
 *   GET    /api/transfers             — List transfers
 *   GET    /api/transfers/:id         — Get transfer detail
 *   POST   /api/transfers/:id/dispatch — Dispatch: deduct source inventory (OPERATIONS_USER, ADMIN)
 *   POST   /api/transfers/:id/receive  — Receive: add to dest inventory (OPERATIONS_USER, ADMIN)
 *
 * Critical rules (enforced in DB transaction):
 *   On Dispatch: source physicalQty decreases, dest physicalQty does NOT change yet
 *   On Receipt:  dest physicalQty increases
 *   Cannot receive a transfer twice (status check + idempotency guard)
 *   Transfer qty cannot exceed available source inventory
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router: Router = Router();

router.use(requireAuth);

// Placeholder — will be fully implemented in Phase 4
router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Transfers module not yet implemented.' });
});

export default router;
