import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts, useCategories, useSoftDeleteProduct } from './inventory.queries';
import { CategoryTabs } from './CategoryTabs';
import { ProductActionMenu } from './ProductActionMenu';
import { PriceAgeBadge } from './PriceAgeBadge';
import { PriceHistoryModal } from './PriceHistoryModal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Badge } from '@/shared/ui/Badge';
import { Skeleton } from '@/shared/ui/Skeleton';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { StockAdjustDrawer } from './StockAdjustDrawer';
import { DataTable } from '@/shared/ui/DataTable';
import type { ColumnConfig } from '@/shared/ui/DataTable';
import { useToastStore } from '@/shared/store/toastStore';
import type { Product } from '@/types/product.types';
import styles from './InventoryPage.module.css';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);

  // Queries
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();

  // Mutations
  const deactivateMutation = useSoftDeleteProduct();

  // State / URL Params
  const stockFilter = (searchParams.get('status') as 'all' | 'in' | 'low' | 'out') || 'all';
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  const categoryParam = searchParams.get('category');

  useEffect(() => {
    if (categoryParam && categories && categories.length > 0) {
      const matched = categories.find((c) => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (matched) {
        setSelectedCategory(matched.id);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('category');
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [categoryParam, categories, searchParams, setSearchParams]);

  const setStockFilter = (val: string) => {
    setSearchParams((prev) => {
      if (val === 'all') {
        prev.delete('status');
      } else {
        prev.set('status', val);
      }
      return prev;
    });
  };

  // Action overlays state
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [viewingHistoryProduct, setViewingHistoryProduct] = useState<Product | null>(null);



  // Deactivation handler
  const handleDeactivate = async () => {
    if (!deactivatingProduct) return;
    try {
      await deactivateMutation.mutateAsync(deactivatingProduct.id);
      addToast('success', `Product "${deactivatingProduct.name}" deactivated successfully`);
      setDeactivatingProduct(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to deactivate product');
    }
  };



  const noCostFilter = searchParams.get('no_cost') === 'true';

  // Filter products client-side
  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesNoCost = !noCostFilter || p.cost_price === null || p.cost_price === undefined || Number(p.cost_price) === 0;

    let matchesStock = true;
    if (stockFilter === 'out') {
      matchesStock = p.stock_qty === 0;
    } else if (stockFilter === 'low') {
      matchesStock = p.stock_qty > 0 && p.stock_qty <= p.low_stock_threshold;
    } else if (stockFilter === 'in') {
      matchesStock = p.stock_qty > p.low_stock_threshold;
    }

    return matchesCategory && matchesSearch && matchesStock && matchesNoCost;
  });

  const isLoading = productsLoading || categoriesLoading;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  // Columns definition
  const columns: ColumnConfig<Product>[] = [
    {
      key: 'name',
      header: 'Product Name',
      render: (p) => (
        <div className={styles.productNameCol} style={!p.is_active ? { opacity: 0.5 } : undefined}>
          <span className={styles.productName}>{p.name}</span>
          <span className={styles.unit}>{p.unit}</span>
        </div>
      ),
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (p) => (
        <span style={!p.is_active ? { opacity: 0.5 } : undefined}>
          {p.category_name || <span style={{ opacity: 0.5 }}>Uncategorized</span>}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: !p.is_active ? 0.5 : 1 }}>
          <span className={styles.price}>{formatCurrency(p.price)}</span>
          <PriceAgeBadge priceUpdatedAt={p.price_updated_at} categoryName={p.category_name} />
        </div>
      ),
    },
    {
      key: 'stock_qty',
      header: 'Stock Level',
      align: 'right',
      render: (p) => {
        if (!p.is_active) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
              <span className={styles.stockCol} style={{ opacity: 0.5 }}>
                {p.stock_qty} {p.unit}
              </span>
              <Badge variant="neutral">Inactive</Badge>
            </div>
          );
        }
        const isOutOfStock = p.stock_qty === 0;
        const isLowStock = p.stock_qty <= p.low_stock_threshold;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span className={styles.stockCol}>
              {p.stock_qty} {p.unit}
            </span>
            {isOutOfStock ? (
              <Badge variant="error">Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="warning">Low Stock</Badge>
            ) : (
              <Badge variant="success">In Stock</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'center',
      render: (p) => (
        <ProductActionMenu
          product={p}
          onEdit={(prod) => navigate(`/inventory/${prod.id}/edit`)}
          onAdjustStock={(prod) => setAdjustingProduct(prod)}
          onViewHistory={(prod) => setViewingHistoryProduct(prod)}
          onDeactivate={(prod) => setDeactivatingProduct(prod)}
        />
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Inventory Catalog</h1>
          <p className={styles.subtitle}>Manage product details, stock thresholds, and price changes.</p>
        </div>
        <Button onClick={() => navigate('/inventory/new')}>
          ➕ Add Product
        </Button>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterWrapper}>
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Stock Levels' },
              { value: 'in', label: 'In Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingWrapper}>
          <Skeleton width="100%" height={50} />
          <Skeleton width="100%" height={300} />
        </div>
      ) : (
        <>
          {noCostFilter && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#d97706',
              fontWeight: 500
            }}>
              <span>⚠️ Showing only products missing Cost Price information.</span>
              <button 
                onClick={() => setSearchParams(prev => { prev.delete('no_cost'); return prev; })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                Show All Products
              </button>
            </div>
          )}

          <CategoryTabs
            categories={categories || []}
            activeCategoryId={selectedCategory}
            onChange={setSelectedCategory}
          />

          <div className={styles.tableCard}>
            <DataTable
              columns={columns}
              data={filteredProducts}
              rowKey={(p) => p.id}
              emptyState={
                <EmptyState
                  heading="No Products Found"
                  subtext={
                    searchQuery || selectedCategory || stockFilter !== 'all' || noCostFilter
                      ? "Try clearing your search query, category, or active filters."
                      : "Start seeding products into the database store catalog."
                  }
                  actionText={searchQuery || selectedCategory || stockFilter !== 'all' || noCostFilter ? "Reset Filters" : "Add Product"}
                  onAction={() => {
                    if (searchQuery || selectedCategory || stockFilter !== 'all' || noCostFilter) {
                      setSearchQuery('');
                      setSelectedCategory(undefined);
                      setStockFilter('all');
                      setSearchParams(prev => { prev.delete('no_cost'); return prev; });
                    } else {
                      navigate('/inventory/new');
                    }
                  }}
                />
              }
            />
          </div>
        </>
      )}

      {/* Price History Modal */}
      {viewingHistoryProduct && (
        <PriceHistoryModal
          productId={viewingHistoryProduct.id}
          productName={viewingHistoryProduct.name}
          isOpen={viewingHistoryProduct !== null}
          onClose={() => setViewingHistoryProduct(null)}
        />
      )}

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={deactivatingProduct !== null}
        onClose={() => setDeactivatingProduct(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Product"
        loading={deactivateMutation.isPending}
        message={`Are you sure you want to deactivate ${deactivatingProduct?.name || ''}? This will soft delete it, hiding it from catalog operations.`}
        isDanger
      />

      {/* Adjust Stock Drawer */}
      <StockAdjustDrawer
        isOpen={adjustingProduct !== null}
        onClose={() => setAdjustingProduct(null)}
        product={adjustingProduct}
      />
    </div>
  );
}
