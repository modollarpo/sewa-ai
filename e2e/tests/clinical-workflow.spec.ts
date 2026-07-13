import { test, expect } from '@playwright/test';

test.describe('SEWA XAI — Clinical Workflow (E2E)', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/SEWA XAI/);
    await expect(page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first()).toBeAttached({ timeout: 5000 });
  });

  test('full login and dashboard navigation', async ({ page }) => {
    const email = process.env.E2E_TEST_EMAIL || 'superadmin@sewaxai.health';
    const password = process.env.E2E_TEST_PASSWORD;

    test.skip(!password, 'E2E_TEST_PASSWORD not set — skipping authenticated tests');

    await page.goto('/login');
    await expect(page).toHaveTitle(/SEWA XAI/);

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await submitBtn.click();

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});
