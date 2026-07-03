import React, { useState, useMemo } from 'react';
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
    low_stock_threshold: number;
    unit: 'kg' | 'g' | 'litre' | 'ml' | 'pcs';
    is_loose: boolean;
    quick_weight_prices?: Record<string, number>;
    stock_qty?: number;
  }) => void;
  loading: boolean;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSubmit, loading, onCancel }: ProductFormProps) {
  const isEditMode = !!initialData;
  const { data: categories } = useCategories();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'owner' || user?.role === 'master';

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [price, setPrice] = useState<string>(initialData ? initialData.price.toString() : '0');
  const [costPrice, setCostPrice] = useState<string>(initialData?.cost_price?.toString() || '');
  const [mrp, setMrp] = useState<string>(initialData?.mrp?.toString() || '');
  const [stockQty, setStockQty] = useState<string>(initialData ? initialData.stock_qty.toString() : '0');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(initialData ? initialData.low_stock_threshold.toString() : '5');
  const [unit, setUnit] = useState<'kg' | 'g' | 'litre' | 'ml' | 'pcs'>(initialData?.unit || 'pcs');
  const [isLoose, setIsLoose] = useState<boolean>(initialData?.is_loose || false);
  // Standard preset keys
  const STANDARD_PRESETS = ['0.05', '0.1', '0.25', '0.5', '1', '2'];

  const [quickWeightPrices, setQuickWeightPrices] = useState<Record<string, string>>(() => {
    const initial = initialData?.quick_weight_prices || {};
    const state: Record<string, string> = {};
    // Seed standard presets
    for (const key of STANDARD_PRESETS) {
      state[key] = initial[key]?.toString() || '';
    }
    // Seed any custom keys from existing data, excluding under_1kg_rate
    for (const key of Object.keys(initial)) {
      if (!STANDARD_PRESETS.includes(key) && key !== 'under_1kg_rate') {
        state[key] = initial[key]?.toString() || '';
      }
    }
    return state;
  });

  const [under1kgRate, setUnder1kgRate] = useState<string>(
    initialData?.quick_weight_prices?.under_1kg_rate?.toString() || ''
  );

  // Custom weight addition state
  const [customWeightGrams, setCustomWeightGrams] = useState('');
  const [customWeightError, setCustomWeightError] = useState('');

  // Sorted list of all configured weight keys (excluding under_1kg_rate)
  const sortedWeightKeys = useMemo(
    () =>
      Object.keys(quickWeightPrices)
        .filter((key) => key !== 'under_1kg_rate')
        .sort((a, b) => parseFloat(a) - parseFloat(b)),
    [quickWeightPrices]
  );

  const handleAddCustomWeight = () => {
    setCustomWeightError('');
    const grams = parseFloat(customWeightGrams);
    if (isNaN(grams) || grams <= 0) {
      setCustomWeightError('Enter a positive weight in grams');
      return;
    }
    const kgKey = (grams / 1000).toString();
    if (quickWeightPrices[kgKey] !== undefined) {
      setCustomWeightError(`${grams}g already exists`);
      return;
    }
    setQuickWeightPrices((prev) => ({ ...prev, [kgKey]: '' }));
    setCustomWeightGrams('');
  };

  const handleRemoveCustomWeight = (key: string) => {
    setQuickWeightPrices((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  // Helper: format kg key to display label
  const formatWeightLabel = (kgKey: string): string => {
    const kg = parseFloat(kgKey);
    if (kg >= 1) return `${kg}kg`;
    return `${Math.round(kg * 1000)}g`;
  };

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

    const stockQtyNum = parseFloat(stockQty);
    if (!isEditMode && (isNaN(stockQtyNum) || stockQtyNum < 0)) {
      newErrors.stock_qty = 'Initial stock quantity must be a non-negative number';
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

    const finalQuickPrices: Record<string, number> = {};
    if (isLoose) {
      Object.entries(quickWeightPrices).forEach(([w, pStr]) => {
        if (pStr.trim()) {
          const val = parseFloat(pStr);
          if (!isNaN(val) && val >= 0) {
            finalQuickPrices[w] = val;
          }
        }
      });
      if (under1kgRate.trim()) {
        const val = parseFloat(under1kgRate);
        if (!isNaN(val) && val >= 0) {
          finalQuickPrices['under_1kg_rate'] = val;
        }
      }
    }

    onSubmit({
      name: name.trim(),
      category_id: categoryId || null,
      price: priceNum,
      cost_price: costPriceNum,
      mrp: mrpNum,
      low_stock_threshold: thresholdNum,
      unit,
      is_loose: isLoose,
      quick_weight_prices: isLoose ? finalQuickPrices : {},
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

      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={isLoose}
            onChange={(e) => setIsLoose(e.target.checked)}
            className={styles.checkbox}
          />
          <span>Loose / Weight-Based Item (sold in grams/kg/litres)</span>
        </label>
      </div>

      {isLoose && (
        <div className={styles.flatPricesContainer}>
          <h3 className={styles.flatPricesTitle}>Quick-Weight Preset Fixed Prices (₹)</h3>
          <p className={styles.flatPricesSubtitle}>
            Set flat prices for weight presets. These appear as quick-select pills during billing. Blank fields fall back to linear pricing.
          </p>

          <div className={styles.flatPricesGrid}>
            {sortedWeightKeys.map((key) => (
              <div key={key} className={styles.flatPriceItem}>
                <div className={styles.customWeightHeader}>
                  <label className={styles.flatPriceLabel}>{formatWeightLabel(key)}</label>
                  <button
                    type="button"
                    className={styles.removeCustomBtn}
                    onClick={() => handleRemoveCustomWeight(key)}
                    title="Remove this weight"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quickWeightPrices[key] || ''}
                  onChange={(e) => {
                    setQuickWeightPrices((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }));
                  }}
                  className={styles.flatPriceInput}
                  placeholder="Base price"
                />
              </div>
            ))}
          </div>

          {/* Add custom weight row */}
          <div className={styles.addCustomRow}>
            <div className={styles.addCustomInputGroup}>
              <input
                type="number"
                step="1"
                min="1"
                value={customWeightGrams}
                onChange={(e) => { setCustomWeightGrams(e.target.value); setCustomWeightError(''); }}
                className={styles.addCustomInput}
                placeholder="e.g. 125, 350"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomWeight(); } }}
              />
              <span className={styles.addCustomUnit}>g</span>
            </div>
            <button
              type="button"
              className={styles.addCustomBtn}
              onClick={handleAddCustomWeight}
            >
              + Add Weight
            </button>
          </div>
          {customWeightError && <span className={styles.customWeightError}>{customWeightError}</span>}

          {/* Under 1kg Custom Fallback Rate */}
          <div className={styles.fallbackRateDivider} />
          <div className={styles.fallbackRateRow}>
            <div className={styles.flatPriceItem}>
              <label className={styles.fallbackRateLabel}>
                Under 1kg/1L Custom Fallback Rate (₹/unit)
              </label>
              <p className={styles.fallbackRateHelper}>
                If configured, any custom weights typed under 1kg/1L will use this rate per unit (e.g. ₹1000/kg) instead of the base selling price.
              </p>
              <input
                type="number"
                step="0.01"
                min="0"
                value={under1kgRate}
                onChange={(e) => setUnder1kgRate(e.target.value)}
                className={styles.fallbackRateInput}
                placeholder="Linear fallback (uses Base Price)"
              />
            </div>
          </div>
        </div>
      )}

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
