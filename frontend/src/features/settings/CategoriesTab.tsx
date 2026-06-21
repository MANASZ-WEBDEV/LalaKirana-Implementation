import { useState } from 'react';
import { useSettingsCategories, useCreateCategory } from './settings.queries';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { useToastStore } from '@/shared/store/toastStore';
import styles from './CategoriesTab.module.css';

export function CategoriesTab() {
  const { data: categories = [], isLoading } = useSettingsCategories();
  const createCategoryMutation = useCreateCategory();
  const addToast = useToastStore((s) => s.addToast);
  const [newCatName, setNewCatName] = useState('');

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    try {
      await createCategoryMutation.mutateAsync(newCatName.trim());
      addToast('success', `Category "${newCatName.trim()}" created`);
      setNewCatName('');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to create category');
    }
  };

  if (isLoading) {
    return <div className={styles.loadingText}>Loading categories...</div>;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Product Categories</h2>

      <div className={styles.addRow}>
        <div className={styles.addInput}>
          <Input
            id="new-category"
            label="New Category Name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g., Beverages"
          />
        </div>
        <Button
          variant="primary"
          onClick={handleCreate}
          loading={createCategoryMutation.isPending}
          disabled={!newCatName.trim()}
        >
          + Add Category
        </Button>
      </div>

      <div className={styles.categoryList}>
        {categories.map((cat) => (
          <div key={cat.id} className={styles.categoryCard}>
            <span className={styles.categoryName}>{cat.name}</span>
            <span className={styles.categoryDate}>
              {new Date(cat.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        ))}
        {categories.length === 0 && (
          <div className={styles.emptyText}>No categories yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
