import { test, expect } from '@playwright/test';

test.describe('Inventory Flow', () => {
  test('should login, add a new product, search for it, and edit it', async ({ page }) => {
    test.setTimeout(120000);
    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Go to Inventory Page
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/.*inventory/, { timeout: 20000 });
    await expect(page.locator('main h1')).toHaveText('Inventory Catalog');

    // 3. Click "Add Product"
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page).toHaveURL(/.*inventory\/new/);

    // 4. Fill in product details
    const uniqueProductName = `E2E Auto Oil ${Math.floor(Math.random() * 10000)}`;
    await page.getByLabel('Product Name').fill(uniqueProductName);
    await page.getByLabel('Selling Price (₹) *').fill('175.50');
    await page.getByLabel('Cost Price (₹)').fill('150.00');
    await page.getByLabel('Low Stock Threshold').fill('10');
    await page.getByLabel('Initial Stock Quantity').fill('50');

    // 5. Submit form
    await page.getByRole('button', { name: 'Add Product' }).click();

    // 6. Verify redirection to catalog and product appears
    await expect(page).toHaveURL(/.*inventory/, { timeout: 60000 });
    await page.getByPlaceholder('Search products by name...').fill(uniqueProductName);
    await expect(page.getByText(uniqueProductName)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('₹175.50')).toBeVisible();

    // 7. Click Actions Menu -> Edit Details for our created product
    const productRow = page.locator('tbody tr', { hasText: uniqueProductName });
    await productRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: /Edit Details/ }).click();
    await expect(page).toHaveURL(/.*edit/, { timeout: 60000 });

    // 8. Modify Price
    await page.getByLabel('Selling Price (₹) *').fill('185.00');
    await page.getByRole('button', { name: 'Save Product' }).click();

    // 9. Verify price updated in list
    await expect(page).toHaveURL(/.*inventory/, { timeout: 60000 });
    await page.getByPlaceholder('Search products by name...').fill(uniqueProductName);
    await expect(page.getByText(uniqueProductName)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('₹185.00')).toBeVisible();
  });
});
