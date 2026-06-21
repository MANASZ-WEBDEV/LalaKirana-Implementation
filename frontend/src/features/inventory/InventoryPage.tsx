import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts, useCategories, useSoftDeleteProduct } from './inventory.queries';
import { CategoryTabs } from './CategoryTabs';
import { ProductActionMenu } from './ProductActionMenu';
import { PriceAgeBadge } from './PriceAgeBadge';
import { PriceHistoryModal } from './PriceHistoryModal';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
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
  const addToast = useToastStore((s) => s.addToast);

  // Queries
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  // Mutations
  const deactivateMutation = useSoftDeleteProduct();

  // State
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  
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



  // Filter products client-side
  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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
          <PriceAgeBadge priceUpdatedAt={p.price_updated_at} />
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
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Skeleton width="100%" height={50} />
          <Skeleton width="100%" height={300} />
        </div>
      ) : (
        <>
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
                    searchQuery || selectedCategory
                      ? "Try clearing your search query or category filters."
                      : "Start seeding products into the database store catalog."
                  }
                  actionText={searchQuery || selectedCategory ? "Reset Filters" : "Add Product"}
                  onAction={() => {
                    if (searchQuery || selectedCategory) {
                      setSearchQuery('');
                      setSelectedCategory(undefined);
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
