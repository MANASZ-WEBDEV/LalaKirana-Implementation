import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireOwner } from '../../middleware/role.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { hrController } from './hr.controller.js';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  MarkAttendanceSchema,
  CreateSalaryRecordSchema,
  MarkSalaryPaidSchema,
  CreateAdvanceSchema,
} from './hr.schema.js';

const router = Router();

// Protect all HR routes with owner/master permissions
router.use(authMiddleware);
router.use(requireOwner);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'hr' });
});

// ── Employees ───────────────────────────────────────────────────────────
router.get('/employees', hrController.listEmployees);
router.post('/employees', validateRequest(CreateEmployeeSchema), hrController.createEmployee);
router.get('/employees/:id', hrController.getEmployee);
router.put('/employees/:id', validateRequest(UpdateEmployeeSchema), hrController.updateEmployee);
router.delete('/employees/:id', hrController.deactivateEmployee);

// ── Attendance ──────────────────────────────────────────────────────────
router.get('/attendance/today', hrController.getTodayAttendance);
router.post('/attendance', validateRequest(MarkAttendanceSchema), hrController.markAttendance);
router.delete('/attendance/:id', hrController.clearAttendance);
router.get('/attendance/:empId/history', hrController.getAttendanceHistory);
router.get('/attendance/:empId/summary', hrController.getAttendanceSummary);

// ── Salary Records ──────────────────────────────────────────────────────
router.get('/salary/:empId', hrController.getSalaryHistory);
router.post('/salary', validateRequest(CreateSalaryRecordSchema), hrController.createSalaryRecord);
router.put('/salary/:id/mark-paid', validateRequest(MarkSalaryPaidSchema), hrController.markSalaryPaid);

// ── Advances ────────────────────────────────────────────────────────────
router.get('/advances/:empId', hrController.getAdvances);
router.post('/advances', validateRequest(CreateAdvanceSchema), hrController.createAdvance);
router.get('/advances/:empId/outstanding', hrController.getOutstandingAdvances);

export default router;
