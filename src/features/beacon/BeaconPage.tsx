import { Download, Radar } from 'lucide-react';
import { useRef, useState } from 'react';
import { useProgress, useStore } from '../../app/providers';
import { WeekStatusBadge } from '../../components/Badges';
import { EXERCISES } from '../../content';
import { BEACON_MILESTONES } from '../../curriculum/roadmap';
import { buildArtifact, downloadText } from './artifacts';

export function BeaconPage() {
  const state = useProgress();
  const store = useStore();
  const artifacts = EXERCISES.filter((e) => e.beaconArtifact);
  const note = state.notes['beacon:runbook'];
  const [text, setText] = useState(note?.text ?? '');
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <div className="page">
      <div className="page-header">
        <div className="eyebrow">Long-running project</div>
        <h1>Beacon</h1>
        <p>
          Beacon is a small, synthetic reliability-monitoring application that grows with the course — from a few printed measurements in Week 02 to a validated customer deployment in
          Week 52. Each milestone keeps its code, tests, README and evidence. All data is synthetic.
        </p>
      </div>
      <div className="dash-grid" style={{ marginTop: 0 }}>
        <section className="card" aria-labelledby="tl-h">
          <h2 className="card-title" id="tl-h">
            <Radar size={17} /> Milestones
          </h2>
          <ol className="timeline">
            {BEACON_MILESTONES.map((m, i) => (
              <li key={m.id}>
                <span className={`node ${i === 0 ? 'current' : ''}`} aria-hidden />
                <div>
                  <div className="row">
                    <strong>
                      {m.version} · {m.title}
                    </strong>
                    <span className="small muted">{m.weeks}</span>
                    <WeekStatusBadge status={m.status} />
                  </div>
                  <div className="small muted">{m.description}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <div className="stack">
          <section className="card" style={{ marginTop: 0 }}>
            <h2 className="card-title">Current milestone: v0.1 Signal Reporter</h2>
            <p className="small">
              Week 02 builds Beacon’s first program: report a few synthetic service measurements in Python using values, arithmetic, comparisons and f-strings. When you pass it, a
              runnable <code>.py</code> file can be exported here.
            </p>
            <div className="callout callout-warn small">
              <div className="callout-title">Not available yet</div>
              The Week 02 lessons are authored from an approved reference unit that has not been loaded into this build. Nothing has been substituted in its place.
            </div>
          </section>
          <section className="card">
            <h2 className="card-title">Artifacts</h2>
            {artifacts.length ? (
              <ul className="list-plain small">
                {artifacts.map((ex) => {
                  const src = state.drafts[ex.id]?.source;
                  const passed = state.attempts.some((a) => a.exerciseId === ex.id && a.passed);
                  return (
                    <li key={ex.id}>
                      <span style={{ flex: 1 }}>
                        {ex.beaconArtifact!.filename} — {ex.title} {passed ? <span className="badge badge-success">passed</span> : <span className="badge">not yet passed</span>}
                      </span>
                      <button className="btn btn-sm" disabled={!src} onClick={() => src && (({ filename, text }) => downloadText(filename, text))(buildArtifact(ex, src, store.now()))}>
                        <Download size={13} /> Export .py
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>
                No artifacts yet. The first one (Beacon v0.1) arrives with Week 02.
              </p>
            )}
          </section>
          <section className="card">
            <h2 className="card-title">Runbook &amp; design notes</h2>
            <p className="small muted">Your own notes about Beacon — decisions, how to run it, what you would change. Saved in this browser and included in backups.</p>
            <textarea
              value={text}
              aria-label="Beacon notes"
              onChange={(e) => {
                setText(e.target.value);
                const v = e.target.value;
                if (t.current) clearTimeout(t.current);
                t.current = setTimeout(() => store.saveNote('beacon:runbook', v), 500);
              }}
              rows={6}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
