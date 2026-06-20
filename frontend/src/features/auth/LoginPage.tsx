import { useAuthStore } from '@/shared/store/authStore';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = () => {
    login(
      { id: '1354c16f-3e95-4306-9301-c9ae3d8e17c8', name: 'Shop Owner', email: 'owner@lalakirana.in', role: 'owner' },
      'mock-jwt-token'
    );
    navigate('/dashboard');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-surface)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem', color: 'var(--color-primary)' }}>LalaKirana</h2>
      <button onClick={handleLogin} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
        Sign In (Mock Owner)
      </button>
    </div>
  );
}
