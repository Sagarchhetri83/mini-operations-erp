/**
 * Customer Order routes — Phase 5
 *
 * Will implement:
 *   POST   /api/orders              — Create order & reserve stock (SALES_USER, ADMIN)
 *   GET    /api/orders              — List orders
 *   GET    /api/orders/:id          — Get order detail
 *   POST   /api/orders/:id/confirm  — Confirm order (ADMIN, SALES_USER)
 *   DELETE /api/orders/:id          — Cancel order & release reservation (ADMIN, SALES_USER)
 *
 * CRITICAL: Reservation must be concurrency-safe.
 *   Uses SELECT ... FOR UPDATE inside a serializable transaction to prevent
 *   two users from reserving more stock than actually exists simultaneously.
 */
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router: Router = Router();

router.use(requireAuth);

// Placeholder — will be fully implemented in Phase 5
router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Customer Orders module not yet implemented.' });
});

export default router;
