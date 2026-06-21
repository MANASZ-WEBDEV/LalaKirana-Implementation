import { Request, Response } from 'express';
import { analyticsService } from './analytics.service.js';

export const analyticsController = {
  getOverview: async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as { from: string; to: string };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const overview = await analyticsService.getOverview(from, to);
      return res.json(overview);
    } catch (err: any) {
      console.error('Analytics overview error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load analytics overview' });
    }
  },

  getTrend: async (req: Request, res: Response) => {
    try {
      const { from, to, granularity } = req.query as {
        from: string;
        to: string;
        granularity?: 'day' | 'week' | 'month';
      };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const trend = await analyticsService.getTrend(from, to, granularity || 'day');
      return res.json(trend);
    } catch (err: any) {
      console.error('Analytics trend error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load analytics trend' });
    }
  },

  getTopProducts: async (req: Request, res: Response) => {
    try {
      const { from, to, limit } = req.query as { from: string; to: string; limit?: string };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const products = await analyticsService.getTopProducts(from, to, parseInt(limit || '10'));
      return res.json(products);
    } catch (err: any) {
      console.error('Analytics top products error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load top products' });
    }
  },

  getCategoryBreakdown: async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as { from: string; to: string };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const categories = await analyticsService.getCategoryBreakdown(from, to);
      return res.json(categories);
    } catch (err: any) {
      console.error('Analytics category breakdown error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load category breakdown' });
    }
  },

  exportCSV: async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as { from: string; to: string };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const csv = await analyticsService.exportCSV(from, to);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="lalakirana-sales-${from}-to-${to}.csv"`);
      return res.send(csv);
    } catch (err: any) {
      console.error('Analytics CSV export error:', err);
      return res.status(500).json({ message: err.message || 'Failed to export CSV' });
    }
  },
};
