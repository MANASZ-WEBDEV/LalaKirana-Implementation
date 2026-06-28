import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { analyticsController } from './analytics.controller.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'analytics' });
});

// All analytics endpoints require authentication
router.get('/overview', authMiddleware, analyticsController.getOverview);
router.get('/breakdown', authMiddleware, analyticsController.getProfitBreakdown);
router.get('/trend', authMiddleware, analyticsController.getTrend);
router.get('/top-products', authMiddleware, analyticsController.getTopProducts);
router.get('/categories', authMiddleware, analyticsController.getCategoryBreakdown);
router.get('/export/csv', authMiddleware, analyticsController.exportCSV);

// New Product Analytics routes
router.get('/products', authMiddleware, analyticsController.getAllProductsAnalytics);
router.get('/product/:productId', authMiddleware, analyticsController.getProductAnalytics);
router.get('/product/:productId/trend', authMiddleware, analyticsController.getProductTrend);

// New Staff Discount Audit routes (restricted to Owner only)
router.get('/staff-discounts', authMiddleware, requireOwner, analyticsController.getStaffDiscountAudit);
router.get('/staff-discounts/:staffId/bills', authMiddleware, requireOwner, analyticsController.getStaffDiscountBills);

export default router;
