import { Router, Request, Response, NextFunction } from 'express';
import { activityService } from './activity.service.js';
import {
  ActivitySummaryQuerySchema,
  ActivityFeedQuerySchema,
  ActivityUserProfileSchema,
  ActivityLoginsQuerySchema,
} from './activity.schema.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

// All activity routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/activity/summary
 * Get per-user daily activity summary
 * Access: Owner + Master only
 */
router.get(
  '/summary',
  requireOwner,
  validateRequest(ActivitySummaryQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query as any;
      const currentUserRole = req.user!.role;
      const summary = await activityService.getSummary(date, currentUserRole);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/activity/feed
 * Paginated activity feed with filters
 * Access: Owner + Master (Staff: self only)
 */
router.get(
  '/feed',
  validateRequest(ActivityFeedQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user!.role;
      const filters = { ...req.query, currentUserRole: userRole } as any;

      // Staff can only view their own activity feed
      if (userRole === 'staff') {
        filters.user_id = req.user!.id;
      }

      const result = await activityService.getFeed(filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/activity/users/:id/profile
 * Get individual staff profile activity summary + recent logs
 * Access: Owner + Master only
 */
router.get(
  '/users/:id/profile',
  requireOwner,
  validateRequest(ActivityUserProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      
      const profile = await activityService.getUserProfile(
        id,
        month,
        year
      );

      // Prevent Owner from accessing Master activity profile
      if (req.user!.role === 'owner' && profile.user.role === 'master') {
        return res.status(403).json({ message: 'Forbidden: Cannot access master profile' });
      }

      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/activity/logins
 * Get paginated login/logout history
 * Access: Owner + Master only
 */
router.get(
  '/logins',
  requireOwner,
  validateRequest(ActivityLoginsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user!.role;
      const filters = { ...req.query, currentUserRole: userRole } as any;
      const logins = await activityService.getLoginHistory(filters);
      res.json(logins);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
