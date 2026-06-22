import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRoutes from './features/auth/auth.routes.js';
import productRoutes from './features/products/products.routes.js';
import inventoryRoutes from './features/inventory/inventory.routes.js';
import reportRoutes from './features/reports/reports.routes.js';
import analyticsRoutes from './features/analytics/analytics.routes.js';
import billingRoutes from './features/billing/billing.routes.js';
import khataRoutes from './features/khata/khata.routes.js';
import purchaseRoutes from './features/purchases/purchases.routes.js';
import storeSettingsRoutes from './features/settings/settings.routes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/customers', khataRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/settings', storeSettingsRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'LalaKirana API is online' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
});

export default app;
