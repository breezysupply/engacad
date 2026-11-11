import { ArrowRight, CalendarClock, CheckCircle2, Clock, Radar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNow, useProgress } from '../../app/providers';
import { LevelBadge, OriginBadge } from '../../components/Badges';
import { LABS, lessonById } from '../../content';
import { BEACON_MILESTONES, MODULES, WEEKS, moduleById, weekById } from '../../curriculum/roadmap';
import { EVIDENCE_LEVELS } from '../../curriculum/types';
import { reviewsDue, reviewsUpcoming } from '../../progress/model';
import { independentSkills, lessonProgress, nextSession } from '../../progress/selectors';
import { skillById } from '../../content/skills';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const roundMinutes = (m: number) => Math.max(5, Math.round(m / 5) * 5);

export function Dashboard() {
  const state = useProgress();
  const now = useNow();
  const next = nextSession(state);
  const due = reviewsDue(state.reviews, now);
  const upcoming = reviewsUpcoming(state.reviews, now);
  const indep = independentSkills(state);
  const week = next ? weekById(next.lesson.weekId) : WEEKS[0];
  const mod = week ? moduleById(week.moduleId) : MODULES[0];
  const w01Lessons = WEEKS[0].lessonIds.map((id) => lessonById(id)!);
  const w01 = w01Lessons.map((l) => lessonProgress(l, state));
  const w01Done = w01.reduce((n, p) => n + p.done, 0);
  const w01Total = w01.reduce((n, p) => n + p.total, 0);
  const counts = EVIDENCE_LEVELS.map((l) => [l, state.evidence.filter((e) => e.level === l).length] as const);
  const pendingLabs = LABS.filter((l) => state.labs[l.id]?.status === 'in-progress');
  const diagnosticDone = state.diagnostics.some((d) => d.completed);
  const milestone = BEACON_MILESTONES[0];
  const resumeEx = next?.resume && state.meta.lastLocation?.exerciseId ? state.meta.lastLocation.exerciseId : next?.item?.kind === 'exercise' ? next.item.id : undefined;
  const availableWeeks = WEEKS.filter((w) => w.status === 'available').length;

  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">
          Week {String(week?.number ?? 1).padStart(2, '0')} · Module {String(mod?.number ?? 0).padStart(2, '0')} — {mod?.title}
        </div>
        <h1>Dashboard</h1>
      </div>

      <section className="continue-card" aria-labelledby="continue-h">
        {next ? (
          <>
            <div className="eyebrow">{next.resume ? 'Pick up where you left off' : 'Your next session'}</div>
            <h2 id="continue-h">{next.lesson.title}</h2>
            <p className="card-sub" style={{ maxWidth: '62ch' }}>
              {next.item ? (
                <>
                  Next: <strong>{next.item.label}</strong>.{' '}
                </>
              ) : null}
              {next.lesson.summary}
            </p>
            <div className="row" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-4)' }}>
              <Link className="btn btn-primary btn-lg" to={`/learn/lesson/${next.lesson.id}${resumeEx ? `?exercise=${resumeEx}` : ''}`}>
                Continue learning <ArrowRight size={17} />
              </Link>
              <span className="row muted small">
                <Clock size={15} /> about {roundMinutes(next.remainingMinutes)} min remaining in this lesson
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow">All available lessons complete</div>
            <h2 id="continue-h">Week 01 is done</h2>
            <p className="card-sub">
              Week 02 (Python values, types and f-strings — Beacon v0.1) is waiting for its approved reference unit. Meanwhile, reviews and the optional real Python lab are
              available.
            </p>
            <Link className="btn" to="/learn">
              View the curriculum
            </Link>
          </>
        )}
      </section>

      <div className="dash-grid">
        <div className="stack">
          <section className="card" aria-labelledby="indep-h">
            <h3 className="card-title" id="indep-h">
              <Sparkles size={17} /> What you can now do independently
            </h3>
            {indep.length ? (
              <ul className="list-plain">
                {indep.map((s) => (
                  <li key={s.skillId}>
                    <CheckCircle2 size={17} color="var(--success)" style={{ flex: 'none', marginTop: 3 }} />
                    <div style={{ flex: 1 }}>
                      <div>{s.canDo}</div>
                      <div className="row small" style={{ marginTop: 4 }}>
                        <LevelBadge level={s.level} />
                        {s.origins.map((o) => (
                          <OriginBadge key={o} origin={o as never} />
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small" style={{ margin: 0 }}>
                Nothing yet — and that is accurate. Skills appear here once you pass an independent Check, not when you open a page.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="prog-h">
            <h3 className="card-title" id="prog-h">
              Progress
            </h3>
            <div className="grid grid-3">
              <div className="stat">
                <span className="stat-value">
                  {w01Done}/{w01Total}
                </span>
                <span className="stat-label">Week 01 learning actions</span>
              </div>
              <div className="stat">
                <span className="stat-value">{state.attempts.length}</span>
                <span className="stat-label">Check attempts recorded</span>
              </div>
              <div className="stat">
                <span className="stat-value">
                  {availableWeeks}/52
                </span>
                <span className="stat-label">weeks authored so far</span>
              </div>
            </div>
            <div className="progressbar" style={{ marginTop: 'var(--space-4)' }} aria-label="Week 01 progress">
              <span style={{ width: `${w01Total ? (100 * w01Done) / w01Total : 0}%` }} />
            </div>
            <div className="row small" style={{ marginTop: 'var(--space-4)' }}>
              <span className="muted">Evidence records:</span>
              {counts.map(([l, n]) => (
                <span key={l} className="badge">
                  {l} {n}
                </span>
              ))}
            </div>
            {(!diagnosticDone || pendingLabs.length > 0) && (
              <>
                <hr className="divider" />
                <div className="small">
                  <strong>Pending</strong>
                  <ul className="list-plain">
                    {!diagnosticDone && (
                      <li>
                        Baseline diagnostic not yet completed — <Link to="/learn/lesson/w01-l2">take it</Link>
                      </li>
                    )}
                    {pendingLabs.map((l) => (
                      <li key={l.id}>
                        Lab in progress, evidence not submitted: <Link to={`/labs/${l.id}`}>{l.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby="rev-h">
            <h3 className="card-title" id="rev-h">
              <CalendarClock size={17} /> Reviews due
            </h3>
            {due.length ? (
              <>
                <p className="small" style={{ marginBottom: 8 }}>
                  {due.length} short review{due.length > 1 ? 's' : ''} ready (about {due.length * 5} min).
                </p>
                <ul className="list-plain small">
                  {due.slice(0, 4).map((r) => (
                    <li key={r.id}>
                      <Link to={`/review/${encodeURIComponent(r.id)}`}>{skillById(r.skillId)?.title ?? r.skillId}</Link>
                      <span className="spacer" />
                      <span className="muted">step {r.step + 1}/4</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="small muted" style={{ marginBottom: 0 }}>
                No reviews due.{' '}
                {upcoming.length ? <>Next: {fmtDate(upcoming[0].dueAt)}.</> : 'Reviews are scheduled after you demonstrate a skill.'} Missed reviews simply wait for you.
              </p>
            )}
          </section>

          <section className="card" aria-labelledby="beacon-h">
            <h3 className="card-title" id="beacon-h">
              <Radar size={17} /> Beacon milestone
            </h3>
            <div className="row" style={{ marginBottom: 6 }}>
              <strong>
                {milestone.version} — {milestone.title}
              </strong>
              <span className="badge badge-warning">Awaiting Week 02 content</span>
            </div>
            <p className="small muted" style={{ marginBottom: 8 }}>
              {milestone.description} Built in Week 02 once its approved reference unit is loaded.
            </p>
            <Link to="/beacon" className="small">
              Project timeline →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
