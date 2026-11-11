/// <reference lib="webworker" />
/**
 * Dedicated worker that owns the Pyodide interpreter. Learner Python never runs
 * on the page's main thread. If learner code loops forever, the main thread
 * terminates this worker and starts a fresh one (see client.ts).
 */
import graderSource from './grader.py?raw';
import { installHarness, type Harness, type PyodideLike } from './harness';
import type { FromWorker, ToWorker } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

let harness: Harness | null = null;

const post = (msg: FromWorker) => self.postMessage(msg);

self.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    try {
      const mod = (await import(/* @vite-ignore */ `${msg.indexURL}pyodide.mjs`)) as {
        loadPyodide: (opts: { indexURL: string; stdout?: (s: string) => void; stderr?: (s: string) => void }) => Promise<PyodideLike>;
      };
      const py = await mod.loadPyodide({ indexURL: msg.indexURL, stdout: () => {}, stderr: () => {} });
      harness = installHarness(py, graderSource);
      post({ type: 'ready', version: py.version, pythonVersion: harness.pythonVersion });
    } catch (err) {
      post({ type: 'init-error', message: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  if (!harness) {
    post({ type: 'internal-error', id: msg.id, message: 'Python runtime is not ready yet.' });
    return;
  }
  try {
    const started = performance.now();
    if (msg.type === 'run') {
      const result = harness.run(msg.source, msg.inputs);
      result.durationMs = Math.round(performance.now() - started);
      post({ type: 'run-result', id: msg.id, result });
    } else if (msg.type === 'check') {
      post({ type: 'check-result', id: msg.id, result: harness.check(msg.source, msg.spec) });
    }
  } catch (err) {
    post({ type: 'internal-error', id: msg.id, message: err instanceof Error ? err.message : String(err) });
  }
};
