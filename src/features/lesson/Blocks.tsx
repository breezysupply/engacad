import { CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock, FlaskConical, Info, Lightbulb, Play, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress, useRuntimeStatus, useStore } from '../../app/providers';
import { LabModeBadge, ModeBadge } from '../../components/Badges';
import { CodeBlock } from '../../components/CodeBlock';
import { Diagram } from '../../components/Diagrams';
import { highlightPython } from '../../components/highlight';
import { Markdown } from '../../components/Markdown';
import { diagnosticById, exerciseById, labById } from '../../content';
import type { ContentBlock, DiagnosticQuestion } from '../../curriculum/types';
import { uid } from '../../progress/model';
import { getRuntime } from '../../runtime/python/client';
import type { RunResult } from '../../runtime/python/protocol';
import { CodeEditor } from '../editor/CodeEditor';
import { RunOutput } from './Results';
import { RuntimeIndicator } from './Workbench';

export interface BlockContext {
  lessonId: string;
  activeExerciseId?: string;
  openExercise: (id: string) => void;
}

export function Block({ block, ctx }: { block: ContentBlock; ctx: BlockContext }) {
  switch (block.type) {
    case 'markdown':
      return <Markdown text={block.md} />;
    case 'callout': {
      const Icon = { info: Info, tip: Lightbulb, warn: TriangleAlert, safety: ShieldAlert }[block.tone];
      return (
        <div className={`callout callout-${block.tone}`} role="note">
          <div className="callout-title">
            <Icon size={16} /> {block.title}
          </div>
          <Markdown text={block.md} className="prose small" />
        </div>
      );
    }
    case 'code':
      return <CodeBlock code={block.code} language={block.language} caption={block.caption} />;
    case 'example':
      return <ExampleRunner id={block.id} title={block.title} code={block.code} caption={block.caption} inputs={block.inputs} />;
    case 'walkthrough':
      return <Walkthrough title={block.title} code={block.code} steps={block.steps} />;
    case 'diagram':
      return <Diagram id={block.diagramId} caption={block.caption} />;
    case 'exercise':
      return <ExerciseCard id={block.exerciseId} ctx={ctx} />;
    case 'quiz':
      return <Quiz lessonId={ctx.lessonId} {...block} />;
    case 'reflection':
      return <Reflection id={block.id} prompt={block.prompt} criteria={block.criteria} />;
    case 'takeaway':
      return (
        <div className="takeaway">
          <ul>
            {block.points.map((p) => (
              <li key={p}>
                <Markdown text={p} className="" />
              </li>
            ))}
          </ul>
        </div>
      );
    case 'envcheck':
      return <EnvCheck />;
    case 'diagnostic':
      return <DiagnosticBlock id={block.diagnosticId} />;
    case 'lab-link':
      return <LabLink id={block.labId} />;
  }
}

