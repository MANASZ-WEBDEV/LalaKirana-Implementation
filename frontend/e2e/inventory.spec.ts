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
    await expect(page.locator('header h1')).toHaveText('Inventory Catalog');

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

  test('should record an inbound purchase with MRP and update the product details', async ({ page }) => {
    test.setTimeout(120000);
    
    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Create a unique product for restock
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/.*inventory/, { timeout: 20000 });
    await page.getByRole('button', { name: 'Add Product' }).click();
    const productName = `E2E Restock ${Date.now()}`;
    await page.getByLabel('Product Name').fill(productName);
    await page.getByLabel('Selling Price (₹) *').fill('100.00');
    await page.getByLabel('Cost Price (₹)').fill('80.00');
    await page.getByLabel('Initial Stock Quantity').fill('10');
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page).toHaveURL(/\/inventory$/, { timeout: 60000 });

    // 3. Go to Purchases
    await page.getByRole('link', { name: 'Purchases' }).click();
    await expect(page).toHaveURL(/.*purchases/, { timeout: 20000 });

    // 4. Click Inbound Stock Purchase
    await page.getByRole('button', { name: '➕ Inbound Stock Purchase' }).click();
    await expect(page).toHaveURL(/.*purchases\/new/);

    // 5. Select/create supplier
    const supplierName = `E2E Supplier ${Date.now()}`;
    await page.getByPlaceholder('Search supplier...').fill(supplierName);
    await page.waitForTimeout(500);
    const addNewSupplier = page.locator('div[class*="dropdownMenu"] li').filter({ hasText: 'Add new supplier' }).first();
    await expect(addNewSupplier).toBeVisible();
    await addNewSupplier.click();
    // Fill in required phone number
    await page.getByPlaceholder('e.g. 9876543210').fill('9876543210');
    await page.getByRole('button', { name: 'Create & Select' }).click();
    await expect(page.getByText('created successfully')).toBeVisible({ timeout: 20000 });

    // Fill in required Reference Invoice Bill #
    await page.getByLabel('Reference Invoice Bill # *').fill('E2E-INV-9999');

    // 6. Add product to order
    await page.getByPlaceholder('Type product name to add to order...').fill(productName);
    await page.waitForTimeout(500);
    const prodItem = page.locator('ul[class*="resultsList"] li', { hasText: productName }).first();
    await expect(prodItem).toBeVisible();
    await prodItem.click();

    // 7. Update Qty, Cost Price, MRP, and Sell Price
    const row = page.locator('tbody tr', { hasText: productName }).first();
    await expect(row).toBeVisible();

    // Set qty to 5
    const qtyInput = row.locator('input[type="number"]').nth(0);
    await qtyInput.fill('5');

    // Set cost price to 90.00
    const costInput = row.locator('input[type="number"]').nth(1);
    await costInput.fill('90.00');

    // Set MRP to 130.00
    const mrpInput = row.locator('input[type="number"]').nth(2);
    await mrpInput.fill('130.00');

    // Set sell price to 110.00
    const sellInput = row.locator('input[type="number"]').nth(3);
    await sellInput.fill('110.00');

    // 8. Confirm Inbound Purchase
    await page.getByRole('button', { name: 'Confirm Inbound Purchase' }).click();
    await expect(page).toHaveURL(/\/purchases$/, { timeout: 60000 });
    await expect(page.getByText('logged and stock updated successfully')).toBeVisible({ timeout: 20000 });

    // 9. Verify product info updated in Inventory
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/.*inventory/, { timeout: 20000 });
    await page.getByPlaceholder('Search products by name...').fill(productName);
    await expect(page.getByText(productName)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('₹110.00')).toBeVisible();

    // Click Actions -> Edit Details to verify MRP and cost price
    const prodRow = page.locator('tbody tr', { hasText: productName });
    await prodRow.getByRole('button', { name: 'Actions' }).click();
    await page.getByRole('menuitem', { name: /Edit Details/ }).click();
    await expect(page).toHaveURL(/.*edit/, { timeout: 60000 });

    // Verify input values
    await expect(page.getByLabel('MRP (₹)')).toHaveValue('130');
    await expect(page.getByLabel('Selling Price (₹) *')).toHaveValue('110');
    await expect(page.getByLabel('Cost Price (₹) *')).toHaveValue('90');
  });
});
