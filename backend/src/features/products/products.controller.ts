import { Request, Response } from 'express';
import { productsService } from './products.service.js';

export const productsController = {
  getAllProducts: async (req: Request, res: Response) => {
    try {
      const filters = {
        category_id: req.query.category_id as string | undefined,
        search: req.query.search as string | undefined,
        low_stock: req.query.low_stock === 'true',
      };
      
      const includeInactive = req.user?.role === 'owner';
      let products = await productsService.getAllProducts(filters, includeInactive);
      if (req.user?.role !== 'owner') {
        products = products.map((p) => ({ ...p, cost_price: null }));
      }
      return res.json(products);
    } catch (err: any) {
      console.error('Get all products error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load products' });
    }
  },

  getProductById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const product = await productsService.getProductById(id);
      if (req.user?.role !== 'owner') {
        product.cost_price = null as any;
      }
      return res.json(product);
    } catch (err: any) {
      console.error('Get product by ID error:', err);
      return res.status(404).json({ message: err.message || 'Product not found' });
    }
  },

  createProduct: async (req: Request, res: Response) => {
    try {
      const product = await productsService.createProduct(req.body);
      if (req.user?.role !== 'owner') {
        product.cost_price = null as any;
      }
      return res.status(201).json(product);
    } catch (err: any) {
      console.error('Create product error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create product' });
    }
  },

  updateProduct: async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'owner' && req.body.hasOwnProperty('is_active')) {
        return res.status(403).json({ message: 'Forbidden: Staff cannot update active status of a product' });
      }
      const id = req.params.id as string;
      const userId = req.user!.id;
      const product = await productsService.updateProduct(id, req.body, userId);
      if (req.user?.role !== 'owner') {
        product.cost_price = null as any;
      }
      return res.json(product);
    } catch (err: any) {
      console.error('Update product error:', err);
      return res.status(400).json({ message: err.message || 'Failed to update product' });
    }
  },

  softDeleteProduct: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const product = await productsService.softDeleteProduct(id);
      return res.json({ message: 'Product deactivated successfully', product });
    } catch (err: any) {
      console.error('Delete product error:', err);
      return res.status(400).json({ message: err.message || 'Failed to deactivate product' });
    }
  },

  bulkUpdatePrices: async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      const userId = req.user!.id;
      const updatedProducts = await productsService.bulkUpdatePrices(items, userId);
      return res.json({
        message: `Successfully updated ${updatedProducts.length} product prices`,
        count: updatedProducts.length,
      });
    } catch (err: any) {
      console.error('Bulk update prices error:', err);
      return res.status(400).json({ message: err.message || 'Failed to bulk update prices' });
    }
  },

  getCategories: async (_req: Request, res: Response) => {
    try {
      const categories = await productsService.getCategories();
      return res.json(categories);
    } catch (err: any) {
      console.error('Get categories error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load categories' });
    }
  },

  createCategory: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }
      const category = await productsService.createCategory(name);
      return res.status(201).json(category);
    } catch (err: any) {
      console.error('Create category error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create category' });
    }
  },

  updateCategory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Category name is required' });
      }
      const category = await productsService.updateCategory(id, name);
      return res.json(category);
    } catch (err: any) {
      console.error('Update category error:', err);
      return res.status(400).json({ message: err.message || 'Failed to update category' });
    }
  },

  deleteCategory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const result = await productsService.deleteCategory(id);
      return res.json(result);
    } catch (err: any) {
      console.error('Delete category error:', err);
      return res.status(400).json({ message: err.message || 'Failed to delete category' });
    }
  },

  getPriceHistory: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const history = await productsService.getPriceHistory(id);
      return res.json(history);
    } catch (err: any) {
      console.error('Get price history error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load price history' });
    }
  },

  getStockLog: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const log = await productsService.getStockHistory(id);
      return res.json(log);
    } catch (err: any) {
      console.error('Get stock log error:', err);
      return res.status(500).json({ message: err.message || 'Failed to load stock log' });
    }
  },
};