function ExampleRunner({ id, title, code, caption, inputs }: { id: string; title: string; code: string; caption?: string; inputs?: Record<string, string> }) {
  const store = useStore();
  const { settings } = useProgress();
  const key = `example:${id}`;
  const [src, setSrc] = useState(() => store.state.drafts[key]?.source ?? code);
  const [res, setRes] = useState<RunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = (v: string) => {
    setSrc(v);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => store.saveDraft(key, v), 400);
  };
  const run = async () => {
    setBusy(true);
    try {
      setRes(await getRuntime().run(src, inputs ?? {}));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="example" data-testid={`example-${id}`}>
      <div className="example-head">
        <Play size={15} /> {title}
        <span className="badge">Not graded</span>
        <span className="spacer" />
        {src !== code && (
          <button className="btn btn-ghost btn-sm" onClick={() => change(code)}>
            Restore original
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
          <Play size={13} /> {busy ? 'Running…' : 'Run'}
        </button>
      </div>
      {inputs && (
        <div className="wb-inputs">
          <span className="muted">Inputs:</span>
          {Object.entries(inputs).map(([k, v]) => (
            <span key={k} className="input-chip">
              {k} = {v}
            </span>
          ))}
        </div>
      )}
      <CodeEditor value={src} onChange={change} onRun={run} fontSize={settings.editorFontSize} ariaLabel={`Example editor: ${title}`} />
      {caption && <div className="codeblock-caption">{caption}</div>}
      {res && (
        <div className="example-out">
          <RunOutput result={res} />
        </div>
      )}
    </div>
  );
}

function Walkthrough({ title, code, steps }: { title: string; code: string; steps: { lines: [number, number]; md: string }[] }) {
  const [i, setI] = useState(0);
  const lines = useMemo(() => highlightPython(code), [code]);
  const [a, b] = steps[i].lines;
  return (
    <div className="walk" data-testid="walkthrough">
      <div className="example-head">
        {title}
        <span className="spacer" />
        <span className="small muted">
          Step {i + 1} of {steps.length}
        </span>
      </div>
      <div className="walk-code">
        <pre>
          {lines.map((html, n) => (
            <span key={n} className={`walk-line ${n + 1 >= a && n + 1 <= b ? 'hl' : ''}`}>
              <span className="ln">{n + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: html || ' ' }} />
            </span>
          ))}
        </pre>
      </div>
      <div className="walk-steps">
        <Markdown text={steps[i].md} className="prose small" />
        <div className="row">
          <button className="btn btn-sm" onClick={() => setI((x) => x - 1)} disabled={i === 0}>
            <ChevronLeft size={14} /> Previous
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => setI((x) => x + 1)} disabled={i === steps.length - 1}>
            Next step <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExerciseCard({ id, ctx }: { id: string; ctx: BlockContext }) {
  const ex = exerciseById(id)!;
  const state = useProgress();
  const attempts = state.attempts.filter((a) => a.exerciseId === id && !a.reviewId);
  const passed = attempts.some((a) => a.passed);
  const active = ctx.activeExerciseId === id;
  return (
    <div className={`exercise-card ${active ? 'active' : ''}`} data-testid={`exercise-card-${id}`}>
      <div className="row">
        <ModeBadge mode={ex.mode} />
        <strong>{ex.title}</strong>
        <span className="spacer" />
        <span className="row small muted">
          <Clock size={14} /> {ex.estimatedMinutes} min
        </span>
      </div>
      <p className="small muted" style={{ margin: '8px 0' }}>
        {ex.mode === 'guided' ? 'Scaffolded practice with a 4-level hint ladder. A pass records Guided evidence.' : `Independent task. A pass within the allowed hints (level ≤ ${ex.allowedHintLevel}) records Applied evidence.`}
      </p>
      <div className="row">
        <button className="btn btn-sm btn-primary" onClick={() => ctx.openExercise(id)} aria-pressed={active}>
          {active ? 'Open in workbench →' : 'Open in workbench'}
        </button>
        {passed ? (
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Passed
          </span>
        ) : attempts.length ? (
          <span className="badge badge-warning">{attempts.length} attempt{attempts.length > 1 ? 's' : ''}, not yet passed</span>
        ) : null}
      </div>
    </div>
  );
}

function Quiz({ lessonId, id, question, options, answerIndex, explanation }: { lessonId: string; id: string; question: string; options: string[]; answerIndex: number; explanation: string }) {
  const store = useStore();
  const state = useProgress();
  const chosen = state.lessons[lessonId]?.quizAnswers[id];
  const answered = chosen !== undefined && chosen >= 0;
  return (
    <div className="quiz" data-testid={`quiz-${id}`}>
      <div className="row small muted" style={{ marginBottom: 6 }}>
        <CircleAlert size={14} /> Quick check · not graded
      </div>
      <Markdown text={question} className="prose" />
      {options.map((o, i) => (
        <button
          key={o}
          className={`quiz-option ${answered && i === answerIndex ? 'correct' : answered && i === chosen ? 'wrong' : ''}`}
          disabled={answered}
          onClick={() => store.answerQuiz(lessonId, id, i)}
        >
          <span>{String.fromCharCode(65 + i)}.</span> <span>{o}</span>
        </button>
      ))}
      {answered && (
        <div className="callout callout-info small" role="status">
          <div className="callout-title">{chosen === answerIndex ? 'Correct' : 'Not quite'}</div>
          {explanation}
          {chosen !== answerIndex && (
            <div style={{ marginTop: 6 }}>
              <button className="btn btn-sm" onClick={() => store.answerQuiz(lessonId, id, -1)}>
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Reflection({ id, prompt, criteria }: { id: string; prompt: string; criteria: string[] }) {
  const store = useStore();
  const state = useProgress();
  const saved = state.notes[`reflection:${id}`];
  const [text, setText] = useState(saved?.text ?? '');
  const [show, setShow] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (t.current && clearTimeout(t.current)), []);
  return (
    <div className="quiz">
      <div className="row small muted" style={{ marginBottom: 6 }}>
        <Lightbulb size={14} /> Reflection · saved, not automatically graded
      </div>
      <p>{prompt}</p>
      <textarea
        value={text}
        aria-label="Your reflection"
        onChange={(e) => {
          setText(e.target.value);
          if (t.current) clearTimeout(t.current);
          const v = e.target.value;
          t.current = setTimeout(() => store.saveNote(`reflection:${id}`, v), 500);
        }}
        placeholder="Write a few sentences…"
      />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn btn-sm" onClick={() => setShow((s) => !s)}>
          {show ? 'Hide' : 'Compare with'} model criteria
        </button>
        {saved && <span className="small muted">Saved {new Date(saved.updatedAt).toLocaleTimeString()}</span>}
      </div>
      {show && (
        <ul className="small" style={{ marginTop: 8 }}>
          {criteria.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnvCheck() {
  const status = useRuntimeStatus();
  const store = useStore();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await getRuntime().run('import sys\nprint("Python", sys.version.split()[0], "is running in your browser")\nprint(2 + 2)', {});
      setResult({ ok: !r.error && r.stdout.includes('4'), text: r.stdout || r.error?.message || '' });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  const storage = store.storage;
  return (
    <div className="quiz" data-testid="envcheck">
      <h3 style={{ fontSize: '1rem' }}>Environment check</h3>
      <ul className="list-plain small">
        <li>
          <span style={{ flex: 1 }}>Python interpreter (Pyodide, in a Web Worker)</span>
          <RuntimeIndicator status={status} />
        </li>
        <li>
          <span style={{ flex: 1 }}>Progress storage (IndexedDB in this browser)</span>
          {storage.state === 'ok' ? (
            <span className="badge badge-success">Saving{storage.persisted ? ' · persistent' : ''}</span>
          ) : storage.state === 'memory-only' ? (
            <span className="badge badge-danger">Not saving</span>
          ) : (
            <span className="badge">Checking…</span>
          )}
        </li>
      </ul>
      {result && (
        <pre className="output-pre" style={{ marginTop: 8 }} data-testid="envcheck-output">
          {result.text}
        </pre>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
          <Play size={13} /> {busy ? 'Starting Python…' : result ? 'Run again' : 'Run environment check'}
        </button>
        {result?.ok && (
          <span className="badge badge-success">
            <CheckCircle2 size={12} /> Browser Python works
          </span>
        )}
        {storage.state === 'ok' && !storage.persisted && (
          <button className="btn btn-ghost btn-sm" onClick={() => void store.requestPersistence()}>
            Ask the browser to keep storage
          </button>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>
        Progress lives only in this browser profile. Export a backup from Skills &amp; Progress to move it or keep it safe; clearing site data erases it.
      </p>
    </div>
  );
}

const AREAS: Record<DiagnosticQuestion['area'], string> = { python: 'Python', linux: 'Linux & Bash', networking: 'Networking', git: 'Git' };

export function diagnosticProfile(questions: DiagnosticQuestion[], answers: Record<string, number | 'unsure'>) {
  return (Object.keys(AREAS) as DiagnosticQuestion['area'][]).map((area) => {
    const qs = questions.filter((q) => q.area === area);
    const correct = qs.filter((q) => answers[q.id] === q.answerIndex).length;
    const unsure = qs.filter((q) => answers[q.id] === 'unsure').length;
    return { area, label: AREAS[area], correct, total: qs.length, unsure };
  });
}

export function recommendation(p: ReturnType<typeof diagnosticProfile>[number]) {
  const ratio = p.total ? p.correct / p.total : 0;
  if (p.area === 'linux' || p.area === 'git')
    return ratio >= 0.75
      ? 'Strong baseline. Module 03 will offer a proficiency check so you can move faster through introductory material by demonstrating it.'
      : 'Follow the Linux module as designed; it emphasises operational depth.';
  if (p.area === 'python') return ratio >= 0.75 ? 'Week 02 should feel quick — still complete the checks to build evidence.' : 'Week 02 starts from first principles. This is the expected starting point.';
  return ratio >= 0.75 ? 'Good instincts. Module 04 will make them precise with real diagnostics.' : 'Module 04 builds this from layered mental models.';
}

function DiagnosticBlock({ id }: { id: string }) {
  const diag = diagnosticById(id)!;
  const store = useStore();
  const state = useProgress();
  const records = state.diagnostics.filter((d) => d.diagnosticId === id);
  const current = records.find((r) => !r.completed);
  const lastDone = [...records].reverse().find((r) => r.completed);
  const [retaking, setRetaking] = useState(false);
  const active = current ?? (retaking || !lastDone ? null : undefined);

  const answer = (qid: string, value: number | 'unsure') => {
    const rec = current ?? { id: uid(), diagnosticId: id, at: store.now(), answers: {}, completed: false };
    store.saveDiagnostic({ ...rec, answers: { ...rec.answers, [qid]: value } });
  };

  if (active === undefined && lastDone) {
    const profile = diagnosticProfile(diag.questions, lastDone.answers);
    return (
      <div className="quiz" data-testid="diagnostic-profile">
        <h3 style={{ fontSize: '1rem' }}>Your baseline profile</h3>
        <p className="small muted">Recorded {new Date(lastDone.at).toLocaleDateString()}. This is a planning snapshot — it awards and removes no evidence.</p>
        <table className="table">
          <tbody>
            {profile.map((p) => (
              <tr key={p.area}>
                <td style={{ width: 130 }}>
                  <strong>{p.label}</strong>
                </td>
                <td style={{ width: 90 }}>
                  {p.correct}/{p.total}
                  {p.unsure ? <div className="small muted">{p.unsure} unsure</div> : null}
                </td>
                <td className="small">{recommendation(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <details className="small" style={{ marginTop: 12 }}>
          <summary>Answers and explanations</summary>
          <ul>
            {diag.questions.map((q) => (
              <li key={q.id}>
                {q.question} <strong>{q.options[q.answerIndex]}</strong> — {q.explanation}
                {lastDone.answers[q.id] === q.answerIndex ? ' ✓' : ''}
              </li>
            ))}
          </ul>
        </details>
        <button className="btn btn-sm" onClick={() => setRetaking(true)} style={{ marginTop: 8 }}>
          Retake the diagnostic
        </button>
      </div>
    );
  }

  const answers = current?.answers ?? {};
  const answeredCount = Object.keys(answers).length;
  return (
    <div data-testid="diagnostic">
      <p className="small muted">
        {answeredCount}/{diag.questions.length} answered · your answers are saved as you go.
      </p>
      {diag.questions.map((q, n) => {
        const a = answers[q.id];
        return (
          <div key={q.id} className="quiz" data-testid={`diag-${q.id}`}>
            <div className="row small muted" style={{ marginBottom: 4 }}>
              <span className="badge">{AREAS[q.area]}</span> Question {n + 1}
            </div>
            <p style={{ marginBottom: 6 }}>{q.question}</p>
            {q.code && <CodeBlock code={q.code} />}
            {q.options.map((o, i) => (
              <button key={o} className={`quiz-option ${a === i ? 'chosen' : ''}`} onClick={() => answer(q.id, i)} aria-pressed={a === i}>
                <span>{String.fromCharCode(65 + i)}.</span> <span>{o}</span>
              </button>
            ))}
            <button className={`quiz-option ${a === 'unsure' ? 'chosen' : ''}`} onClick={() => answer(q.id, 'unsure')} aria-pressed={a === 'unsure'}>
              <span>?</span> <span>I’m not sure yet</span>
            </button>
          </div>
        );
      })}
      <div className="row">
        <button
          className="btn btn-primary"
          disabled={answeredCount < diag.questions.length || !current}
          onClick={() => {
            if (current) store.saveDiagnostic({ ...current, completed: true, at: store.now() });
            setRetaking(false);
          }}
        >
          Finish and see my profile
        </button>
        {answeredCount < diag.questions.length && <span className="small muted">Answer every question (“not sure” counts).</span>}
      </div>
    </div>
  );
}

function LabLink({ id }: { id: string }) {
  const lab = labById(id)!;
  const state = useProgress();
  const rec = state.labs[id];
  return (
    <div className="exercise-card">
      <div className="row">
        <FlaskConical size={16} />
        <strong>{lab.title}</strong>
        {lab.optional && <span className="badge">Optional</span>}
        <span className="spacer" />
        {lab.mode.map((m) => (
          <LabModeBadge key={m} mode={m} />
        ))}
      </div>
      <p className="small muted" style={{ margin: '8px 0' }}>
        {lab.objective} About {lab.estimatedMinutes} minutes.
      </p>
      <div className="row">
        <Link className="btn btn-sm btn-primary" to={`/labs/${id}`}>
          Open lab
        </Link>
        {rec?.status === 'evidence-submitted' && <span className="badge badge-self">Self-reported evidence submitted</span>}
      </div>
    </div>
  );
}
