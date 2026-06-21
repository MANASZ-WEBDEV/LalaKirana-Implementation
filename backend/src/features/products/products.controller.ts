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
      const products = await productsService.getAllProducts(filters, includeInactive);
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
      return res.json(product);
    } catch (err: any) {
      console.error('Get product by ID error:', err);
      return res.status(404).json({ message: err.message || 'Product not found' });
    }
  },

  createProduct: async (req: Request, res: Response) => {
    try {
      const product = await productsService.createProduct(req.body);
      return res.status(201).json(product);
    } catch (err: any) {
      console.error('Create product error:', err);
      return res.status(400).json({ message: err.message || 'Failed to create product' });
    }
  },

  updateProduct: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const product = await productsService.updateProduct(id, req.body, userId);
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
};
