import React, { useState, useEffect } from 'react';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useCategories } from './inventory.queries';
import type { Product } from '@/types/product.types';
import styles from './ProductForm.module.css';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: {
    name: string;
    category_id: string | null;
    price: number;
    cost_price: number;
    stock_qty?: number;
    low_stock_threshold: number;
    unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs';
  }) => void;
  loading: boolean;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, loading, onCancel }: ProductFormProps) {
  const isEditMode = !!initialData;
  const { data: categories } = useCategories();

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<string>('0');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stockQty, setStockQty] = useState<string>('0');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('5');
  const [unit, setUnit] = useState<'kg' | 'g' | 'litre' | 'ml' | 'pcs'>('pcs');

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form if initialData exists (Edit Mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategoryId(initialData.category_id || '');
      setPrice(initialData.price.toString());
      setCostPrice(initialData.cost_price?.toString() || '');
      setStockQty(initialData.stock_qty.toString());
      setLowStockThreshold(initialData.low_stock_threshold.toString());
      setUnit(initialData.unit);
    }
  }, [initialData]);

  // Form submission validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Price must be a non-negative number';
    }

    const costPriceNum = costPrice ? parseFloat(costPrice) : Math.round(priceNum * 0.95 * 100) / 100;
    if (isNaN(costPriceNum) || costPriceNum < 0) {
      newErrors.cost_price = 'Cost price must be a non-negative number';
    }

    const stockQtyNum = parseInt(stockQty);
    if (!isEditMode && (isNaN(stockQtyNum) || stockQtyNum < 0)) {
      newErrors.stock_qty = 'Initial stock quantity must be a non-negative integer';
    }

    const thresholdNum = parseInt(lowStockThreshold);
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      newErrors.low_stock_threshold = 'Threshold must be a non-negative integer';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    onSubmit({
      name: name.trim(),
      category_id: categoryId || null,
      price: priceNum,
      cost_price: costPriceNum,
      low_stock_threshold: thresholdNum,
      unit,
      ...(isEditMode ? {} : { stock_qty: stockQtyNum }),
    });
  };

  const categoryOptions = (categories || []).map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const unitOptions = [
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'litre', label: 'Litre (litre)' },
    { value: 'ml', label: 'Millilitre (ml)' },
  ];

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g. Tata Salt 1kg"
        required
      />

      <div className={styles.row}>
        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categoryOptions}
          placeholder="Uncategorized"
        />

        <Select
          label="Display Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as any)}
          options={unitOptions}
        />
      </div>

      <div className={styles.row}>
        <Input
          type="number"
          step="0.01"
          label="MRP / Sell Price (₹)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          placeholder="0.00"
          required
        />

        <Input
          type="number"
          step="0.01"
          label="Cost Price (₹)"
          value={costPrice}
          onChange={(e) => setCostPrice(e.target.value)}
          error={errors.cost_price}
          placeholder={price ? `${(parseFloat(price) * 0.95).toFixed(2)} (auto)` : '0.00'}
        />
      </div>

      <div className={styles.row}>
        <Input
          type="number"
          label="Low Stock Threshold"
          value={lowStockThreshold}
          onChange={(e) => setLowStockThreshold(e.target.value)}
          error={errors.low_stock_threshold}
          placeholder="5"
          required
        />
      </div>

      {/* Only show stock quantity field in Add Mode */}
      {!isEditMode && (
        <Input
          type="number"
          label="Initial Stock Quantity"
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
          error={errors.stock_qty}
          placeholder="0"
          required
        />
      )}

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditMode ? 'Save Product' : 'Add Product'}
        </Button>
      </div>
    </form>
  );
}
