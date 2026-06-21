import { useParams, useNavigate } from 'react-router-dom';
import { ProductForm } from './ProductForm';
import { useProduct, useCreateProduct, useUpdateProduct } from './inventory.queries';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './ProductFormPage.module.css';

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  const isEditMode = !!id;

  // Queries & Mutations
  const { data: product, isLoading: isProductLoading } = useProduct(id || '', {
    enabled: isEditMode,
  });

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const handleFormSubmit = async (formData: any) => {
    try {
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id, data: formData });
        addToast('success', 'Product updated successfully');
      } else {
        await createMutation.mutateAsync(formData);
        addToast('success', 'Product created successfully');
      }
      navigate('/inventory');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || err.message || 'An error occurred');
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  if (isEditMode && isProductLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Skeleton width={200} height={36} />
          <Skeleton width={320} height={20} />
        </div>
        <div className={styles.skeletonContainer}>
          <Skeleton height={50} />
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{isEditMode ? 'Edit Product' : 'Add New Product'}</h1>
        <p className={styles.subtitle}>
          {isEditMode
            ? `Modify settings for ${product?.name || 'product'}`
            : 'Register a new item into the store catalog.'}
        </p>
      </div>

      <ProductForm
        initialData={product}
        onSubmit={handleFormSubmit}
        loading={loading}
        onCancel={() => navigate('/inventory')}
      />
    </div>
  );
}
