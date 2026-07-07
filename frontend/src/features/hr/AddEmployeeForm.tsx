import type { Employee } from '@/types/hr.types';

interface AddEmployeeFormProps {
  employee?: Employee;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeForm({ employee, onCancel, onSuccess }: AddEmployeeFormProps) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-outline-variant)' }}>
      <h3>{employee ? 'Edit Employee Profile (Stub)' : 'Add Employee Form'}</h3>
      <p style={{ color: 'var(--color-outline)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>This component is being implemented in the next feature step.</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button 
          onClick={onCancel}
          style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
        >
          Go Back
        </button>
        <button 
          onClick={onSuccess}
          style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: 'var(--color-white)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
        >
          Submit (Stub)
        </button>
      </div>
    </div>
  );
}
