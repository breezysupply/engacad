import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useProgress } from '../../app/providers';
import { LabModeBadge } from '../../components/Badges';
import { labById, lessonById } from '../../content';
import { moduleById, weekById } from '../../curriculum/roadmap';
import { lessonProgress } from '../../progress/selectors';

export function WeekPage() {
  const { weekId = '' } = useParams();
  const week = weekById(weekId);
  const state = useProgress();
  if (!week || week.status !== 'available') return <Navigate to="/learn" replace />;
  const mod = moduleById(week.moduleId)!;
  const lessons = week.lessonIds.map((id) => lessonById(id)!);
  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div className="eyebrow">
          <Link to="/learn">Learn</Link> / Module {String(mod.number).padStart(2, '0')} — {mod.title}
        </div>
        <h1>
          Week {String(week.number).padStart(2, '0')}: {mod.title}
        </h1>
        <p>{week.focus}.</p>
        <p className="small muted">Practical output: {week.output}.</p>
      </div>
      <div className="stack">
        {lessons.map((l) => {
          const p = lessonProgress(l, state);
          return (
            <section key={l.id} className="card" style={{ marginTop: 0 }}>
              <div className="row">
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
                  <Link to={`/learn/lesson/${l.id}`}>{l.title}</Link>
                </h2>
                <span className="spacer" />
                <span className="row small muted">
                  <Clock size={14} /> {l.estimatedMinutes} min
                </span>
              </div>
              <p className="card-sub" style={{ margin: '6px 0 12px' }}>
                {l.summary}
              </p>
              <ul className="list-plain small">
                {p.items.map((i) => (
                  <li key={i.id}>
                    {i.done ? <CheckCircle2 size={16} color="var(--success)" /> : <Circle size={16} color="var(--text-3)" />}
                    <span style={{ flex: 1 }}>{i.label}</span>
                    <span className="muted">{i.minutes} min</span>
                  </li>
                ))}
              </ul>
              <div className="row" style={{ marginTop: 12 }}>
                <Link className="btn btn-primary btn-sm" to={`/learn/lesson/${l.id}`}>
                  {p.done ? (p.complete ? 'Revisit' : 'Continue') : 'Start'}
                </Link>
                <span className="small muted">
                  {p.done}/{p.total} done
                </span>
              </div>
            </section>
          );
        })}
        {week.labIds.map((id) => {
          const lab = labById(id)!;
          return (
            <section key={id} className="card" style={{ marginTop: 0 }}>
              <div className="row">
                <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
                  <Link to={`/labs/${id}`}>{lab.title}</Link>
                </h2>
                {lab.optional && <span className="badge">Optional</span>}
                <span className="spacer" />
                {lab.mode.map((m) => (
                  <LabModeBadge key={m} mode={m} />
                ))}
              </div>
              <p className="card-sub" style={{ margin: '6px 0 0' }}>
                {lab.objective}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}
