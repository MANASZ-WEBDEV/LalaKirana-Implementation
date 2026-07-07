import { Request, Response } from 'express';
import { hrService } from './hr.service.js';

export const hrController = {
  // ── Employee CRUD ─────────────────────────────────────────────────────

  listEmployees: async (req: Request, res: Response) => {
    try {
      const is_active = req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined;
      const type = req.query.type as string;
      const employees = await hrService.listEmployees({ is_active, type });
      return res.json(employees);
    } catch (err: any) {
      console.error('List employees error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch employees' });
    }
  },

  getEmployee: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const employee = await hrService.getEmployee(id);
      return res.json(employee);
    } catch (err: any) {
      console.error('Get employee error:', err);
      return res.status(404).json({ message: err.message || 'Employee not found' });
    }
  },

  createEmployee: async (req: Request, res: Response) => {
    try {
      const newEmployee = await hrService.createEmployee(req.body);
      return res.status(201).json({
        message: 'Employee created successfully',
        employee: newEmployee,
      });
    } catch (err: any) {
      console.error('Create employee error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create employee' });
    }
  },

  updateEmployee: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const updatedEmployee = await hrService.updateEmployee(id, req.body);
      return res.json({
        message: 'Employee updated successfully',
        employee: updatedEmployee,
      });
    } catch (err: any) {
      console.error('Update employee error:', err);
      return res.status(400).json({ message: err.message || 'Failed to update employee' });
    }
  },

  deactivateEmployee: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const deactivatedEmployee = await hrService.deactivateEmployee(id);
      return res.json({
        message: 'Employee deactivated successfully',
        employee: deactivatedEmployee,
      });
    } catch (err: any) {
      console.error('Deactivate employee error:', err);
      return res.status(400).json({ message: err.message || 'Failed to deactivate employee' });
    }
  },

  // ── Attendance ────────────────────────────────────────────────────────

  getTodayAttendance: async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required (format YYYY-MM-DD)' });
      }
      const attendance = await hrService.getTodayAttendance(date);
      return res.json(attendance);
    } catch (err: any) {
      console.error('Get today attendance error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch attendance' });
    }
  },

  markAttendance: async (req: Request, res: Response) => {
    try {
      const { date, records } = req.body;
      const markedBy = req.user!.id;
      const results = await hrService.markAttendance(date, records, markedBy);
      return res.json({
        message: 'Attendance saved successfully',
        records: results,
      });
    } catch (err: any) {
      console.error('Mark attendance error:', err);
      return res.status(400).json({ message: err.message || 'Failed to save attendance' });
    }
  },

  clearAttendance: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await hrService.clearAttendance(id);
      return res.json(result);
    } catch (err: any) {
      console.error('Clear attendance error:', err);
      return res.status(400).json({ message: err.message || 'Failed to clear attendance' });
    }
  },

  getAttendanceHistory: async (req: Request, res: Response) => {
    try {
      const empId = req.params.empId as string;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate parameters are required' });
      }
      const history = await hrService.getAttendanceHistory(empId, startDate, endDate);
      return res.json(history);
    } catch (err: any) {
      console.error('Get attendance history error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch attendance history' });
    }
  },

  getAttendanceSummary: async (req: Request, res: Response) => {
    try {
      const empId = req.params.empId as string;
      const { startDate, endDate } = req.query as { startDate: string; endDate: string };
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'startDate and endDate parameters are required' });
      }
      const summary = await hrService.getAttendanceSummary(empId, startDate, endDate);
      return res.json(summary);
    } catch (err: any) {
      console.error('Get attendance summary error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch attendance summary' });
    }
  },

  // ── Salary Records ────────────────────────────────────────────────────

  getSalaryHistory: async (req: Request, res: Response) => {
    try {
      const empId = req.params.empId as string;
      const history = await hrService.getSalaryHistory(empId);
      return res.json(history);
    } catch (err: any) {
      console.error('Get salary history error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch salary history' });
    }
  },

  createSalaryRecord: async (req: Request, res: Response) => {
    try {
      const record = await hrService.createSalaryRecord(req.body);
      
      // If advances are deducted, we should mark advances as recovered for this employee
      if (req.body.advances_deducted > 0) {
        await hrService.markAdvancesRecovered(req.body.employee_id, req.body.period_month, req.body.period_year, req.body.advances_deducted);
      }

      return res.status(201).json({
        message: 'Salary record created successfully',
        record,
      });
    } catch (err: any) {
      console.error('Create salary record error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create salary record' });
    }
  },

  markSalaryPaid: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const paidBy = req.user!.id;
      const note = req.body?.note;
      const record = await hrService.markSalaryPaid(id, paidBy, note);
      return res.json({
        message: 'Salary marked as paid successfully',
        record,
      });
    } catch (err: any) {
      console.error('Mark salary paid error:', err);
      return res.status(400).json({ message: err.message || 'Failed to mark salary as paid' });
    }
  },

  // ── Salary Advances ───────────────────────────────────────────────────

  getAdvances: async (req: Request, res: Response) => {
    try {
      const empId = req.params.empId as string;
      const advances = await hrService.getAdvances(empId);
      return res.json(advances);
    } catch (err: any) {
      console.error('Get advances error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch advances' });
    }
  },

  createAdvance: async (req: Request, res: Response) => {
    try {
      const givenBy = req.user!.id;
      const advanceData = {
        ...req.body,
        given_by: givenBy,
      };
      const advance = await hrService.createAdvance(advanceData);
      return res.status(201).json({
        message: 'Advance payment recorded successfully',
        advance,
      });
    } catch (err: any) {
      console.error('Create advance error:', err);
      return res.status(400).json({ message: err.message || 'Failed to record advance' });
    }
  },

  getOutstandingAdvances: async (req: Request, res: Response) => {
    try {
      const empId = req.params.empId as string;
      const outstanding = await hrService.getOutstandingAdvances(empId);
      return res.json(outstanding);
    } catch (err: any) {
      console.error('Get outstanding advances error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch outstanding advances' });
    }
  },
};
