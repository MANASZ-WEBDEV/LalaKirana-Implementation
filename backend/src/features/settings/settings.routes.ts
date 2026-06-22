import { Router, Request, Response, NextFunction } from 'express';
import { storeSettingsService } from './settings.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/settings/store
 * Retrieve store settings (name, phone, address, footer)
 */
router.get(
  '/store',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await storeSettingsService.getStoreSettings();
      res.json(settings);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/settings/store
 * Update store settings (owner only)
 */
router.put(
  '/store',
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await storeSettingsService.updateStoreSettings(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
