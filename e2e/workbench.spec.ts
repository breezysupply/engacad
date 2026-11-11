import { expect, test } from '@playwright/test';
import { check, openExercise, run, setCode } from './helpers';

test.describe('Week 01 guided exercise', () => {
  test('Run executes real Python and never awards evidence', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-reachable');
    await setCode(page, 'print(service_name, "is reachable")\nx = 6 * 7');
    await run(page);
    await expect(page.getByTestId('stdout')).toHaveText('beacon-api is reachable\n');
    await expect(page.getByTestId('run-output')).toContainText('42');
    await expect(page.getByTestId('workbench').getByTestId('runtime-status')).toContainText('Pyodide');
    await page.goto('#/progress');
    await expect(page.getByText('No evidence yet.')).toBeVisible();
    await page.goto('./');
    await expect(page.getByText('Check attempts recorded').locator('..')).toContainText('0');
  });

  test('Check rejects a hardcoded answer, then passes the correct one with Guided evidence', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-reachable');
    await setCode(page, 'print("beacon-api is reachable")');
    await run(page);
    await expect(page.getByTestId('stdout')).toHaveText('beacon-api is reachable\n');
    await check(page);
    await expect(page.getByTestId('check-summary')).toContainText('of 4 requirements met');
    await expect(page.getByTestId('req-output')).toHaveAttribute('data-passed', 'false');
    await expect(page.getByTestId('req-output')).toContainText('dns-resolver is reachable');
    await expect(page.getByTestId('req-uses-input')).toHaveAttribute('data-passed', 'false');

    await setCode(page, 'print(service_name, "is reachable")');
    await check(page);
    await expect(page.getByTestId('check-summary')).toContainText('All requirements met');
    await expect(page.getByTestId('evidence-note')).toContainText('Guided evidence recorded');
    await page.goto('#/progress');
    await expect(page.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'guided');
    await expect(page.getByTestId('reviews-upcoming')).toContainText('1-day');
  });

  test('syntax and runtime errors produce helpful feedback', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-reachable');
    await setCode(page, 'print(service_name, "is reachable"');
    await check(page);
    await expect(page.getByTestId('check-results')).toContainText('could not read your code');
    await expect(page.getByTestId('error-box')).toContainText('SyntaxError');
    await expect(page.getByTestId('error-box')).toContainText('line 1');
    await setCode(page, 'print(servce_name)');
    await run(page);
    await expect(page.getByTestId('error-box')).toContainText('NameError');
    await expect(page.getByTestId('error-box')).toContainText('Python does not know this name');
  });

  test('an infinite loop times out, the runtime restarts and the code is kept', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-reachable');
    await setCode(page, 'while True:\n    pass');
    await run(page);
    await expect(page.getByTestId('error-box')).toContainText('Timeout', { timeout: 30_000 });
    await expect(page.locator('[data-testid=workbench] .cm-content')).toContainText('while True:');
    await setCode(page, 'print("recovered")');
    await run(page);
    await expect(page.getByTestId('stdout')).toHaveText('recovered\n');
  });

  test('reloading restores the lesson, the active exercise and the draft', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-service-card');
    await setCode(page, '# my draft\nprint("service:", service_name)');
    await expect(page.getByTestId('autosave')).toHaveAttribute('data-state', 'saved');
    await page.goto('./');
    await page.reload();
    await expect(page.getByText('Pick up where you left off')).toBeVisible();
    await page.getByRole('link', { name: /Continue learning/ }).click();
    await expect(page.locator('[data-testid=workbench]')).toHaveAttribute('data-exercise', 'w01-ex-service-card');
    await expect(page.locator('[data-testid=workbench] .cm-content')).toContainText('# my draft');
  });
});

test.describe('hints, solutions and independent evidence', () => {
  test('hint levels persist across reloads', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-reachable');
    await page.getByRole('tab', { name: /Hints/ }).click();
    await page.getByRole('button', { name: 'Show level 1 hint' }).click();
    await page.getByRole('button', { name: 'Show level 2 hint' }).click();
    await expect(page.getByTestId('hint-2')).toContainText('print() accepts several values');
    await page.reload();
    await page.getByRole('tab', { name: /Hints/ }).click();
    await expect(page.getByTestId('hint-2')).toContainText('print() accepts several values');
    await expect(page.getByRole('button', { name: 'Show level 3 hint' })).toBeEnabled();
  });

  test('a revealed solution turns an independent pass into Guided evidence', async ({ page }) => {
    // assisted pass on the independent task
    await openExercise(page, 'w01-l1', 'w01-ex-service-card');
    await page.getByRole('tab', { name: /Hints/ }).click();
    for (const l of [1, 2, 3]) {
      await page.getByRole('button', { name: `Show level ${l} hint` }).click();
      if (l > 1) await page.getByRole('dialog').getByRole('button', { name: 'Show hint' }).click();
    }
    await page.getByRole('button', { name: 'Reveal worked solution' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reveal solution' }).click();
    await page.getByRole('button', { name: 'Load solution into editor' }).click();
    await check(page);
    await expect(page.getByTestId('evidence-note')).toContainText('Guided evidence recorded');
    await expect(page.getByTestId('evidence-note')).toContainText('worked solution was viewed');
    await page.goto('#/progress');
    await expect(page.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'guided');
  });

  test('an unassisted independent pass awards Applied evidence', async ({ page }) => {
    await openExercise(page, 'w01-l1', 'w01-ex-service-card');
    await setCode(page, 'print("service:", service_name)\nprint("region:", region)');
    await check(page);
    await expect(page.getByTestId('evidence-note')).toContainText('Applied evidence recorded');
    await page.goto('./');
    await expect(page.getByText('Print provided variables and literal text together')).toBeVisible();
    await page.goto('#/progress');
    await expect(page.getByTestId('skill-py.print-basics')).toHaveAttribute('data-level', 'applied');
    await expect(page.getByTestId('evidence-history')).toContainText('Browser Python');
  });
});
