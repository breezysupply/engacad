import { CheckCheck, ChevronDown, ChevronUp, Cloud, CloudOff, Lightbulb, Loader2, Play, RotateCcw, Lock, History, BookText, ListChecks, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useProgress, useRuntimeStatus, useStore } from '../../app/providers';
import { ModeBadge } from '../../components/Badges';
import { CodeBlock } from '../../components/CodeBlock';
import { ConfirmDialog } from '../../components/Dialog';
import { Markdown } from '../../components/Markdown';
import type { Exercise } from '../../curriculum/types';
import { getRuntime, type RuntimeStatus } from '../../runtime/python/client';
import { CodeEditor } from '../editor/CodeEditor';
import { GlossaryList } from '../glossary/GlossaryDrawer';
import { CheckResults, RunOutput } from './Results';
import type { ExerciseController } from './useExercise';

export function RuntimeIndicator({ status }: { status: RuntimeStatus }) {
  const map: Record<RuntimeStatus['state'], [string, string]> = {
    idle: ['', 'Python loads on first Run'],
    loading: ['busy', 'Loading Python…'],
    restarting: ['busy', 'Restarting Python…'],
    ready: ['ok', 'Python ready'],
    busy: ['busy', 'Running…'],
    error: ['err', 'Python failed to load'],
  };
  const [cls, label] = map[status.state];
  const version = status.state === 'ready' || status.state === 'busy' ? ` · ${status.pythonVersion} (Pyodide ${status.version})` : '';
  return (
    <span className="row small muted" style={{ gap: 6 }} data-testid="runtime-status" data-state={status.state}>
      <span className={`status-dot ${cls}`} aria-hidden />
      {label}
      {version}
      {status.state === 'error' && (
        <button className="btn btn-sm" onClick={() => void getRuntime().retry()}>
          <RefreshCw size={13} /> Retry
        </button>
      )}
    </span>
  );
}

type Tab = 'task' | 'hints' | 'reference' | 'history';

const LEVEL_NAMES = ['Nudge', 'Concept reminder', 'Specific hint', 'Worked solution'];

