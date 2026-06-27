import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSettingsCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './settings.queries';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useToastStore } from '@/shared/store/toastStore';
import { CategoryActionMenu } from './CategoryActionMenu';
import type { Category } from '@/types/product.types';
import styles from './CategoriesTab.module.css';

export function CategoriesTab() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);

  // Queries & Mutations
  const { data: categories = [], isLoading } = useSettingsCategories();
  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();
  const deleteCategoryMutation = useDeleteCategory();

  // Local States
  const [newCatName, setNewCatName] = useState('');
  const [renamingCategory, setRenamingCategory] = useState<Category | null>(null);
  const [renamedName, setRenamedName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Handlers
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

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingCategory || !renamedName.trim()) return;
    try {
      await updateCategoryMutation.mutateAsync({
        id: renamingCategory.id,
        name: renamedName.trim(),
      });
      addToast('success', `Category renamed to "${renamedName.trim()}"`);
      setRenamingCategory(null);
      setRenamedName('');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to rename category');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategoryMutation.mutateAsync(deletingCategory.id);
      addToast('success', `Category "${deletingCategory.name}" deleted`);
      setDeletingCategory(null);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleViewProducts = (cat: Category) => {
    navigate(`/inventory?category=${encodeURIComponent(cat.name)}`);
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
            <div className={styles.categoryCardRight}>
              <span className={styles.categoryDate}>
                {new Date(cat.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <CategoryActionMenu
                category={cat}
                onRename={(c) => {
                  setRenamingCategory(c);
                  setRenamedName(c.name);
                }}
                onViewProducts={handleViewProducts}
                onDelete={(c) => setDeletingCategory(c)}
              />
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className={styles.emptyText}>No categories yet. Add one above.</div>
        )}
      </div>

      {/* Rename Dialog Modal */}
      {renamingCategory && (
        <Modal
          isOpen={renamingCategory !== null}
          onClose={() => {
            setRenamingCategory(null);
            setRenamedName('');
          }}
          title={`Rename Category "${renamingCategory.name}"`}
          maxWidth="400px"
        >
          <form onSubmit={handleRenameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <Input
              id="rename-category-input"
              label="New Name"
              value={renamedName}
              onChange={(e) => setRenamedName(e.target.value)}
              required
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setRenamingCategory(null);
                  setRenamedName('');
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={updateCategoryMutation.isPending} disabled={!renamedName.trim()}>
                Rename
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deletingCategory && (
        <Modal
          isOpen={deletingCategory !== null}
          onClose={() => setDeletingCategory(null)}
          title={`Delete Category "${deletingCategory.name}"`}
          maxWidth="450px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
            <p style={{ color: 'var(--color-error)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Warning: Deleting this category will remove it from all products. Products will remain in inventory but will no longer be classified under this category. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setDeletingCategory(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteSubmit}
                loading={deleteCategoryMutation.isPending}
              >
                Delete Category
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
