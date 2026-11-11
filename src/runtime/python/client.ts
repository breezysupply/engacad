/**
 * Main-thread client for the Pyodide worker.
 *
 * - Lazily starts the worker on first use.
 * - Serialises requests (one learner program at a time).
 * - Enforces a wall-clock timeout; on timeout the worker is terminated and a
 *   fresh one is started, so an infinite loop never freezes the app. The
 *   learner's source lives in the editor/storage, not the worker, so nothing
 *   is lost.
 */
import type { CheckSpec, FromWorker, PyError, RawCheckResult, RunResult } from './protocol';

export type RuntimeStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'ready'; version: string; pythonVersion: string }
  | { state: 'busy'; version: string; pythonVersion: string }
  | { state: 'restarting' }
  | { state: 'error'; message: string };

export const RUN_TIMEOUT_MS = 6000;
export const CHECK_TIMEOUT_MS = 12000;

export class TimeoutError extends Error {
  constructor(public readonly ms: number) {
    super(`Your program was still running after ${ms / 1000} seconds, so it was stopped.`);
  }
}

export const timeoutPyError = (ms: number): PyError => ({
  type: 'Timeout',
  message: `Stopped after ${ms / 1000} seconds. This usually means a loop never ends.`,
  line: null,
  traceback: `Timeout: the program was still running after ${ms / 1000} s and was stopped.\nThe Python runtime was restarted; your code is unchanged.`,
});

type Pending = { resolve: (v: FromWorker) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

function defaultIndexURL(): string {
  return new URL(`${import.meta.env.BASE_URL}pyodide/`, window.location.href).href;
}

export class PythonRuntime {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(s: RuntimeStatus) => void>();
  private info: { version: string; pythonVersion: string } | null = null;
  status: RuntimeStatus = { state: 'idle' };

  constructor(private readonly indexURL: () => string = defaultIndexURL) {}

  subscribe(fn: (s: RuntimeStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private setStatus(s: RuntimeStatus) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s));
  }

  /** Start (or return) the interpreter. Safe to call repeatedly. */
  start(): Promise<void> {
    if (this.ready) return this.ready;
    this.setStatus({ state: this.status.state === 'restarting' ? 'restarting' : 'loading' });
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'engacad-python' });
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      worker.onmessage = (ev: MessageEvent<FromWorker>) => {
        const msg = ev.data;
        if (msg.type === 'ready') {
          this.info = { version: msg.version, pythonVersion: msg.pythonVersion };
          this.setStatus({ state: 'ready', ...this.info });
          resolve();
        } else if (msg.type === 'init-error') {
          this.fail(msg.message);
          reject(new Error(msg.message));
        } else {
          const p = this.pending.get(msg.id);
          if (p) {
            clearTimeout(p.timer);
            this.pending.delete(msg.id);
            p.resolve(msg);
          }
        }
      };
      worker.onerror = (ev) => {
        const message = ev.message || 'The Python worker failed to start.';
        this.fail(message);
        reject(new Error(message));
      };
      worker.postMessage({ type: 'init', indexURL: this.indexURL() });
    });
    return this.ready;
  }

  private fail(message: string) {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    this.setStatus({ state: 'error', message });
  }

  /** Retry after a load error. */
  retry(): Promise<void> {
    this.ready = null;
    return this.start();
  }

  /** Terminate and recreate the interpreter (used after a timeout). */
  restart(): Promise<void> {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error('Runtime restarted'));
    }
    this.pending.clear();
    this.setStatus({ state: 'restarting' });
    return this.start();
  }

  private request(build: (id: number) => object, timeoutMs: number): Promise<FromWorker> {
    const job = this.queue.then(async () => {
      await this.start();
      if (this.info) this.setStatus({ state: 'busy', ...this.info });
      const id = this.nextId++;
      try {
        return await new Promise<FromWorker>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.pending.delete(id);
            reject(new TimeoutError(timeoutMs));
          }, timeoutMs);
          this.pending.set(id, { resolve, reject, timer });
          this.worker!.postMessage(build(id));
        });
      } catch (err) {
        if (err instanceof TimeoutError) void this.restart();
        throw err;
      } finally {
        if (this.info && this.status.state === 'busy') this.setStatus({ state: 'ready', ...this.info });
      }
    });
    this.queue = job.catch(() => undefined);
    return job;
  }

  async run(source: string, inputs: Record<string, string>, timeoutMs = RUN_TIMEOUT_MS): Promise<RunResult> {
    try {
      const msg = await this.request((id) => ({ type: 'run', id, source, inputs }), timeoutMs);
      if (msg.type === 'run-result') return msg.result;
      if (msg.type === 'internal-error') throw new Error(msg.message);
      throw new Error('Unexpected response from Python worker');
    } catch (err) {
      if (err instanceof TimeoutError) {
        return { stdout: '', stderr: '', error: timeoutPyError(err.ms), variables: [], protectedWarnings: [] };
      }
      throw err;
    }
  }

  async check(source: string, spec: CheckSpec, timeoutMs = CHECK_TIMEOUT_MS): Promise<RawCheckResult | { timeout: PyError }> {
    try {
      const msg = await this.request((id) => ({ type: 'check', id, source, spec }), timeoutMs);
      if (msg.type === 'check-result') return msg.result;
      if (msg.type === 'internal-error') throw new Error(msg.message);
      throw new Error('Unexpected response from Python worker');
    } catch (err) {
      if (err instanceof TimeoutError) return { timeout: timeoutPyError(err.ms) };
      throw err;
    }
  }
}

let shared: PythonRuntime | null = null;
export const getRuntime = () => (shared ??= new PythonRuntime());
