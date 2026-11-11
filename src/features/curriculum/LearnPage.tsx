import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WeekStatusBadge } from '../../components/Badges';
import { MODULES, WEEKS } from '../../curriculum/roadmap';

export function LearnPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">52-week core curriculum</div>
        <h1>Learn</h1>
        <p>
          The full plan is shown so you can see where each skill leads. Only <strong>Available</strong> weeks contain authored lessons. Weeks marked <em>Planned</em> describe
          scope only: they are not lessons yet and never count toward your progress.
        </p>
        <div className="row small">
          <WeekStatusBadge status="available" /> authored and tested
          <WeekStatusBadge status="awaiting-content" /> platform ready, waiting for the approved reference unit
          <WeekStatusBadge status="planned" /> scope only
        </div>
      </div>
      {MODULES.map((m) => {
        const weeks = WEEKS.filter((w) => w.moduleId === m.id);
        return (
          <section key={m.id} className="module-block" aria-labelledby={`mod-${m.id}`}>
            <div className="module-head">
              <span className="week-num">Module {String(m.number).padStart(2, '0')}</span>
              <h2 id={`mod-${m.id}`}>{m.title}</h2>
              <span className="muted small">
                Week{m.weeks[0] === m.weeks[1] ? ` ${m.weeks[0]}` : `s ${m.weeks[0]}–${m.weeks[1]}`}
              </span>
            </div>
            <p className="small muted" style={{ maxWidth: '80ch' }}>
              {m.description}
              {m.note && <> {m.note}</>}
            </p>
            <div className="week-list">
              {weeks.map((w) => {
                const inner = (
                  <>
                    <span className="week-num">W{String(w.number).padStart(2, '0')}</span>
                    <span>
                      <div className="week-focus">{w.focus}</div>
                      <div className="week-output">Practical output: {w.output}</div>
                    </span>
                    <span className="row">
                      <WeekStatusBadge status={w.status} />
                      {w.status === 'available' && <ChevronRight size={16} aria-hidden />}
                    </span>
                  </>
                );
                return w.status === 'available' ? (
                  <Link key={w.id} to={`/learn/week/${w.id}`} className="week-row" data-testid={`week-${w.id}`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={w.id} className="week-row is-planned" data-testid={`week-${w.id}`} aria-disabled="true">
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
