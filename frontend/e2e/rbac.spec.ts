import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) Flow', () => {
  test('should enforce staff restrictions (Analytics/Purchases hidden, metrics locked, cost price hidden)', async ({ page }) => {
    test.setTimeout(120000);

    const staffEmail = `e2e-staff-${Date.now()}@lalakirana.in`;
    const staffName = 'E2E Staff Member';
    const staffPassword = 'password123';

    // 1. Log in as Owner to create a Staff account
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 2. Go to Settings -> Staff & Users tab
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/.*settings/, { timeout: 20000 });
    await page.getByRole('button', { name: 'Staff & Users' }).click();

    // 3. Add a new Staff user
    await page.getByRole('button', { name: '+ Add Staff' }).click();
    await page.locator('#staff-name').fill(staffName);
    await page.locator('#staff-email').fill(staffEmail);
    await page.locator('#staff-password').fill(staffPassword);
    await page.locator('#staff-role').selectOption('staff');
    await page.getByRole('button', { name: 'Create Staff' }).click();

    // Verify staff created success toast
    await expect(page.getByText('created successfully')).toBeVisible({ timeout: 20000 });

    // 4. Sign out
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/.*login/, { timeout: 20000 });

    // 5. Log in as the newly created Staff user
    await page.getByLabel('Email Address').fill(staffEmail);
    await page.getByLabel('Password').fill(staffPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });

    // 6. Verify Dashboard "Inventory Value" card is locked
    const inventoryValCard = page.locator('div[class*="statCard"]', { hasText: 'Inventory Value' });
    await expect(inventoryValCard).toBeVisible();
    await expect(inventoryValCard.getByText('Owner only')).toBeVisible();
    await expect(inventoryValCard.getByText('🔒')).toBeVisible();

    // 7. Verify restricted sidebar items (Analytics and Purchases) are hidden
    await expect(page.getByRole('link', { name: 'Analytics' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Purchases' })).not.toBeVisible();

    // 8. Go to Inventory and verify restricted actions are hidden
    await page.getByRole('link', { name: 'Inventory' }).click();
    await expect(page).toHaveURL(/.*inventory/, { timeout: 20000 });

    // Click Actions on first product in list
    const firstRowActions = page.locator('tbody tr').first().getByRole('button', { name: 'Actions' });
    if (await firstRowActions.isVisible()) {
      await firstRowActions.click();
      await expect(page.getByRole('menuitem', { name: /Deactivate/ })).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: /Price & Audit History/ })).not.toBeVisible();
      // Click again to close
      await firstRowActions.click();
    }

    // 9. Click "Add Product" and verify "Cost Price" input is hidden
    await page.getByRole('button', { name: 'Add Product' }).click();
    await expect(page).toHaveURL(/.*inventory\/new/, { timeout: 20000 });
    await expect(page.getByLabel('Cost Price (₹) *')).not.toBeVisible();

    // Go back
    await page.getByRole('button', { name: 'Cancel' }).click();

    // 10. Go to Settings and verify only non-owner tabs are visible
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/.*settings/, { timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Staff & Users' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Categories' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Receipt Settings' })).not.toBeVisible();

    // Verify visible tabs (Sessions, Account)
    await expect(page.getByRole('button', { name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();

    // 11. Sign Out
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/.*login/, { timeout: 20000 });
  });
});
