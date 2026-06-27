import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { analyticsController } from './analytics.controller.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'analytics' });
});

// All analytics endpoints require authentication
// Owner-only access is enforced at the frontend level (route guard)
router.get('/overview', authMiddleware, analyticsController.getOverview);
router.get('/breakdown', authMiddleware, analyticsController.getProfitBreakdown);
router.get('/trend', authMiddleware, analyticsController.getTrend);
router.get('/top-products', authMiddleware, analyticsController.getTopProducts);
router.get('/categories', authMiddleware, analyticsController.getCategoryBreakdown);
router.get('/export/csv', authMiddleware, analyticsController.exportCSV);

export default router;
