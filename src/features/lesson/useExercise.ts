import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgress, useStore } from '../../app/providers';
import type { Exercise } from '../../curriculum/types';
import type { CheckOutcome } from '../../progress/store';
import { getRuntime } from '../../runtime/python/client';
import { gradeCheck, type GradedCheck } from '../../runtime/python/grading';
import { buildCheckSpec, type RunResult } from '../../runtime/python/protocol';

export type SaveState = 'saved' | 'pending' | 'unsaved';

export interface ExerciseController {
  source: string;
  setSource: (s: string) => void;
  saveState: SaveState;
  runCaseId: string;
  setRunCaseId: (id: string) => void;
  busy: 'run' | 'check' | null;
  runResult: RunResult | null;
  checkResult: { graded: GradedCheck; outcome: CheckOutcome | null } | null;
  lastAction: 'run' | 'check' | null;
  run: () => Promise<void>;
  check: () => Promise<void>;
  reset: () => void;
  restore: (src: string, label: string) => void;
  runtimeError: string | null;
}

/**
 * State and actions for one exercise in the workbench: draft autosave,
 * Run (exploration only) and Check (graded, recorded).
 */
export function useExercise(ex: Exercise, stateKey: string, record?: (graded: GradedCheck, source: string) => CheckOutcome | null): ExerciseController {
  const store = useStore();
  const state = useProgress();
  const initial = state.drafts[stateKey]?.source ?? ex.starter;
  const [source, setSourceRaw] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [runCaseId, setRunCaseId] = useState(ex.cases.find((c) => c.kind === 'nominal')!.id);
  const [busy, setBusy] = useState<'run' | 'check' | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [checkResult, setCheckResult] = useState<ExerciseController['checkResult']>(null);
  const [lastAction, setLastAction] = useState<'run' | 'check' | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const latest = useRef(source);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // switching exercise: load its draft
  useEffect(() => {
    const src = store.state.drafts[stateKey]?.source ?? ex.starter;
    setSourceRaw(src);
    latest.current = src;
    setRunResult(null);
    setCheckResult(null);
    setLastAction(null);
    setSaveState('saved');
    setRunCaseId(ex.cases.find((c) => c.kind === 'nominal')!.id);
  }, [stateKey, ex, store]);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    store.saveDraft(stateKey, latest.current);
    setSaveState(store.storage.state === 'ok' ? 'saved' : 'unsaved');
  }, [store, stateKey]);

  // save on unmount / tab hide so the last keystrokes are never lost
  useEffect(() => {
    const onHide = () => timer.current && flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      if (timer.current) flush();
    };
  }, [flush]);

  const setSource = useCallback(
    (s: string) => {
      latest.current = s;
      setSourceRaw(s);
      setSaveState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  const run = useCallback(async () => {
    if (busy) return;
    flush();
    setBusy('run');
    setLastAction('run');
    setRuntimeError(null);
    try {
      const fixture = ex.cases.find((c) => c.id === runCaseId) ?? ex.cases[0];
      const res = await getRuntime().run(latest.current, fixture.inputs);
      setRunResult(res);
      store.recordRun(stateKey, latest.current, res.stdout, res.error?.type);
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }, [busy, flush, ex, runCaseId, store, stateKey]);

  const check = useCallback(async () => {
    if (busy) return;
    flush();
    setBusy('check');
    setLastAction('check');
    setRuntimeError(null);
    const src = latest.current;
    try {
      store.snapshot(stateKey, src, 'Checked');
      const raw = await getRuntime().check(src, buildCheckSpec(ex));
      const graded = gradeCheck(ex, raw);
      const outcome = record ? record(graded, src) : store.recordCheck(ex, src, graded, { stateKey });
      setCheckResult({ graded, outcome });
    } catch (err) {
      setRuntimeError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }, [busy, flush, ex, record, store, stateKey]);

  const reset = useCallback(() => {
    store.snapshot(stateKey, latest.current, 'Before reset');
    setSource(ex.starter);
    setRunResult(null);
    setCheckResult(null);
  }, [store, stateKey, ex, setSource]);

  const restore = useCallback(
    (src: string, label: string) => {
      store.snapshot(stateKey, latest.current, label);
      setSource(src);
    },
    [store, stateKey, setSource],
  );

  return { source, setSource, saveState, runCaseId, setRunCaseId, busy, runResult, checkResult, lastAction, run, check, reset, restore, runtimeError };
}
