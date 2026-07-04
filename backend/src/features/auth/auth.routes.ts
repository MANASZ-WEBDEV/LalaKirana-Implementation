import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { loginRateLimiter } from '../../middleware/rateLimiter.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  LoginSchema,
  ChangePasswordSchema,
  CreateUserSchema,
  ResetUserPasswordSchema,
} from './auth.schema.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', feature: 'auth' });
});

router.post('/login', loginRateLimiter, validateRequest(LoginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.me);
router.put('/change-password', authMiddleware, validateRequest(ChangePasswordSchema), authController.changePassword);
router.get('/sessions', authMiddleware, authController.getSessions);
router.delete('/sessions/all', authMiddleware, authController.deleteAllSessions);
router.delete('/sessions/:id', authMiddleware, authController.deleteSession);

// User management (Owner only)
router.get('/users', authMiddleware, requireOwner, authController.getUsers);
router.post('/users', authMiddleware, requireOwner, validateRequest(CreateUserSchema), authController.createUser);
router.put('/users/:id/reset-password', authMiddleware, requireOwner, validateRequest(ResetUserPasswordSchema), authController.resetUserPassword);
router.delete('/users/:id', authMiddleware, requireOwner, authController.deactivateUser);
router.post('/users/:id/activate', authMiddleware, requireOwner, authController.activateUser);

export default router;
