export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'staff';
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
  token: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}
