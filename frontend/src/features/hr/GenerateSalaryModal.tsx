interface GenerateSalaryModalProps {
  employeeId: string;
  onClose: () => void;
}

export default function GenerateSalaryModal({ onClose }: GenerateSalaryModalProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--color-white)', padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h3>Generate Salary Record</h3>
        <p style={{ color: 'var(--color-outline)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>This modal is being implemented in the next feature step.</p>
        <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'var(--color-surface-container)', border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}
