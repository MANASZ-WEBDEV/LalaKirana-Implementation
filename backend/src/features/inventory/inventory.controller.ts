import { Request, Response } from 'express';
import { inventoryService } from './inventory.service.js';

export const inventoryController = {
  adjustStock: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const updatedProduct = await inventoryService.adjustStock(id, req.body, userId);
      return res.json({
        message: 'Stock adjusted successfully',
        product: updatedProduct,
      });
    } catch (err: any) {
      console.error('Adjust stock error:', err);
      return res.status(400).json({ message: err.message || 'Failed to adjust stock' });
    }
  },

  getEODEntry: async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string;
      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required (format YYYY-MM-DD)' });
      }
      const entries = await inventoryService.getEODEntry(date);
      return res.json(entries);
    } catch (err: any) {
      console.error('Get EOD entry error:', err);
      return res.status(500).json({ message: err.message || 'Failed to fetch EOD entry' });
    }
  },

  submitEODEntry: async (req: Request, res: Response) => {
    try {
      const { entry_date, items } = req.body;
      const userId = req.user!.id;
      const updatedEntries = await inventoryService.submitEODEntry(entry_date, items, userId);
      return res.status(201).json({
        message: `Successfully processed EOD entries for ${entry_date}`,
        count: updatedEntries.length,
        entries: updatedEntries,
      });
    } catch (err: any) {
      console.error('Submit EOD entry error:', err);
      return res.status(400).json({ message: err.message || 'Failed to process EOD entry' });
    }
  },
};
