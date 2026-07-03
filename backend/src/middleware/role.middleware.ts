import { Request, Response, NextFunction } from 'express';

export const requireMaster = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role !== 'master') {
    return res.status(403).json({ message: 'Forbidden: Master access required' });
  }
  next();
};

export const requireOwner = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (req.user.role !== 'owner' && req.user.role !== 'master') {
    return res.status(403).json({ message: 'Forbidden: Owner access required' });
  }
  next();
};
