import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully as owner, view dashboard, and logout', async ({ page }) => {
    // Listen to console and page errors
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // 1. Go to login page
    await page.goto('/login');
    await expect(page).toHaveTitle(/frontend|LalaKirana/);

    // 2. Fill in credentials
    await page.getByLabel('Email Address').fill('manasrajanidy89@gmail.com');
    await page.getByLabel('Password').fill('changeme123456');

    // 3. Submit form
    await page.getByRole('button', { name: 'Sign In' }).click();

    // 4. Verify redirected to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 20000 });
    await expect(page.locator('main h1')).toHaveText('Dashboard');

    // 5. Verify stats load / Sign Out button is visible
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();

    // 6. Sign out
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // 7. Verify redirected to login
    await expect(page).toHaveURL(/.*login/);
  });
});
