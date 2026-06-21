import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { inventoryController } from './inventory.controller.js';
import { StockAdjustSchema, EODEntrySchema } from './inventory.schema.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'inventory' });
});

// EOD
router.get('/eod', authMiddleware, inventoryController.getEODEntry);
router.post('/eod', authMiddleware, validateRequest(EODEntrySchema), inventoryController.submitEODEntry);

router.post('/:id/adjust', authMiddleware, validateRequest(StockAdjustSchema), inventoryController.adjustStock);

export default router;
