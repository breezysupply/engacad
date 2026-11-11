/** Loads Pyodide + grader.py in Node so tests use the exact browser grading code. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadPyodide } from 'pyodide';
import { installHarness, type Harness, type PyodideLike } from '../runtime/python/harness';

let harness: Promise<Harness> | null = null;

export function getHarness(): Promise<Harness> {
  harness ??= (async () => {
    const py = (await loadPyodide({ stdout: () => {}, stderr: () => {} })) as unknown as PyodideLike;
    const grader = readFileSync(fileURLToPath(new URL('../runtime/python/grader.py', import.meta.url)), 'utf8');
    return installHarness(py, grader);
  })();
  return harness;
}
