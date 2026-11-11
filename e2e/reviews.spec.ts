import { expect, test } from '@playwright/test';
import { check, openExercise, setCode } from './helpers';

const DAY = 86_400_000;

test('reviews come due on schedule, a missed review waits, and a 7-day pass awards Retained', async ({ page }) => {
  const t0 = Date.now();
  await page.clock.setFixedTime(new Date(t0));
  await openExercise(page, 'w01-l1', 'w01-ex-service-card');
  await setCode(page, 'print("service:", service_name)\nprint("region:", region)');
  await check(page);
  await expect(page.getByTestId('evidence-note')).toContainText('Applied');

  // Not due yet
  await page.goto('./');
  await expect(page.getByText('No reviews due.')).toBeVisible();

  // Three days later (late — no penalty): the 1-day reviews are due
  await page.clock.setFixedTime(new Date(t0 + 3 * DAY));
  await page.reload();
  await expect(page.getByText(/short reviews? ready/)).toBeVisible();
  await page.goto('#/review/py.print-basics%230');
  await expect(page.getByText('1-day step')).toBeVisible();
  await setCode(page, 'print("connecting to", host, "on port", port)');
  await check(page);
  await expect(page.getByText('Review complete')).toBeVisible();
  await expect(page.getByText('Applied evidence recorded')).toBeVisible();

  // The next step is scheduled 6 days after completion
  await page.goto('#/progress');
  await expect(page.getByTestId('reviews-upcoming')).toContainText('7-day');

  await page.clock.setFixedTime(new Date(t0 + 10 * DAY));
  await page.goto('#/review/py.print-basics%231');
  await expect(page.getByText('7-day step')).toBeVisible();
  await setCode(page, 'print("check:", check_name)\nprint("  ->", status)');
  await check(page);
  await expect(page.getByText('Retained evidence recorded')).toBeVisible();
  await page.goto('#/progress');
  await expect(page.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'retained');
});
