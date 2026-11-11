import { devices, expect, test } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

test('mobile: dashboard, curriculum and lesson reading work without horizontal scroll', async ({ page }) => {
  for (const path of ['./', '#/learn', '#/learn/lesson/w01-l1', '#/progress', '#/labs/lab-w01-real-python']) {
    await page.goto(path);
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
  await page.goto('#/learn/lesson/w01-l1');
  await expect(page.getByRole('heading', { name: 'How EngAcad works' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary (mobile)' })).toBeVisible();
  await expect(page.getByText('Best on desktop').first()).toBeVisible();
});
