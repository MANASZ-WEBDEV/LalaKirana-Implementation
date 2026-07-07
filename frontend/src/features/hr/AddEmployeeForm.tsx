import React, { useState, useEffect } from 'react';
import type { Employee, CreateEmployeeInput } from '@/types/hr.types';
import { useCreateEmployee, useUpdateEmployee, useSystemUsers, useEmployees } from './hr.queries';
import styles from './AddEmployeeForm.module.css';

interface AddEmployeeFormProps {
  employee?: Employee;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeForm({ employee, onCancel, onSuccess }: AddEmployeeFormProps) {
  const isEditMode = !!employee;

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState('Staff Member');
  const [employmentType, setEmploymentType] = useState<'full_time' | 'part_time' | 'daily_wage'>('full_time');
  const [salaryType, setSalaryType] = useState<'monthly' | 'daily'>('monthly');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(() => new Date().toISOString().split('T')[0]);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [worksSaturday, setWorksSaturday] = useState(true);
  const [worksSunday, setWorksSunday] = useState(false);
  const [userId, setUserId] = useState<string>('');

  // Queries & Mutations
  const { data: users } = useSystemUsers();
  const { data: employees } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  // Initialize form fields for Edit Mode
  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setPhone(employee.phone || '');
      setAddress(employee.address || '');
      setDesignation(employee.designation || 'Staff Member');
      setEmploymentType(employee.employment_type);
      setSalaryType(employee.salary_type);
      setSalaryAmount(employee.salary_amount.toString());
      setDateOfJoining(employee.date_of_joining.split('T')[0]);
      setEmergencyName(employee.emergency_contact_name || '');
      setEmergencyPhone(employee.emergency_contact_phone || '');
      setWorksSaturday(employee.works_saturday);
      setWorksSunday(employee.works_sunday);
      setUserId(employee.user_id || '');
    }
  }, [employee]);

  // Compute available users that aren't linked to other employees
  const getAvailableUsers = () => {
    if (!users) return [];

    // Find linked user IDs (excluding current employee's user ID if editing)
    const linkedUserIds = new Set(
      employees
        ?.map((emp) => emp.user_id)
        .filter((uid): uid is string => !!uid && uid !== employee?.user_id) || []
    );

    // Only show 'staff' users to link as employees, who aren't already linked
    return users.filter((u) => u.role === 'staff' && !linkedUserIds.has(u.id));
  };

  const availableUsers = getAvailableUsers();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedSalary = parseFloat(salaryAmount) || 0;
    if (parsedSalary <= 0) {
      alert('Salary amount must be a positive number.');
      return;
    }

    const payload: CreateEmployeeInput = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      designation: designation.trim() || undefined,
      employment_type: employmentType,
      salary_type: salaryType,
      salary_amount: parsedSalary,
      date_of_joining: dateOfJoining,
      emergency_contact_name: emergencyName.trim() || undefined,
      emergency_contact_phone: emergencyPhone.trim() || undefined,
      works_saturday: worksSaturday,
      works_sunday: worksSunday,
      user_id: userId || null,
    };

    if (isEditMode && employee) {
      updateMutation.mutate(
        { id: employee.id, data: payload },
        {
          onSuccess: () => {
            onSuccess();
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onSuccess();
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <h3 className={styles.title}>
        {isEditMode ? `Edit Profile: ${employee?.name}` : 'Add New Employee'}
      </h3>

      <div className={styles.formGrid}>
        {/* Section: Personal Info */}
        <h4 className={styles.sectionHeader}>Personal Info</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name *</label>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Phone Number</label>
          <input
            type="tel"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit number"
            pattern="[0-9]{10}"
          />
        </div>

        <div className={`${styles.formGroup} styles.formGroupFull ${styles.formGroupFull}`}>
          <label className={styles.label}>Address</label>
          <input
            type="text"
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Current residential address"
          />
        </div>

        {/* Section: Job Parameters */}
        <h4 className={styles.sectionHeader}>Employment Details</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Designation</label>
          <select
            className={`${styles.input} ${styles.selectInput}`}
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
          >
            <option value="Counter Staff">Counter Staff</option>
            <option value="Billing Executive">Billing Executive</option>
            <option value="Helper">Helper</option>
            <option value="Cleaner">Cleaner</option>
            <option value="Delivery Person">Delivery Person</option>
            <option value="Manager">Manager</option>
            <option value="Staff Member">Staff Member</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Employment Type</label>
          <select
            className={`${styles.input} ${styles.selectInput}`}
            value={employmentType}
            onChange={(e: any) => setEmploymentType(e.target.value)}
          >
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="daily_wage">Daily Wage</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Salary Basis</label>
          <select
            className={`${styles.input} ${styles.selectInput}`}
            value={salaryType}
            onChange={(e: any) => setSalaryType(e.target.value)}
          >
            <option value="monthly">Monthly Salary</option>
            <option value="daily">Daily Wage</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Salary Amount (₹) *</label>
          <input
            type="number"
            className={styles.input}
            value={salaryAmount}
            onChange={(e) => setSalaryAmount(e.target.value)}
            placeholder="Amount in Rupees"
            min="1"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Date of Joining</label>
          <input
            type="date"
            className={styles.input}
            value={dateOfJoining}
            onChange={(e) => setDateOfJoining(e.target.value)}
            required
          />
        </div>

        {/* Link to Login User */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Link System User Account</label>
          <select
            className={`${styles.input} ${styles.selectInput}`}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">None (Unlinked)</option>
            {employee?.user_id && (
              <option value={employee.user_id}>
                {employee.name} ({users?.find((u) => u.id === employee.user_id)?.email || 'Linked Account'})
              </option>
            )}
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email} ({u.email})
              </option>
            ))}
          </select>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-outline)' }}>
            Allows the employee to log in and use EOD/billing features under this staff role.
          </span>
        </div>

        {/* Schedule */}
        <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
          <label className={styles.label}>Standard Weekly Work Schedule</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={worksSaturday}
                onChange={(e) => setWorksSaturday(e.target.checked)}
              />
              Works Saturdays
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={worksSunday}
                onChange={(e) => setWorksSunday(e.target.checked)}
              />
              Works Sundays
            </label>
          </div>
        </div>

        {/* Section: Emergency Contact */}
        <h4 className={styles.sectionHeader}>Emergency Contact</h4>

        <div className={styles.formGroup}>
          <label className={styles.label}>Contact Name</label>
          <input
            type="text"
            className={styles.input}
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
            placeholder="e.g. Spouse/Parent Name"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Contact Phone</label>
          <input
            type="tel"
            className={styles.input}
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="10-digit number"
            pattern="[0-9]{10}"
          />
        </div>
      </div>

      <div className={styles.btnRow}>
        <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className={`${styles.btn} ${styles.btnSubmit}`} disabled={isPending}>
          {isPending ? 'Saving...' : isEditMode ? 'Update Profile' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}
