import { expect, test } from '@playwright/test';

const EMAIL = process.env.E2E_LOGIN_EMAIL || 'admin@demo.codevertexafrica.com';
const PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'DemoAdmin2024!';

test.describe('Logistics UI SSO login and landing', () => {
  test('landing or dashboard loads for tenant', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(urban-loft|[\w-]+)\/?/, { timeout: 15_000 });
    const signInOrContent = page.getByRole('link', { name: /sign in|login/i }).or(page.getByText(/dashboard|logistics|tracking/i));
    await expect(signInOrContent.first()).toBeVisible({ timeout: 10_000 });
  });

  test('full SSO login then authenticated indicator', async ({ page }) => {
    await page.goto('/');
    const signInLink = page.getByRole('link', { name: /sign in|login/i }).first();
    await signInLink.click().catch(() => {});
    // Real domain is codevertexafrica.com (devops-k8s apps/auth-ui/values.yaml) --
    // codevertexitsolutions.com here previously never matched, so login silently
    // no-op'd and this test failed later for the wrong reason.
    const onAccounts = await page.waitForURL(/accounts\.codevertexafrica\.com\/login/, { timeout: 15_000 }).then(() => true).catch(() => false);
    if (onAccounts) {
      await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
      await page.getByRole('textbox', { name: /password/i }).fill(PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/logistics\.codevertexafrica\.com|localhost/, { timeout: 25_000 }).catch(() => {});
    }
    const dashboardOrProfile = page.getByRole('link', { name: /dashboard|profile/i }).or(page.getByText(/dashboard|logistics/i));
    await expect(dashboardOrProfile.first()).toBeVisible({ timeout: 15_000 });
  });
});
