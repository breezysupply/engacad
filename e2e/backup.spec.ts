import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { check, openExercise, setCode } from './helpers';

test('backup export restores progress in a clean browser profile', async ({ browser }) => {
  const a = await browser.newContext();
  const pa = await a.newPage();
  await openExercise(pa, 'w01-l1', 'w01-ex-service-card');
  await setCode(pa, 'print("service:", service_name)\nprint("region:", region)');
  await check(pa);
  await expect(pa.getByTestId('evidence-note')).toContainText('Applied');
  await pa.goto('#/progress');
  const [download] = await Promise.all([pa.waitForEvent('download'), pa.getByTestId('export-btn').click()]);
  const path = await download.path();
  const json = readFileSync(path!, 'utf8');
  expect(JSON.parse(json).format).toBe('engacad-progress-backup');
  await a.close();

  const b = await browser.newContext();
  const pb = await b.newPage();
  await pb.goto('#/progress');
  await expect(pb.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'none');
  await pb.getByTestId('import-file').setInputFiles({ name: 'engacad-backup.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await pb.getByTestId('mode-replace').check();
  await pb.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await expect(pb.getByTestId('backup-msg')).toContainText('Imported backup');
  await expect(pb.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'applied');
  await expect(pb.getByTestId('evidence-history')).toContainText('from backup');
  // survives a reload (persisted to IndexedDB), and the draft is restored
  await pb.reload();
  await expect(pb.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'applied');
  await openExercise(pb, 'w01-l1', 'w01-ex-service-card');
  await expect(pb.locator('[data-testid=workbench] .cm-content')).toContainText('print("region:", region)');
  await b.close();
});

test('an invalid backup is rejected without changing progress', async ({ page }) => {
  await page.goto('#/progress');
  await page.getByTestId('import-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"nope"}') });
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
  await expect(page.getByTestId('backup-msg')).toContainText('not an EngAcad progress backup');
});
