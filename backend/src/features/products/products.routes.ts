import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { productsController } from './products.controller.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  BulkPriceSchema,
} from './product.schema.js';
import { purchasesService } from '../purchases/purchases.service.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'products' });
});

// Categories (Place specific routes before parameter routes)
router.get('/categories', authMiddleware, productsController.getCategories);
router.post('/categories', authMiddleware, requireOwner, productsController.createCategory);

// Products
router.get('/', authMiddleware, productsController.getAllProducts);
router.post('/', authMiddleware, validateRequest(CreateProductSchema), productsController.createProduct);
router.post('/bulk-price', authMiddleware, validateRequest(BulkPriceSchema), productsController.bulkUpdatePrices);

router.get('/:id', authMiddleware, productsController.getProductById);
router.put('/:id', authMiddleware, validateRequest(UpdateProductSchema), productsController.updateProduct);
router.delete('/:id', authMiddleware, requireOwner, productsController.softDeleteProduct);
router.get('/:id/price-history', authMiddleware, productsController.getPriceHistory);
router.get('/:id/stock-log', authMiddleware, productsController.getStockLog);

// Phase 2: Item History — Purchase history and supplier summary per product
router.get(
  '/:id/purchase-history',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await purchasesService.getProductPurchaseHistory(req.params.id as string, limit);
      res.json(history);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:id/supplier-summary',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await purchasesService.getProductSupplierSummary(req.params.id as string);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
