import { test, expect } from '@playwright/test';

test.describe('Pricing E2E Flow', () => {
  test('should login, go to bulk pricing page, update a product price, and save', async ({ page }) => {
    test.setTimeout(120000);
    // 1. Login
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Go to Bulk Price Editor Page
    await page.getByRole('link', { name: 'Bulk Pricing' }).click();
    await expect(page).toHaveURL(/.*pricing/, { timeout: 20000 });
    await expect(page.locator('header h1')).toHaveText('Bulk Price Editor');

    // 3. Find a product row and edit its price
    // Note: We use one of the standard seeded products or E2E products
    // Let's use a common product name like 'Fortune Mustard Oil 1L' or search first product
    // Let's get the first row product name text
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    
    const productName = await firstRow.locator('span').first().innerText();
    const currentPriceText = await firstRow.locator('td').nth(1).innerText();
    
    // Parse current price
    const currentPrice = parseFloat(currentPriceText.replace('₹', ''));
    const newPrice = (currentPrice + 5).toFixed(2);

    // Update price
    await firstRow.locator('input[type="number"]').fill(newPrice);

    // 4. Verify change badge / stats bar updates
    const changedVal = page.locator('div', { has: page.locator('text="Changed"') }).last().locator('span').last();
    await expect(changedVal).toHaveText('1');

    // 5. Click Save Changes
    await page.getByRole('button', { name: 'Save All Changes' }).click();

    // 6. Verify toast notification showing success
    await expect(page.getByText(/Successfully updated prices/)).toBeVisible({ timeout: 20000 });

    // 7. Verify stats bar goes back to 0 changes pending
    await expect(changedVal).toHaveText('0');
  });
});
