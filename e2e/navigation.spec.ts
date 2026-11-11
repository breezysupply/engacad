import { expect, test } from '@playwright/test';

test('all five primary areas render meaningful content', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Continue learning/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Reviews due' })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  await nav.getByRole('link', { name: 'Learn' }).click();
  await expect(page.getByRole('heading', { name: 'Learn', level: 1 })).toBeVisible();
  await nav.getByRole('link', { name: 'Labs' }).click();
  await expect(page.getByRole('heading', { name: 'Labs', level: 1 })).toBeVisible();
  await expect(page.getByText('Real Python on your Mac or in Codespaces')).toBeVisible();
  await nav.getByRole('link', { name: 'Beacon' }).click();
  await expect(page.getByRole('heading', { name: 'Beacon', level: 1 })).toBeVisible();
  await nav.getByRole('link', { name: 'Skills & Progress' }).click();
  await expect(page.getByRole('heading', { name: 'Skills & Progress', level: 1 })).toBeVisible();
  await expect(page.getByTestId('skill-matrix')).toBeVisible();
});

test('the roadmap shows 52 weeks; only Week 01 is learnable, Week 02 awaits its reference unit', async ({ page }) => {
  await page.goto('#/learn');
  await expect(page.locator('[data-testid^=week-w]')).toHaveCount(52);
  await expect(page.locator('a[data-testid^=week-w]')).toHaveCount(1);
  await expect(page.getByTestId('week-w02')).toContainText('Awaiting reference unit');
  await expect(page.getByTestId('week-w03')).toContainText('Planned');
  await expect(page.getByTestId('week-w03')).toHaveAttribute('aria-disabled', 'true');
  await page.getByTestId('week-w01').click();
  await expect(page.getByRole('heading', { name: /Week 01/ })).toBeVisible();
});

test('lab catalogue distinguishes real, planned and simulated labs', async ({ page }) => {
  await page.goto('#/labs');
  await expect(page.getByText('Real · Local Mac').first()).toBeVisible();
  await expect(page.getByText('Simulation').first()).toBeVisible();
  await page.goto('#/labs/lab-w01-real-python');
  await expect(page.getByText('This is a real environment, outside the browser')).toBeVisible();
  await page.getByLabel('Paste the full script output').fill('==> ok\nENGACAD-ENV-CHECK v1 python=3.12.4 platform=darwin git=yes status=PASS');
  await page.getByRole('button', { name: 'Save as self-reported evidence' }).click();
  await expect(page.getByTestId('lab-evidence')).toContainText('Self-reported');
  await page.goto('#/progress');
  await expect(page.getByTestId('evidence-history')).toContainText('Self-reported');
});

test('assets resolve under the repository base path', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (r) => r.status() >= 400 && failed.push(r.url()));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(page.url()).toContain(process.env.BASE_PATH ?? '/engacad/');
  expect(failed).toEqual([]);
});