function HintsPanel({ ex, stateKey, onLoadSolution }: { ex: Exercise; stateKey: string; onLoadSolution: () => void }) {
  const store = useStore();
  const state = useProgress();
  const rec = state.hints[stateKey];
  const revealed = rec?.revealedLevel ?? 0;
  const [confirm, setConfirm] = useState<number | null>(null);
  const independent = ex.mode !== 'guided';
  const reveal = (level: number) => {
    const exceeds = independent && (level === 4 || level > ex.allowedHintLevel);
    if (level === 4 || exceeds) setConfirm(level);
    else store.revealHint(stateKey, level);
  };
  return (
    <div data-testid="hints-panel">
      <p className="small muted">
        {independent
          ? ex.allowedHintLevel === 0
            ? 'Independent task: any hint turns a pass into guided practice.'
            : `Independent task: hints up to level ${ex.allowedHintLevel} still count as independent. Deeper hints or the solution turn a pass into guided practice.`
          : 'Guided practice: use as many hints as you need. Revealed hints are remembered.'}
      </p>
      {[1, 2, 3, 4].map((level) => {
        const open = revealed >= level;
        const canOpen = revealed === level - 1;
        const hint = ex.hints.find((h) => h.level === level);
        return (
          <div key={level} className={`hint-step ${open ? '' : 'locked'}`} data-testid={`hint-${level}`}>
            <h4>
              {open ? <Lightbulb size={15} /> : <Lock size={14} />} Level {level} · {LEVEL_NAMES[level - 1]}
              {independent && level > ex.allowedHintLevel && <span className="badge badge-warning">beyond independent allowance</span>}
            </h4>
            {open ? (
              level < 4 ? (
                <div className="small">{hint?.text}</div>
              ) : (
                <div>
                  <CodeBlock code={ex.solution.source} />
                  <Markdown text={ex.solution.explanation} className="prose small" />
                  <button className="btn btn-sm" onClick={onLoadSolution}>
                    Load solution into editor
                  </button>
                </div>
              )
            ) : (
              <button className="btn btn-sm" disabled={!canOpen} onClick={() => reveal(level)}>
                {level === 4 ? 'Reveal worked solution' : `Show level ${level} hint`}
              </button>
            )}
          </div>
        );
      })}
      {rec?.history.length ? (
        <p className="small muted">
          Hint history: {rec.history.map((h) => `L${h.level} at ${new Date(h.at).toLocaleString()}`).join(' · ')}
        </p>
      ) : null}
      {confirm !== null && (
        <ConfirmDialog
          title={confirm === 4 ? 'Reveal the worked solution?' : `Show level ${confirm} hint?`}
          body={
            confirm === 4 ? (
              <>
                A pass after viewing the solution counts as <strong>guided</strong> practice, not independent work. {ex.independentVariantId ? 'You will be offered a fresh task to show the skill independently.' : ''}
              </>
            ) : (
              <>This hint is beyond the allowance for independent work, so a pass will be recorded as guided practice.</>
            )
          }
          confirmLabel={confirm === 4 ? 'Reveal solution' : 'Show hint'}
          onConfirm={() => {
            store.revealHint(stateKey, confirm);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function HistoryPanel({ ex, stateKey, onRestore }: { ex: Exercise; stateKey: string; onRestore: (src: string) => void }) {
  const state = useProgress();
  const attempts = state.attempts.filter((a) => a.exerciseId === ex.id).slice().reverse();
  const snaps = (state.drafts[stateKey]?.snapshots ?? []).slice().reverse();
  return (
    <div>
      <h4 style={{ fontSize: '0.9rem' }}>Check attempts</h4>
      {attempts.length ? (
        <table className="table">
          <tbody>
            {attempts.slice(0, 15).map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.at).toLocaleString()}</td>
                <td>{a.passed ? <span className="badge badge-success">passed</span> : <span className="badge badge-warning">not yet</span>}</td>
                <td>
                  {a.passedCount}/{a.totalCount}
                </td>
                <td className="small muted">{a.solutionViewed ? 'solution viewed' : a.hintLevel ? `hints ≤ L${a.hintLevel}` : 'no hints'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="small muted">No Check attempts yet.</p>
      )}
      <h4 style={{ fontSize: '0.9rem', marginTop: 16 }}>Code snapshots</h4>
      {snaps.length ? (
        <ul className="list-plain small">
          {snaps.map((s) => (
            <li key={s.at}>
              <span style={{ flex: 1 }}>
                {s.label} · {new Date(s.at).toLocaleString()}
              </span>
              <button className="btn btn-sm" onClick={() => onRestore(s.source)}>
                Restore
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Snapshots are saved each time you Check or Reset.</p>
      )}
    </div>
  );
}

export function Workbench({ ex, stateKey, ctl, onOpenExercise, headerExtra }: { ex: Exercise; stateKey: string; ctl: ExerciseController; onOpenExercise?: (id: string) => void; headerExtra?: React.ReactNode }) {
  const state = useProgress();
  const status = useRuntimeStatus();
  const [tab, setTab] = useState<Tab>('task');
  const [infoOpen, setInfoOpen] = useState(true);
  const [outTab, setOutTab] = useState<'output' | 'check'>('output');
  const [confirmReset, setConfirmReset] = useState(false);
  const shownOut = outTab;
  const fixture = ex.cases.find((c) => c.id === ctl.runCaseId)!;
  const passed = state.attempts.some((a) => a.exerciseId === ex.id && a.passed && !a.reviewId);

  const doRun = () => {
    setOutTab('output');
    void ctl.run();
  };
  const doCheck = () => {
    setOutTab('check');
    void ctl.check();
  };

  return (
    <section className="workbench" aria-label="Code workbench" data-testid="workbench" data-exercise={ex.id}>
      <div className="wb-head">
        <div className="wb-title">
          <ModeBadge mode={ex.mode} />
          <span>{ex.title}</span>
          {passed && <span className="badge badge-success">passed</span>}
          <span className="spacer" />
          {headerExtra}
        </div>
        <RuntimeIndicator status={status} />
        <p className="small muted mobile-desktop-note" style={{ margin: 0 }}>
          Best on desktop: the editor works on mobile, but longer coding is easier on a laptop.
        </p>
      </div>
      <div className="tabs" role="tablist" aria-label="Exercise panels">
        {(
          [
            ['task', 'Task', ListChecks],
            ['hints', 'Hints', Lightbulb],
            ['reference', 'Reference', BookText],
            ['history', 'History', History],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            className="tab"
            aria-selected={tab === id && infoOpen}
            onClick={() => {
              setTab(id);
              setInfoOpen(true);
            }}
          >
            <Icon size={14} /> {label}
            {id === 'hints' && (state.hints[stateKey]?.revealedLevel ?? 0) > 0 && <span className="badge">{state.hints[stateKey].revealedLevel}/4</span>}
          </button>
        ))}
        <span className="spacer" />
        <button className="tab" onClick={() => setInfoOpen((o) => !o)} aria-expanded={infoOpen} aria-label={infoOpen ? 'Collapse panel' : 'Expand panel'}>
          {infoOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>
      <div className="wb-body">
        {infoOpen && (
          <div className="wb-scroll" style={{ flex: '0 1 auto', maxHeight: '30%', borderBottom: '1px solid var(--border)' }} role="tabpanel">
            {tab === 'task' && (
              <div data-testid="task-panel">
                <Markdown text={ex.prompt} className="prose small" />
              </div>
            )}
            {tab === 'hints' && <HintsPanel ex={ex} stateKey={stateKey} onLoadSolution={() => ctl.restore(ex.solution.source, 'Before loading solution')} />}
            {tab === 'reference' && <GlossaryList query="" />}
            {tab === 'history' && <HistoryPanel ex={ex} stateKey={stateKey} onRestore={(src) => ctl.restore(src, 'Before restoring snapshot')} />}
          </div>
        )}
        <div className="wb-editor-area">
          {ex.protectedInputs.length > 0 && (
            <div className="wb-inputs" data-testid="inputs-bar">
              <span className="muted">Inputs:</span>
              {ex.protectedInputs.map((n) => (
                <span key={n} className="input-chip" title={ex.inputNotes?.[n]}>
                  {n} = {fixture.inputs[n]}
                </span>
              ))}
              <span className="spacer" />
              <label className="row small" style={{ gap: 6 }}>
                Run with
                <select value={ctl.runCaseId} onChange={(e) => ctl.setRunCaseId(e.target.value)} aria-label="Fixture to use for Run">
                  {ex.cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.kind}: {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <CodeEditor value={ctl.source} onChange={ctl.setSource} onRun={doRun} onCheck={doCheck} fontSize={state.settings.editorFontSize} ariaLabel={`Python editor for ${ex.title}`} />
          <div className="wb-toolbar">
            <button className="btn btn-primary" onClick={doRun} disabled={!!ctl.busy} title="Run (⌘/Ctrl+Enter)" data-testid="run-btn">
              {ctl.busy === 'run' ? <Loader2 size={15} className="spin" /> : <Play size={15} />} Run
            </button>
            <button className="btn btn-check" onClick={doCheck} disabled={!!ctl.busy} title="Check against all fixtures (⌘/Ctrl+Shift+Enter)" data-testid="check-btn">
              {ctl.busy === 'check' ? <Loader2 size={15} className="spin" /> : <CheckCheck size={15} />} Check
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirmReset(true)} disabled={!!ctl.busy} data-testid="reset-btn">
              <RotateCcw size={15} /> Reset
            </button>
            <span className="spacer" />
            <span className="autosave" data-testid="autosave" data-state={ctl.saveState} aria-live="polite">
              {ctl.saveState === 'unsaved' ? <CloudOff size={13} /> : <Cloud size={13} />}
              {ctl.saveState === 'pending' ? 'Saving…' : ctl.saveState === 'saved' ? 'Saved' : 'Not saved — storage unavailable'}
            </span>
          </div>
        </div>
        <div className="wb-output">
          <div className="tabs" role="tablist" aria-label="Results">
            <button role="tab" className="tab" aria-selected={shownOut === 'output'} onClick={() => setOutTab('output')}>
              Output
            </button>
            <button role="tab" className="tab" aria-selected={shownOut === 'check'} onClick={() => setOutTab('check')}>
              Check results
              {ctl.checkResult && (
                <span className={`badge ${ctl.checkResult.graded.passed ? 'badge-success' : 'badge-warning'}`}>
                  {ctl.checkResult.graded.passedCount}/{ctl.checkResult.graded.totalCount}
                </span>
              )}
            </button>
          </div>
          <div className="wb-scroll" aria-live="polite">
            {ctl.runtimeError && (
              <div className="error-box" role="alert">
                <h4>The Python runtime had a problem</h4>
                <p className="small">{ctl.runtimeError}. Your code is safe — try again.</p>
              </div>
            )}
            {shownOut === 'output' ? (
              ctl.busy === 'run' ? (
                <p className="muted small">{status.state === 'loading' ? 'Loading the Python interpreter (first run only)…' : 'Running…'}</p>
              ) : ctl.runResult ? (
                <RunOutput result={ctl.runResult} />
              ) : (
                <p className="muted small">
                  Press <strong>Run</strong> to execute your code with the <em>{fixture.kind}</em> input and see its output. Press <strong>Check</strong> to test every requirement against all
                  fixtures.
                </p>
              )
            ) : ctl.busy === 'check' ? (
              <p className="muted small">Checking against {ex.cases.length} fixtures…</p>
            ) : ctl.checkResult ? (
              <CheckResults graded={ctl.checkResult.graded} outcome={ctl.checkResult.outcome} onOpenExercise={onOpenExercise} />
            ) : (
              <p className="muted small">No Check yet. Check runs your program against {ex.cases.length} fixtures and records the attempt.</p>
            )}
          </div>
        </div>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Reset to the starter code?"
          body="Your current code is saved as a snapshot first, so you can restore it from History."
          confirmLabel="Reset"
          onConfirm={() => {
            ctl.reset();
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </section>
  );
}
