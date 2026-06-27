import { Router, Request, Response, NextFunction } from 'express';
import { khataService } from './khata.service.js';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  RepaymentSchema,
  CustomerQuerySchema,
  StatementQuerySchema,
} from './khata.schema.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

// All khata routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/customers
 * List customers with search and pagination
 */
router.get(
  '/',
  validateRequest(CustomerQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await khataService.getCustomers(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/customers
 * Create a new customer
 */
router.post(
  '/',
  validateRequest(CreateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await khataService.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/customers/:id
 * Get customer profile with aggregated stats
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await khataService.getCustomerProfile(req.params.id as string);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/v1/customers/:id
 * Update customer details
 */
router.put(
  '/:id',
  validateRequest(UpdateCustomerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await khataService.updateCustomer(req.params.id as string, req.body);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/customers/:id/khata
 * Get paginated khata ledger entries for a customer
 */
router.get(
  '/:id/khata',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await khataService.getKhataEntries(req.params.id as string, page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/customers/:id/repay
 * Log a repayment from customer
 */
router.post(
  '/:id/repay',
  requireOwner,
  validateRequest(RepaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await khataService.logRepayment(req.params.id as string, req.body, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/customers/:id/statement
 * Get monthly khata statement
 */
router.get(
  '/:id/statement',
  validateRequest(StatementQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await khataService.getMonthlyStatement(
        req.params.id as string,
        req.query as any
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
