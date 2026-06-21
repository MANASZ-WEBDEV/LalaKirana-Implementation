import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { reportsController } from './reports.controller.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'reports' });
});

// All dashboard endpoints require authentication
router.get('/dashboard', authMiddleware, reportsController.getDashboardStats);
router.get('/low-stock', authMiddleware, reportsController.getLowStockProducts);
router.get('/price-changes', authMiddleware, reportsController.getRecentPriceChanges);

export default router;
