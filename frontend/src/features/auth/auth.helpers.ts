export function getStoredToken(): string | null {
  return localStorage.getItem('lk_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('lk_token', token);
}

export function clearStoredToken(): void {
  localStorage.removeItem('lk_token');
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}
