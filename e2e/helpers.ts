import { expect, type Page } from '@playwright/test';

export async function setCode(page: Page, code: string, scope = '[data-testid=workbench]') {
  const content = page.locator(`${scope} .cm-content`).first();
  await content.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

export async function openExercise(page: Page, lessonId: string, exerciseId: string) {
  await page.goto(`#/learn/lesson/${lessonId}?exercise=${exerciseId}`);
  await expect(page.locator(`[data-testid=workbench][data-exercise="${exerciseId}"]`)).toBeVisible();
}

export async function check(page: Page) {
  await page.getByTestId('check-btn').click();
  await expect(page.getByTestId('check-summary')).toBeVisible({ timeout: 45_000 });
}

export async function run(page: Page) {
  await page.getByTestId('run-btn').click();
  await expect(page.getByTestId('run-output')).toBeVisible({ timeout: 45_000 });
}
