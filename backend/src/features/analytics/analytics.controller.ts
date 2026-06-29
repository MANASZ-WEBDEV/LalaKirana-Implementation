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

  getProfitBreakdown: async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query as { from: string; to: string };
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const breakdown = await analyticsService.getProfitBreakdown(from, to);
      return res.json(breakdown);
    } catch (err: any) {
      console.error('Analytics profit breakdown error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load profit breakdown' });
    }
  },

  getAllProductsAnalytics: async (req: Request, res: Response) => {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      const page = req.query.page as string | undefined;
      const limit = req.query.limit as string | undefined;
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const data = await analyticsService.getAllProductsAnalytics(
        from as string,
        to as string,
        sortBy,
        sortOrder,
        search,
        category,
        page ? parseInt(page) : undefined,
        limit ? parseInt(limit) : undefined
      );
      return res.json(data);
    } catch (err: any) {
      console.error('All products analytics error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load products analytics' });
    }
  },

  getProductAnalytics: async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId as string;
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const data = await analyticsService.getProductAnalytics(productId, from as string, to as string);
      return res.json(data);
    } catch (err: any) {
      console.error('Product analytics error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load product analytics' });
    }
  },

  getProductTrend: async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId as string;
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';
      const granularity = req.query.granularity as 'day' | 'week' | 'month' | undefined;
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const trend = await analyticsService.getProductTrend(productId, from as string, to as string, granularity || 'day');
      return res.json(trend);
    } catch (err: any) {
      console.error('Product trend error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load product trend' });
    }
  },

  getStaffDiscountAudit: async (req: Request, res: Response) => {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';
      const granularity = req.query.granularity as 'day' | 'week' | 'month' | undefined;
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const data = await analyticsService.getStaffDiscountAudit(from as string, to as string, granularity || 'day');
      return res.json(data);
    } catch (err: any) {
      console.error('Staff discount audit error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load staff discount audit' });
    }
  },

  getStaffDiscountBills: async (req: Request, res: Response) => {
    try {
      const staffId = req.params.staffId as string;
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';
      const page = req.query.page as string | undefined;
      const limit = req.query.limit as string | undefined;
      const productId = req.query.productId as string | undefined;
      if (!from || !to) {
        return res.status(400).json({ message: 'Missing required query params: from, to (YYYY-MM-DD)' });
      }
      const data = await analyticsService.getStaffDiscountBills(
        staffId,
        from as string,
        to as string,
        page ? parseInt(page) : undefined,
        limit ? parseInt(limit) : undefined,
        productId
      );
      return res.json(data);
    } catch (err: any) {
      console.error('Staff discount bills error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load staff discount bills' });
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
