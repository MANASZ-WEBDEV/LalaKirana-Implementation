declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'master' | 'owner' | 'staff';
        email: string;
        jti?: string;
        exp?: number;
      };
    }
  }
}

export {};

