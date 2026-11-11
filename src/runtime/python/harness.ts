/**
 * Thin bridge between a loaded Pyodide instance and grader.py. Shared by the
 * browser worker and the Node content tests so both use identical grading.
 */
import type { CheckSpec, RawCheckResult, RunResult } from './protocol';

export interface PyodideLike {
  runPython(code: string, options?: { globals?: unknown }): unknown;
  globals: { get(name: string): unknown };
  version: string;
}

type PyFn = ((...args: unknown[]) => string) & { destroy?: () => void };

export interface Harness {
  run(source: string, inputs: Record<string, string>): RunResult;
  check(source: string, spec: CheckSpec): RawCheckResult;
  pythonVersion: string;
}

export function installHarness(py: PyodideLike, graderSource: string): Harness {
  py.runPython(graderSource);
  const run = py.globals.get('engacad_run') as PyFn;
  const check = py.globals.get('engacad_check') as PyFn;
  const pythonVersion = String(py.runPython('import sys; sys.version.split()[0]'));
  return {
    pythonVersion,
    run(source, inputs) {
      return JSON.parse(run(source, JSON.stringify(inputs))) as RunResult;
    },
    check(source, spec) {
      return JSON.parse(check(source, JSON.stringify(spec))) as RawCheckResult;
    },
  };
}
