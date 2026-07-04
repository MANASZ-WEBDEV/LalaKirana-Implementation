import { Router } from 'express';
import { masterController } from './master.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireMaster } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  CreateOwnerSchema,
  ChangeRoleSchema,
  ResetPasswordSchema,
} from './master.schema.js';

const router = Router();

// Apply authentication and master check to all routes in this router
router.use(authMiddleware);
router.use(requireMaster);

router.get('/users/all', masterController.getAllUsers);
router.post('/users/create-owner', validateRequest(CreateOwnerSchema), masterController.createOwner);
router.put('/users/:id/role', validateRequest(ChangeRoleSchema), masterController.changeUserRole);
router.delete('/users/:id', masterController.deactivateUser);
router.post('/users/:id/activate', masterController.activateUser);
router.put('/users/:id/reset-password', validateRequest(ResetPasswordSchema), masterController.resetAnyPassword);
router.get('/shops/overview', masterController.getShopOverview);

export default router;
