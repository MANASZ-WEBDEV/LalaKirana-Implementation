import React, { useState } from 'react';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { useCategories } from './inventory.queries';
import { useAuthStore } from '@/shared/store/authStore';
import type { Product } from '@/types/product.types';
import styles from './ProductForm.module.css';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: {
    name: string;
    category_id: string | null;
    price: number;
    cost_price: number;
    mrp: number | null;
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
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner';

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [price, setPrice] = useState<string>(initialData ? initialData.price.toString() : '0');
  const [costPrice, setCostPrice] = useState<string>(initialData?.cost_price?.toString() || '');
  const [mrp, setMrp] = useState<string>(initialData?.mrp?.toString() || '');
  const [stockQty, setStockQty] = useState<string>(initialData ? initialData.stock_qty.toString() : '0');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(initialData ? initialData.low_stock_threshold.toString() : '5');
  const [unit, setUnit] = useState<'kg' | 'g' | 'litre' | 'ml' | 'pcs'>(initialData?.unit || 'pcs');

  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    let costPriceNum = 0;
    if (isOwner) {
      if (!costPrice.trim()) {
        newErrors.cost_price = 'Cost price is required';
      }
      costPriceNum = parseFloat(costPrice);
      if (isNaN(costPriceNum) || costPriceNum < 0) {
        newErrors.cost_price = 'Cost price must be a non-negative number';
      }
    } else {
      costPriceNum = initialData?.cost_price || priceNum;
    }

    let mrpNum: number | null = null;
    if (mrp.trim()) {
      const parsedMrp = parseFloat(mrp);
      if (isNaN(parsedMrp) || parsedMrp < 0) {
        newErrors.mrp = 'MRP must be a non-negative number';
      } else {
        mrpNum = parsedMrp;
      }
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
      mrp: mrpNum,
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
      {isEditMode && (
        <div className={styles.editNotice}>
          <svg
            className={styles.noticeIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            For daily price changes, use <strong>Bulk Price Update</strong> from the dashboard.
          </span>
        </div>
      )}

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
          onChange={(e) => setUnit(e.target.value as 'kg' | 'g' | 'litre' | 'ml' | 'pcs')}
          options={unitOptions}
        />
      </div>

      <div className={styles.row}>
        <Input
          type="number"
          step="0.01"
          label="Selling Price (₹) *"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          error={errors.price}
          placeholder="0.00"
          helperText="What you charge the customer"
          required
        />

        <Input
          type="number"
          step="0.01"
          label="MRP (₹)"
          value={mrp}
          onChange={(e) => setMrp(e.target.value)}
          error={errors.mrp}
          placeholder="0.00"
          helperText="Printed on packet. Leave blank if unknown."
        />
      </div>

      {mrp && price && parseFloat(mrp) > parseFloat(price) && !errors.price && !errors.mrp && (
        <div className={styles.marginPreview}>
          Customer saves ₹{(parseFloat(mrp) - parseFloat(price)).toFixed(2)} per unit 
          ({Math.round(((parseFloat(mrp) - parseFloat(price)) / parseFloat(mrp)) * 100)}% below MRP)
        </div>
      )}

      <div className={styles.row}>
        {isOwner && (
          <Input
            type="number"
            step="0.01"
            label="Cost Price (₹) *"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            error={errors.cost_price}
            placeholder="0.00"
            required
          />
        )}

        <Input
          type="number"
          label="Low Stock Threshold *"
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
