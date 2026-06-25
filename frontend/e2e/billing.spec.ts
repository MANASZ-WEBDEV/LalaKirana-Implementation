import { test, expect } from '@playwright/test';

test.describe('Billing and Khata E2E Flow', () => {
  test('should enforce stock clamping, reject Khata checkouts without customers, and log repayments correctly', async ({ page }) => {
    test.setTimeout(120000);
    // Listen to console and page errors for debugging
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Go to Inventory Page to create two test products:
    // Product A: 5 in stock
    // Product B: 0 in stock (out of stock)
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/.*inventory/);

    // Add Product A (Stocked)
    await page.getByRole('button', { name: 'Add Product' }).click();
    const prodAName = `E2E Stocked ${Date.now()}`;
    await page.getByLabel('Product Name').fill(prodAName);
    await page.getByLabel('Selling Price (₹) *').fill('100.00');
    await page.getByLabel('Cost Price (₹)').fill('80.00');
    await page.getByLabel('Low Stock Threshold').fill('2');
    await page.getByLabel('Initial Stock Quantity').fill('5');
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page).toHaveURL(/\/inventory$/, { timeout: 60000 });

    // Add Product B (Out of stock)
    await page.getByRole('button', { name: 'Add Product' }).click();
    const prodBName = `E2E OutOfStock ${Date.now()}`;
    await page.getByLabel('Product Name').fill(prodBName);
    await page.getByLabel('Selling Price (₹) *').fill('50.00');
    await page.getByLabel('Cost Price (₹)').fill('40.00');
    await page.getByLabel('Low Stock Threshold').fill('2');
    await page.getByLabel('Initial Stock Quantity').fill('0');
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page).toHaveURL(/\/inventory$/, { timeout: 60000 });

    // 3. Go to Billing Page
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/.*billing/, { timeout: 20000 });

    // 4. Test Out-of-Stock selection blocking
    await page.getByPlaceholder('Type product name or scan barcode...').fill(prodBName);
    await page.waitForTimeout(500);
    const outOfStockResult = page.locator('ul[class*="resultsList"] li', { hasText: prodBName }).first();
    await expect(outOfStockResult).toBeVisible();
    await page.getByPlaceholder('Type product name or scan barcode...').press('ArrowDown');
    await expect(outOfStockResult).toHaveClass(/.*activeItem.*/);
    await page.getByPlaceholder('Type product name or scan barcode...').press('Enter');

    // The cart should remain empty because Product B is out of stock
    await expect(page.getByText('Cart is empty')).toBeVisible();

    // Clear product B search
    await page.locator('button[class*="clearBtn"]').click();

    // 5. Add Product A to Cart
    await page.getByPlaceholder('Type product name or scan barcode...').fill(prodAName);
    await page.waitForTimeout(500);
    const stockedResult = page.locator('ul[class*="resultsList"] li', { hasText: prodAName }).first();
    await expect(stockedResult).toBeVisible();
    await page.getByPlaceholder('Type product name or scan barcode...').press('ArrowDown');
    await expect(stockedResult).toHaveClass(/.*activeItem.*/);
    await page.getByPlaceholder('Type product name or scan barcode...').press('Enter');

    // Verify Product A is added to the cart
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr td').first()).toContainText(prodAName);

    // 6. Test Quantity Clamping (Stock is 5, try to increase to 6)
    for (let i = 0; i < 6; i++) {
      await page.locator('button:has-text("+")').click();
    }
    // Quantity should be clamped at 5
    await expect(page.locator('input[class*="qtyInput"]')).toHaveValue('5');

    // 7. Test Customer Linking in Paid Flow
    await page.getByRole('button', { name: '💰 Paid (Cash/UPI)' }).click();

    // Create a new customer inside the Search using keyboard navigation
    const custName = `E2E Cust ${Date.now()}`;
    await page.getByPlaceholder('Search customer name...').fill(custName);
    await page.waitForTimeout(500);
    const addNewResult = page.locator('div[class*="dropdownMenu"] li').filter({ hasText: 'Add new customer' }).first();
    await expect(addNewResult).toBeVisible();
    await page.getByPlaceholder('Search customer name...').press('ArrowDown');
    await expect(addNewResult).toHaveClass(/.*activeItem.*/);
    await page.getByPlaceholder('Search customer name...').press('Enter');
    await page.getByPlaceholder('e.g. 9876543210').fill('9876543210');
    await page.getByRole('button', { name: 'Create & Select' }).click();

    // Verify linked customer tag
    await expect(page.getByText(`Linked: ${custName}`)).toBeVisible();

    // Unlink the customer
    await page.locator('button[class*="unlinkBtn"]').click();
    await expect(page.getByText(`Linked: ${custName}`)).not.toBeVisible();

    // Cancel out of Paid drawer
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 8. Test Khata Flow Restriction and confirmation
    await page.getByRole('button', { name: 'Book to Khata' }).click();

    // Confirm button should be disabled when no customer is selected
    const confirmBtn = page.getByRole('button', { name: 'Confirm & Print' });
    await expect(confirmBtn).toBeDisabled();

    // Search and select our customer using keyboard
    await page.getByPlaceholder('Search ledger accounts...').fill(custName);
    await page.waitForTimeout(500);
    const customerResult = page.locator('ul[class*="resultsList"] li').filter({ hasText: custName }).filter({ hasNotText: 'Add new customer' }).first();
    await expect(customerResult).toBeVisible();
    await page.getByPlaceholder('Search ledger accounts...').press('ArrowDown');
    await expect(customerResult).toHaveClass(/.*activeItem.*/);
    await page.getByPlaceholder('Search ledger accounts...').press('Enter');

    // Confirm button should be enabled now
    await expect(confirmBtn).toBeEnabled();

    // Confirm the bill
    await confirmBtn.click();
    await expect(page.getByText('Bill Saved Successfully')).toBeVisible({ timeout: 20000 });

    // Done and clear
    await page.getByRole('button', { name: 'Done & Clear Slot' }).click();

    // 9. Go to Khata Page and verify balance
    await page.getByRole('link', { name: 'Khata' }).click();
    await expect(page).toHaveURL(/.*khata/, { timeout: 20000 });

    await page.getByPlaceholder('Search customer by name or phone number...').fill(custName);
    await page.waitForTimeout(500);
    await page.getByText(custName, { exact: true }).click();

    // Outstanding Due should be ₹500.00 (5 items * ₹100.00)
    await expect(page.locator('div[class*="outstandingCard"] span[class*="statVal"]')).toHaveText('₹500.00', { timeout: 20000 });

    // 10. Test Repayment Flow
    await page.getByRole('button', { name: 'Log Repayment' }).click();
    await page.getByPlaceholder('Enter amount collected...').fill('200.00');
    await page.getByPlaceholder('e.g. Received via GPay, Cash payment').fill('E2E Partial payment');
    await page.getByRole('button', { name: 'Confirm Repayment' }).click();

    // Verify Outstanding Due is now ₹300.00
    await expect(page.locator('div[class*="outstandingCard"] span[class*="statVal"]')).toHaveText('₹300.00', { timeout: 20000 });
  });

  test('should link paid bill with customer to khata account without changing outstanding balance', async ({ page }) => {
    test.setTimeout(120000);
    // Listen to console and page errors for debugging
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Go to Billing Page
    await page.getByRole('link', { name: 'Billing' }).click();
    await expect(page).toHaveURL(/.*billing/, { timeout: 20000 });

    // 3. Add an item to cart
    await page.getByPlaceholder('Type product name or scan barcode...').fill('Aashirvaad Shudh Chakki Atta');
    await page.waitForTimeout(500);
    const productResult = page.locator('ul[class*="resultsList"] li', { hasText: 'Aashirvaad' }).first();
    await expect(productResult).toBeVisible();
    await page.getByPlaceholder('Type product name or scan barcode...').press('ArrowDown');
    await expect(productResult).toHaveClass(/.*activeItem.*/);
    await page.getByPlaceholder('Type product name or scan barcode...').press('Enter');

    // Verify item in cart
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // 4. Link customer on main billing screen using the new CustomerSearch field
    const custName = `Paid Link Cust ${Date.now()}`;
    await page.getByPlaceholder('Search / type name...').fill(custName);
    await page.waitForTimeout(500);
    const addNewResult = page.locator('div[class*="dropdownMenu"] li').filter({ hasText: 'Add new customer' }).first();
    await expect(addNewResult).toBeVisible();
    await addNewResult.click();
    await page.getByPlaceholder('e.g. 9876543210').fill('9876543210');
    await page.getByRole('button', { name: 'Create & Select' }).click();

    // Wait for customer creation to finish
    await expect(page.getByText('created successfully')).toBeVisible({ timeout: 20000 });

    // 5. Open checkout drawer by clicking "Paid (Cash/UPI)"
    await page.getByRole('button', { name: '💰 Paid (Cash/UPI)' }).click();

    // Verify customer is already linked in the checkout drawer
    await expect(page.getByText(`Linked: ${custName}`)).toBeVisible({ timeout: 20000 });

    // 6. Enter cash received to enable confirm button
    await page.getByPlaceholder('Enter cash received...').fill('1000');

    // Confirm the bill
    const confirmBtn = page.getByRole('button', { name: 'Confirm & Print' });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();
    await expect(page.getByText('Bill Saved Successfully')).toBeVisible({ timeout: 20000 });

    // Done and clear
    await page.getByRole('button', { name: 'Done & Clear Slot' }).click();

    // 7. Go to Khata Page to verify ledger entries and balance
    await page.getByRole('link', { name: 'Khata' }).click();
    await expect(page).toHaveURL(/.*khata/, { timeout: 20000 });

    await page.getByPlaceholder('Search customer by name or phone number...').fill(custName);
    await page.waitForTimeout(500);
    await page.getByText(custName, { exact: true }).click();

    // Outstanding Due should be ₹0.00 because they paid in full!
    await expect(page.locator('div[class*="outstandingCard"] span[class*="statVal"]')).toHaveText('₹0.00', { timeout: 20000 });

    // The transactions list should contain a "purchase" entry and a "payment" entry for the same amount
    await expect(page.getByText('purchase', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('payment', { exact: false }).first()).toBeVisible();

    // 8. Open Monthly Statement modal
    await page.getByRole('button', { name: '📋 Monthly Statement' }).click();
    await expect(page.getByText('Print Monthly Statement')).toBeVisible();

    // 9. Find and click the bill number link
    const billLink = page.locator('span[class*="billLink"]').first();
    await expect(billLink).toBeVisible({ timeout: 30000 });
    await billLink.click();

    // 10. Verify that the Receipt Print Preview modal is displayed
    await expect(page.getByText('Receipt Print Preview')).toBeVisible();
  });
});
