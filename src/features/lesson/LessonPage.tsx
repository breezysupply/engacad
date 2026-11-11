import { BookOpen, CheckCircle2, Code2, Columns2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useProgress, useStore } from '../../app/providers';
import { exerciseById, exercisesForLesson, lessonById } from '../../content';
import { moduleById, weekById } from '../../curriculum/roadmap';
import type { Exercise, Lesson } from '../../curriculum/types';
import { lessonProgress } from '../../progress/selectors';
import { Block, type BlockContext } from './Blocks';
import { useExercise } from './useExercise';
import { Workbench } from './Workbench';

const STAGE_LABEL: Record<string, string> = {
  why: 'Why it matters',
  model: 'Mental model',
  walkthrough: 'Walkthrough',
  guided: 'Guided practice',
  independent: 'Independent',
  takeaway: 'Takeaway',
  transfer: 'Transfer',
};

type Focus = 'balanced' | 'reading' | 'coding';

const readLocal = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const writeLocal = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* per-viewer convenience only */
  }
};

function ExerciseWorkbench({ ex, onOpenExercise }: { ex: Exercise; onOpenExercise: (id: string) => void }) {
  const ctl = useExercise(ex, ex.id);
  return <Workbench ex={ex} stateKey={ex.id} ctl={ctl} onOpenExercise={onOpenExercise} />;
}

export function LessonPage() {
  const { lessonId = '' } = useParams();
  const lesson = lessonById(lessonId);
  if (!lesson) return <Navigate to="/learn" replace />;
  return <LessonView key={lesson.id} lesson={lesson} />;
}

