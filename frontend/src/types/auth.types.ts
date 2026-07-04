export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'master' | 'owner' | 'staff';
  is_active?: boolean;
  created_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_jti: string;
  device_hint: string;
  ip_address: string;
  last_seen: string;
  created_at: string;
  is_current?: boolean;
}

export interface LoginResponse {
  token?: string;
  user?: User;
  requires2FA?: boolean;
  totpSetup?: boolean;
  qrCode?: string;
  secret?: string;
  preAuthToken?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  recoveryCode?: string;
  rememberMe?: boolean;
}
