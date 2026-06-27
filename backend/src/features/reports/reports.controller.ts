import { Request, Response } from 'express';
import { reportsService } from './reports.service.js';

export const reportsController = {
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const stats = await reportsService.getDashboardStats();
      if (req.user?.role !== 'owner') {
        stats.inventoryValue = null;
      }
      return res.json(stats);
    } catch (err: any) {
      console.error('Dashboard stats error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load dashboard stats' });
    }
  },

  getLowStockProducts: async (_req: Request, res: Response) => {
    try {
      const products = await reportsService.getLowStockProducts();
      return res.json(products);
    } catch (err: any) {
      console.error('Low stock products error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load low stock products' });
    }
  },

  getRecentPriceChanges: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const changes = await reportsService.getRecentPriceChanges(limit);
      return res.json(changes);
    } catch (err: any) {
      console.error('Recent price changes error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load price changes' });
    }
  },
};
