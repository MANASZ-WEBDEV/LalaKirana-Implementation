declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'owner' | 'staff';
        email: string;
      };
    }
  }
}

export {};