function LessonView({ lesson }: { lesson: Lesson }) {
  const store = useStore();
  const state = useProgress();
  const [params, setParams] = useSearchParams();
  const rec = state.lessons[lesson.id];
  const exercises = useMemo(() => exercisesForLesson(lesson.id), [lesson.id]);
  const paramEx = params.get('exercise');
  const activeId = (paramEx && exercises.some((e) => e.id === paramEx) ? paramEx : undefined) ?? rec?.activeExerciseId ?? exercises[0]?.id;
  const active = activeId ? exerciseById(activeId) : undefined;
  const [current, setCurrent] = useState<string>(rec?.lastSectionId ?? lesson.sections[0].id);
  const [railCollapsed, setRailCollapsed] = useState(() => readLocal('engacad.railCollapsed', false));
  const [focus, setFocus] = useState<Focus>(() => readLocal('engacad.focus', 'balanced'));
  const [wbWidth, setWbWidth] = useState<number | null>(() => readLocal<number | null>('engacad.wbWidth', null));
  const mainRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const progress = lessonProgress(lesson, state);
  const week = weekById(lesson.weekId)!;
  const mod = moduleById(lesson.moduleId)!;

  const openExercise = useCallback(
    (id: string) => {
      const ex = exerciseById(id);
      if (!ex) return;
      if (ex.lessonId !== lesson.id) return;
      store.setActiveExercise(lesson.id, id);
      setParams({ exercise: id }, { replace: true });
      if (focus === 'reading') setFocus('balanced');
      if (window.matchMedia('(max-width: 900px)').matches) document.querySelector('.workbench')?.scrollIntoView({ behavior: 'smooth' });
    },
    [lesson.id, setParams, store, focus],
  );

  // remember the active exercise (including one chosen via ?exercise=) and the location
  useEffect(() => {
    if (activeId) store.setActiveExercise(lesson.id, activeId);
    else store.setLocation(lesson.id, store.state.lessons[lesson.id]?.lastSectionId);
  }, [lesson.id, activeId, store]);

  // restore reading position once
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const target = rec?.lastSectionId;
    if (target && target !== lesson.sections[0].id) {
      requestAnimationFrame(() => document.getElementById(`sec-${target}`)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' }));
    }
  }, [rec?.lastSectionId, lesson.sections]);

  // track sections seen / current section
  useEffect(() => {
    const root = window.matchMedia('(max-width: 900px)').matches ? null : mainRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.section!;
            setCurrent(id);
            store.markSectionSeen(lesson.id, id);
          }
        }
      },
      { root, rootMargin: '0px 0px -55% 0px', threshold: 0 },
    );
    mainRef.current?.querySelectorAll('[data-section]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [lesson.id, store]);

  useEffect(() => writeLocal('engacad.focus', focus), [focus]);
  useEffect(() => writeLocal('engacad.railCollapsed', railCollapsed), [railCollapsed]);

  const startDrag = (e: React.PointerEvent) => {
    const layout = layoutRef.current;
    if (!layout) return;
    const el = e.currentTarget as HTMLElement;
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = layout.getBoundingClientRect();
      const w = Math.min(Math.max(rect.right - ev.clientX, 340), rect.width - 420);
      setWbWidth(w);
    };
    const up = () => {
      el.classList.remove('dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setWbWidth((w) => (writeLocal('engacad.wbWidth', w), w));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onSplitterKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const rect = layoutRef.current!.getBoundingClientRect();
    const cur = wbWidth ?? rect.width * 0.46;
    const next = Math.min(Math.max(cur + (e.key === 'ArrowLeft' ? 40 : -40), 340), rect.width - 420);
    setWbWidth(next);
    writeLocal('engacad.wbWidth', next);
  };

  const ctx: BlockContext = { lessonId: lesson.id, activeExerciseId: activeId, openExercise };
  const hasWorkbench = !!active;
  const cls = ['lesson-layout', railCollapsed || focus === 'coding' ? 'rail-collapsed' : '', !hasWorkbench ? 'no-workbench' : '', hasWorkbench && focus !== 'balanced' ? `focus-${focus}` : '']
    .filter(Boolean)
    .join(' ');
  const style = hasWorkbench && wbWidth && focus === 'balanced' ? ({ '--wb-w': `${wbWidth}px` } as React.CSSProperties) : undefined;

  return (
    <div className={cls} ref={layoutRef} style={style} data-testid="lesson-layout">
      <nav className="rail" aria-label="Lesson sections">
        <button
          className="btn btn-ghost icon-btn rail-toggle"
          onClick={() => setRailCollapsed((c: boolean) => !c)}
          aria-label={railCollapsed ? 'Expand course rail' : 'Collapse course rail'}
          title={railCollapsed ? 'Expand' : 'Collapse'}
        >
          {railCollapsed || focus === 'coding' ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <div className="rail-meta">
          <Link to={`/learn/week/${week.id}`}>
            Week {String(week.number).padStart(2, '0')} · {mod.title}
          </Link>
        </div>
        {lesson.sections.map((s) => (
          <button
            key={s.id}
            className={`rail-section ${current === s.id ? 'current' : ''}`}
            onClick={() => document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            title={s.title}
            aria-current={current === s.id ? 'location' : undefined}
          >
            <span className={`dot ${rec?.sectionsSeen.includes(s.id) ? 'seen' : ''}`} aria-hidden />
            <span className="rail-label">{s.title}</span>
          </button>
        ))}
        <div className="rail-meta" style={{ marginTop: 12 }}>
          {progress.done}/{progress.total} learning actions done
        </div>
      </nav>

      <div className="lesson-main" ref={mainRef} id="lesson-main">
        <div className="lesson-main-inner">
          <header>
            <div className="eyebrow">
              <Link to="/learn">Learn</Link> / Week {String(week.number).padStart(2, '0')} / Lesson {lesson.order}
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <h1 style={{ flex: 1 }}>{lesson.title}</h1>
              {hasWorkbench && (
                <div className="row focus-toggle" role="group" aria-label="Layout focus">
                  <button className={`btn btn-sm ${focus === 'reading' ? 'btn-primary' : ''}`} onClick={() => setFocus('reading')} aria-pressed={focus === 'reading'} title="Reading focus">
                    <BookOpen size={14} /> Read
                  </button>
                  <button className={`btn btn-sm ${focus === 'balanced' ? 'btn-primary' : ''}`} onClick={() => setFocus('balanced')} aria-pressed={focus === 'balanced'} title="Balanced">
                    <Columns2 size={14} />
                  </button>
                  <button className={`btn btn-sm ${focus === 'coding' ? 'btn-primary' : ''}`} onClick={() => setFocus('coding')} aria-pressed={focus === 'coding'} title="Coding focus">
                    <Code2 size={14} /> Code
                  </button>
                </div>
              )}
            </div>
            <p className="card-sub">
              {lesson.summary} · about {lesson.estimatedMinutes} minutes
            </p>
            <ul className="objectives small">
              {lesson.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </header>

          {lesson.sections.map((s) => (
            <section key={s.id} id={`sec-${s.id}`} data-section={s.id} className="lesson-section" aria-labelledby={`h-${s.id}`}>
              <h2 id={`h-${s.id}`}>
                {s.title} <span className="stage-tag">{STAGE_LABEL[s.stage]}</span>
              </h2>
              {s.blocks.map((b, i) => (
                <Block key={i} block={b} ctx={ctx} />
              ))}
            </section>
          ))}

          <hr className="divider" style={{ margin: '40px 0 20px' }} />
          <div className="card">
            {rec?.introducedAt ? (
              <p className="row" style={{ margin: 0 }}>
                <CheckCircle2 size={18} color="var(--success)" /> Explanations completed {new Date(rec.introducedAt).toLocaleDateString()} — recorded as <strong>Introduced</strong>.
              </p>
            ) : (
              <div className="row">
                <span style={{ flex: 1 }} className="small">
                  Finished working through the explanations? This records <strong>Introduced</strong> evidence only — exercises and Check provide the rest.
                </span>
                <button className="btn btn-primary" onClick={() => store.completeLessonReading(lesson.id)} data-testid="complete-reading">
                  Mark explanations complete
                </button>
              </div>
            )}
            {lesson.nextLessonId && (
              <div style={{ marginTop: 12 }}>
                <Link to={`/learn/lesson/${lesson.nextLessonId}`}>Next lesson: {lessonById(lesson.nextLessonId)?.title} →</Link>
              </div>
            )}
            {!lesson.nextLessonId && (
              <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
                Next: Week 02 — Python values, types and f-strings (Beacon v0.1). It becomes available once its approved reference unit is loaded.
              </p>
            )}
          </div>
        </div>
      </div>

      {hasWorkbench && (
        <>
          <div
            className="splitter"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize code pane (arrow keys)"
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={onSplitterKey}
          />
          <ExerciseWorkbench key={active.id} ex={active} onOpenExercise={openExercise} />
        </>
      )}
    </div>
  );
}
