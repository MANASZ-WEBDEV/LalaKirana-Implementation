import { Router, Request, Response, NextFunction } from 'express';
import { billingService } from './billing.service.js';
import { ConfirmBillSchema, CancelBillSchema, BillHistoryQuerySchema } from './billing.schema.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

// All billing routes require authentication
router.use(authMiddleware);

/**
 * POST /api/v1/billing
 * Confirm a new bill (full or quick, paid or khata)
 */
router.post(
  '/',
  validateRequest(ConfirmBillSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const bill = await billingService.confirmBill(req.body, userId);
      res.status(201).json(bill);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing
 * List bills with filters and pagination
 */
router.get(
  '/',
  validateRequest(BillHistoryQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await billingService.getBills(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing/today-summary
 * Get today's billing summary (for dashboard/EOD)
 */
router.get(
  '/today-summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await billingService.getTodaySummary();
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/billing/:id
 * Get a single bill with full details
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bill = await billingService.getBillById(req.params.id as string);
      res.json(bill);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/billing/:id/cancel
 * Cancel a confirmed bill (owner only)
 */
router.post(
  '/:id/cancel',
  requireOwner,
  validateRequest(CancelBillSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await billingService.cancelBill(
        req.params.id as string,
        req.body.reason,
        userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
