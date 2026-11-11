import { Link } from 'react-router-dom';
import { useProgress } from '../../app/providers';
import { LabModeBadge } from '../../components/Badges';
import { LABS } from '../../content';
import { PLANNED_LABS } from '../../curriculum/roadmap';
import type { LabMode } from '../../curriculum/types';

const MODES: [LabMode, string][] = [
  ['browser-python', 'Real Python, executed in this browser by Pyodide. Checked automatically.'],
  ['real-local', 'You work in a real terminal on your Mac. EngAcad cannot observe it; evidence you paste is self-reported.'],
  ['real-codespaces', 'A real Linux container from this repository’s dev container. Mind the included-usage allowance.'],
  ['simulation', 'A deterministic scripted scenario. It proves reasoning inside the scenario, not a real infrastructure change.'],
];

export function LabsPage() {
  const state = useProgress();
  return (
    <div className="page">
      <div className="page-header">
        <h1>Labs</h1>
        <p>Hands-on environments, always labelled by how real they are. Nothing here creates paid cloud resources on your behalf.</p>
      </div>
      <section className="card" aria-labelledby="modes-h">
        <h2 className="card-title" id="modes-h">
          Environment types
        </h2>
        <table className="table">
          <tbody>
            {MODES.map(([m, d]) => (
              <tr key={m}>
                <td style={{ width: 190 }}>
                  <LabModeBadge mode={m} />
                </td>
                <td className="small">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <h2 style={{ marginTop: 32 }}>Available</h2>
      <div className="grid grid-2">
        {LABS.filter((l) => l.status === 'available').map((l) => {
          const rec = state.labs[l.id];
          return (
            <Link key={l.id} to={`/labs/${l.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none', marginTop: 0 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="week-num">W{l.weekId.slice(1)}</span>
                {l.mode.map((m) => (
                  <LabModeBadge key={m} mode={m} />
                ))}
                {l.optional && <span className="badge">Optional</span>}
              </div>
              <h3 style={{ marginBottom: 4 }}>{l.title}</h3>
              <p className="small muted" style={{ marginBottom: 8 }}>
                {l.objective}
              </p>
              <span className="small">
                {rec?.status === 'evidence-submitted' ? (
                  <span className="badge badge-self">Self-reported evidence submitted</span>
                ) : rec?.status === 'in-progress' ? (
                  <span className="badge badge-warning">In progress</span>
                ) : (
                  <span className="muted">~{l.estimatedMinutes} min · not started</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
      <h2 style={{ marginTop: 32 }}>Planned</h2>
      <p className="small muted">Representative labs from later modules. They are not built yet and cannot be started.</p>
      <div className="week-list">
        {PLANNED_LABS.map((l) => (
          <div key={l.title} className="week-row is-planned" aria-disabled="true">
            <span className="week-num">W{String(l.weekNumber).padStart(2, '0')}</span>
            <span className="week-focus">{l.title}</span>
            <span className="row">
              <LabModeBadge mode={l.mode} />
              <span className="badge badge-planned">Planned</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
