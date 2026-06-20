import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Stub: In Step 4 we will parse JWT, verify sessions & token blocklist.
  // For bootstrapping, we attach the default seeded owner.
  req.user = {
    id: '1354c16f-3e95-4306-9301-c9ae3d8e17c8',
    role: 'owner',
    email: 'owner@lalakirana.in',
  };
  next();
};
