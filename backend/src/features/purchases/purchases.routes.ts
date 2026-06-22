import { Router, Request, Response, NextFunction } from 'express';
import { purchasesService } from './purchases.service.js';
import {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  SupplierQuerySchema,
  SupplierRepaymentSchema,
  CreatePurchaseOrderSchema,
  CancelPurchaseSchema,
  PurchaseQuerySchema,
  CreateExpenseSchema,
  ExpenseQuerySchema,
} from './purchases.schema.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';

const router = Router();

// All purchase routes require authentication
router.use(authMiddleware);

// ─── SUPPLIERS ───────────────────────────────────

router.get(
  '/suppliers',
  validateRequest(SupplierQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await purchasesService.getSuppliers(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/suppliers',
  validateRequest(CreateSupplierSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supplier = await purchasesService.createSupplier(req.body);
      res.status(201).json(supplier);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  '/suppliers/:id',
  validateRequest(UpdateSupplierSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const supplier = await purchasesService.updateSupplier(req.params.id as string, req.body);
      res.json(supplier);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/suppliers/:id/repay',
  validateRequest(SupplierRepaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await purchasesService.logSupplierRepayment(req.params.id as string, req.body, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PURCHASE ORDERS ─────────────────────────────

router.get(
  '/',
  validateRequest(PurchaseQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await purchasesService.getPurchaseOrders(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/',
  validateRequest(CreatePurchaseOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const po = await purchasesService.confirmPurchaseOrder(req.body, userId);
      res.status(201).json(po);
    } catch (err) {
      next(err);
    }
  }
);

// ─── EXPENSES ────────────────────────────────────

router.get(
  '/expenses',
  validateRequest(ExpenseQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await purchasesService.getExpenses(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/expenses',
  validateRequest(CreateExpenseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const expense = await purchasesService.createExpense(req.body, userId);
      res.status(201).json(expense);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PURCHASE ORDERS ─────────────────────────────

router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const po = await purchasesService.getPurchaseOrderById(req.params.id as string);
      res.json(po);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/cancel',
  requireOwner,
  validateRequest(CancelPurchaseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await purchasesService.cancelPurchaseOrder(req.params.id as string, req.body.reason, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
