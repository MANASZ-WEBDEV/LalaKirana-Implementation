import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app.js';
import { supabase } from '../src/db/supabase.js';
import { cleanupTestUsers } from './setup.js';

const TEST_OWNER_EMAIL = 'hr-test-owner@lalakirana.in';
const PASSWORD = 'password123';

describe('HR Module Endpoints', () => {
  let ownerToken: string;
  let ownerId: string;
  let employeeId: string;
  let salaryRecordId: string;

  beforeAll(async () => {
    // 1. Make sure no leftover users exist
    await cleanupTestUsers([TEST_OWNER_EMAIL]);

    // 2. Clean up prior HR test data
    // Fetch test employee if exists to clean cascading records
    const { data: oldEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('name', 'HR Test Employee')
      .maybeSingle();

    if (oldEmp) {
      await supabase.from('attendance').delete().eq('employee_id', oldEmp.id);
      await supabase.from('salary_records').delete().eq('employee_id', oldEmp.id);
      await supabase.from('salary_advance_payments').delete().eq('employee_id', oldEmp.id);
      await supabase.from('employees').delete().eq('id', oldEmp.id);
    }

    // 3. Create test owner user
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    const { data: ownerUser } = await supabase
      .from('users')
      .insert({
        name: 'HR Test Owner',
        email: TEST_OWNER_EMAIL,
        password: hashedPassword,
        role: 'owner',
      })
      .select('id')
      .single();

    ownerId = ownerUser!.id;

    // 4. Login to get token
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_OWNER_EMAIL, password: PASSWORD });
    ownerToken = ownerLogin.body.token;
  });

  afterAll(async () => {
    // Clean up
    if (employeeId) {
      await supabase.from('attendance').delete().eq('employee_id', employeeId);
      await supabase.from('salary_records').delete().eq('employee_id', employeeId);
      await supabase.from('salary_advance_payments').delete().eq('employee_id', employeeId);
      await supabase.from('employees').delete().eq('id', employeeId);
    }
    await cleanupTestUsers([TEST_OWNER_EMAIL]);
  });

  // ── Employee CRUD Tests ────────────────────────────────────────────────
  describe('Employee CRUD', () => {
    it('should create an employee successfully', async () => {
      const res = await request(app)
        .post('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'HR Test Employee',
          phone: '9876543210',
          address: 'Test Address, Khandwa',
          designation: 'Helper',
          employment_type: 'full_time',
          salary_type: 'monthly',
          salary_amount: 8000,
        });

      expect(res.status).toBe(201);
      expect(res.body.employee).toBeDefined();
      expect(res.body.employee.name).toBe('HR Test Employee');
      employeeId = res.body.employee.id;
    });

    it('should list employees', async () => {
      const res = await request(app)
        .get('/api/v1/hr/employees')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const testEmp = res.body.find((e: any) => e.id === employeeId);
      expect(testEmp).toBeDefined();
      expect(testEmp.designation).toBe('Helper');
    });

    it('should fetch single employee details', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/employees/${employeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('HR Test Employee');
      expect(Number(res.body.salary_amount)).toBe(8000);
    });

    it('should update employee profile', async () => {
      const res = await request(app)
        .put(`/api/v1/hr/employees/${employeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          phone: '9999988888',
          designation: 'Counter Staff',
        });

      expect(res.status).toBe(200);
      expect(res.body.employee.phone).toBe('9999988888');
      expect(res.body.employee.designation).toBe('Counter Staff');
    });
  });

  // ── Attendance Tests ──────────────────────────────────────────────────
  describe('Attendance Management', () => {
    const testDate = '2026-06-25';

    it('should fetch today/default attendance showing present', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/attendance/today?date=${testDate}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      const testEmp = res.body.find((e: any) => e.employee_id === employeeId);
      expect(testEmp).toBeDefined();
      expect(testEmp.status).toBe('present');
    });

    it('should mark attendance successfully (absent)', async () => {
      const res = await request(app)
        .post('/api/v1/hr/attendance')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          date: testDate,
          records: [
            {
              employee_id: employeeId,
              status: 'absent',
              note: 'Sick leave',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.records.length).toBe(1);
      expect(res.body.records[0].status).toBe('absent');

      // Verify DB contains attendance record
      const { data: record } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('date', testDate)
        .single();

      expect(record).toBeDefined();
      expect(record!.status).toBe('absent');
      expect(record!.note).toBe('Sick leave');
    });

    it('should get attendance history and summary', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/attendance/${employeeId}/summary?startDate=2026-06-01&endDate=2026-06-30`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.absent).toBe(1);
      expect(res.body.half_day).toBe(0);
    });

    it('should delete attendance (revert to present)', async () => {
      // Find the record id
      const { data: record } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', testDate)
        .single();

      const res = await request(app)
        .delete(`/api/v1/hr/attendance/${record!.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);

      // Verify default state is present again
      const checkRes = await request(app)
        .get(`/api/v1/hr/attendance/today?date=${testDate}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      const testEmp = checkRes.body.find((e: any) => e.employee_id === employeeId);
      expect(testEmp.status).toBe('present');
    });
  });

  // ── Advances Tests ────────────────────────────────────────────────────
  describe('Salary Advance Payments', () => {
    it('should start with 0 outstanding advances', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/advances/${employeeId}/outstanding`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.outstanding).toBe(0);
    });

    it('should record an advance payment', async () => {
      const res = await request(app)
        .post('/api/v1/hr/advances')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          employee_id: employeeId,
          amount: 1500,
          given_on: '2026-06-05',
          note: 'Festival advance',
        });

      expect(res.status).toBe(201);
      expect(Number(res.body.advance.amount)).toBe(1500);

      // Verify outstanding is now 1500
      const outRes = await request(app)
        .get(`/api/v1/hr/advances/${employeeId}/outstanding`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(outRes.status).toBe(200);
      expect(outRes.body.outstanding).toBe(1500);
    });
  });

  // ── Salary Records Tests ──────────────────────────────────────────────
  describe('Salary Records', () => {
    it('should create a salary record (manual calculations)', async () => {
      const res = await request(app)
        .post('/api/v1/hr/salary')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          employee_id: employeeId,
          period_month: 6,
          period_year: 2026,
          working_days: 26,
          present_days: 25,
          absent_days: 1,
          half_days: 0,
          gross_salary: 8000,
          deductions: 300,          // Manual deduction
          advances_deducted: 500,   // Recover 500 from outstanding advance
          net_salary: 7200,         // 8000 - 300 - 500 = 7200
          note: 'June Salary',
        });

      expect(res.status).toBe(201);
      expect(res.body.record).toBeDefined();
      expect(Number(res.body.record.net_salary)).toBe(7200);
      salaryRecordId = res.body.record.id;

      // Verify remaining outstanding advance is now 1000 (1500 - 500)
      const outRes = await request(app)
        .get(`/api/v1/hr/advances/${employeeId}/outstanding`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(outRes.body.outstanding).toBe(1000);
    });

    it('should fetch salary history', async () => {
      const res = await request(app)
        .get(`/api/v1/hr/salary/${employeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(Number(res.body[0].net_salary)).toBe(7200);
      expect(res.body[0].paid).toBe(false);
    });

    it('should mark salary as paid', async () => {
      const res = await request(app)
        .put(`/api/v1/hr/salary/${salaryRecordId}/mark-paid`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          note: 'Paid via GPay',
        });

      expect(res.status).toBe(200);
      expect(res.body.record.paid).toBe(true);
      expect(res.body.record.is_locked).toBe(true);
    });
  });

  // ── Employee Deactivation Tests ────────────────────────────────────────
  describe('Deactivation', () => {
    it('should soft-deactivate employee', async () => {
      const res = await request(app)
        .delete(`/api/v1/hr/employees/${employeeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.employee.is_active).toBe(false);
      expect(res.body.employee.date_of_leaving).toBeDefined();
    });
  });
});
