import { Router, Request, Response, NextFunction } from 'express';
import { storeSettingsService } from './settings.service.js';
import { translationsService } from './translations.service.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { CreateTranslationSchema, UpdateTranslationSchema } from './translations.schema.js';

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

/**
 * GET /api/v1/settings/store/translations
 * Retrieve all receipt translations (accessible to all authenticated users for printing)
 */
router.get(
  '/store/translations',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const translations = await translationsService.getAllTranslations();
      res.json(translations);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/settings/store/translations
 * Add a new receipt translation token (owner only)
 */
router.post(
  '/store/translations',
  requireOwner,
  validateRequest(CreateTranslationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await translationsService.createTranslation(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/settings/store/translations/:id
 * Update an existing translation token (owner only)
 */
router.put(
  '/store/translations/:id',
  requireOwner,
  validateRequest(UpdateTranslationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await translationsService.updateTranslation(req.params.id as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/settings/store/translations/:id
 * Delete a translation token (owner only)
 */
router.delete(
  '/store/translations/:id',
  requireOwner,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await translationsService.deleteTranslation(req.params.id as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
