import { Download, HardDrive, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow, useProgress, useStore } from '../../app/providers';
import { Ladder, LevelBadge, OriginBadge } from '../../components/Badges';
import { ConfirmDialog } from '../../components/Dialog';
import { diagnosticById } from '../../content';
import { DOMAIN_LABELS, PLANNED_DOMAINS, skillById } from '../../content/skills';
import { REVIEW_INTERVALS_DAYS, reviewsDue, reviewsUpcoming } from '../../progress/model';
import { skillSummaries } from '../../progress/selectors';
import { BackupError } from '../../storage/backup';
import { downloadText } from '../beacon/artifacts';
import { diagnosticProfile } from '../lesson/Blocks';

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function BackupPanel() {
  const store = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ text: string; name: string } | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const storage = store.storage;

  const exportNow = async () => {
    const b = await store.exportBackup();
    downloadText(`engacad-backup-${b.exportedAt.slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json');
    setMsg({ ok: true, text: 'Backup downloaded.' });
  };
  const doImport = async () => {
    if (!pending) return;
    try {
      const b = await store.importBackup(pending.text, mode);
      setMsg({ ok: true, text: `Imported backup from ${b.exportedAt ? fmt(b.exportedAt) : 'unknown date'} (${mode === 'merge' ? 'merged with' : 'replaced'} this browser’s progress).` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BackupError ? e.message : `Import failed: ${e instanceof Error ? e.message : String(e)}` });
    }
    setPending(null);
  };

  return (
    <section className="card" aria-labelledby="data-h" id="data">
      <h2 className="card-title" id="data-h">
        <HardDrive size={17} /> Data &amp; backup
      </h2>
      <p className="small">
        Storage:{' '}
        {storage.state === 'ok' ? (
          <span className="badge badge-success badge-wrap">IndexedDB in this browser{storage.persisted ? ' · persistent' : storage.persisted === false ? ' · may be evicted under storage pressure' : ''}</span>
        ) : storage.state === 'memory-only' ? (
          <span className="badge badge-danger">Not saving</span>
        ) : (
          <span className="badge">Loading</span>
        )}
      </p>
      <p className="small muted">
        Progress lives only in this browser profile; there is no account and no sync. Export a backup regularly, and to move between browsers or machines.
      </p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => void exportNow()} data-testid="export-btn">
          <Download size={15} /> Export backup (.json)
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()} data-testid="import-btn">
          <Upload size={15} /> Import backup…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          data-testid="import-file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) setPending({ text: await f.text(), name: f.name });
            e.target.value = '';
          }}
        />
        {storage.state === 'ok' && !storage.persisted && (
          <button className="btn btn-ghost btn-sm" onClick={() => void store.requestPersistence()}>
            Request persistent storage
          </button>
        )}
      </div>
      {msg && (
        <p className="small" role="status" style={{ marginTop: 10, color: msg.ok ? 'var(--success)' : 'var(--danger)' }} data-testid="backup-msg">
          {msg.text}
        </p>
      )}
      <hr className="divider" />
      <button className="btn btn-danger btn-sm" onClick={() => setConfirmReset(true)}>
        Erase all progress in this browser…
      </button>
      {pending && (
        <ConfirmDialog
          title={`Import ${pending.name}?`}
          body={
            <div>
              <label className="check-item">
                <input type="radio" name="mode" checked={mode === 'merge'} onChange={() => setMode('merge')} />
                <span>
                  <strong>Merge</strong> — keep everything here and add records from the file. Drafts keep whichever was edited most recently.
                </span>
              </label>
              <label className="check-item">
                <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} data-testid="mode-replace" />
                <span>
                  <strong>Replace</strong> — overwrite this browser’s progress with the file’s contents.
                </span>
              </label>
              <p className="small muted">Imported evidence keeps its original origin and is marked “from backup”.</p>
            </div>
          }
          confirmLabel="Import"
          danger={mode === 'replace'}
          onConfirm={() => void doImport()}
          onCancel={() => setPending(null)}
        />
      )}
      {confirmReset && (
        <ConfirmDialog
          title="Erase all progress?"
          body="This deletes drafts, attempts, evidence, reviews and notes in this browser. Export a backup first if you might want them back. This cannot be undone."
          confirmLabel="Erase everything"
          danger
          onConfirm={() => {
            void store.resetAll();
            setConfirmReset(false);
            setMsg({ ok: true, text: 'All progress erased.' });
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </section>
  );
}

function SettingsPanel() {
  const store = useStore();
  const { settings } = useProgress();
  return (
    <section className="card" aria-labelledby="settings-h">
      <h2 className="card-title" id="settings-h">
        Settings
      </h2>
      <div className="row" style={{ gap: 24 }}>
        <label className="row">
          Theme
          <select value={settings.theme} onChange={(e) => store.updateSettings({ theme: e.target.value as typeof settings.theme })}>
            <option value="system">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="row">
          Editor font size
          <select value={settings.editorFontSize} onChange={(e) => store.updateSettings({ editorFontSize: Number(e.target.value) })}>
            {[12, 13, 14, 15, 16, 18].map((n) => (
              <option key={n} value={n}>
                {n}px
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

export function ProgressPage() {
  const state = useProgress();
  const now = useNow();
  const skills = skillSummaries(state);
  const due = reviewsDue(state.reviews, now);
  const upcoming = reviewsUpcoming(state.reviews, now);
  const completed = Object.values(state.reviews)
    .filter((r) => r.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const diag = diagnosticById('w01-baseline')!;
  const lastDiag = [...state.diagnostics].reverse().find((d) => d.completed);
  const evidence = [...state.evidence].reverse();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Skills &amp; Progress</h1>
        <p>
          Evidence is tracked per skill: <strong>Introduced → Guided → Applied → Mastered → Retained</strong>. Each record keeps its origin, so a self-reported lab is never shown as a
          browser-verified check.
        </p>
      </div>

      <section className="card" aria-labelledby="skills-h">
        <h2 className="card-title" id="skills-h">
          Skill matrix
        </h2>
        <table className="table" data-testid="skill-matrix">
          <thead>
            <tr>
              <th>Skill</th>
              <th>Area</th>
              <th>Evidence</th>
              <th>Origins</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((s) => (
              <tr key={s.skillId} data-testid={`skill-${s.skillId}`} data-level={s.level ?? 'none'}>
                <td>
                  <strong>{s.title}</strong>
                  <div className="small muted">{s.canDo}</div>
                </td>
                <td className="small">{DOMAIN_LABELS[s.domain as keyof typeof DOMAIN_LABELS]}</td>
                <td>
                  <div className="stack" style={{ gap: 4 }}>
                    <Ladder level={s.level} />
                    <LevelBadge level={s.level} />
                  </div>
                </td>
                <td>
                  <div className="row">
                    {s.origins.length ? s.origins.map((o) => <OriginBadge key={o} origin={o as never} />) : <span className="small muted">—</span>}
                  </div>
                </td>
              </tr>
            ))}
            {PLANNED_DOMAINS.map((d) => (
              <tr key={d.domain} className="muted">
                <td>
                  <span className="badge badge-planned">Planned</span>
                </td>
                <td className="small">{DOMAIN_LABELS[d.domain]}</td>
                <td className="small" colSpan={2}>
                  Skills arrive with {d.weeks}; nothing can be earned here yet.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <section className="card" aria-labelledby="rev-h" style={{ marginTop: 0 }}>
          <h2 className="card-title" id="rev-h">
            Reviews
          </h2>
          <p className="small muted">
            Scheduled about {REVIEW_INTERVALS_DAYS.join(', ')} days after you demonstrate a skill. Missed reviews stay available — no streaks, no penalties.
          </p>
          <h3 style={{ fontSize: '0.9rem' }}>Due now ({due.length})</h3>
          {due.length ? (
            <ul className="list-plain small" data-testid="reviews-due">
              {due.map((r) => (
                <li key={r.id}>
                  <Link to={`/review/${encodeURIComponent(r.id)}`} style={{ flex: 1 }}>
                    {skillById(r.skillId)?.title}
                  </Link>
                  <span className="muted">
                    {REVIEW_INTERVALS_DAYS[r.step]}-day · due {fmt(r.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Nothing due.</p>
          )}
          <h3 style={{ fontSize: '0.9rem', marginTop: 12 }}>Upcoming</h3>
          {upcoming.length ? (
            <ul className="list-plain small" data-testid="reviews-upcoming">
              {upcoming.map((r) => (
                <li key={r.id}>
                  <span style={{ flex: 1 }}>{skillById(r.skillId)?.title}</span>
                  <span className="muted">
                    {REVIEW_INTERVALS_DAYS[r.step]}-day · {fmt(r.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">None scheduled yet.</p>
          )}
          {completed.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.9rem', marginTop: 12 }}>Completed</h3>
              <ul className="list-plain small">
                {completed.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <span style={{ flex: 1 }}>{skillById(r.skillId)?.title}</span>
                    <span className="muted">
                      {REVIEW_INTERVALS_DAYS[r.step]}-day · {fmt(r.completedAt!)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="diag-h" style={{ marginTop: 0 }}>
          <h2 className="card-title" id="diag-h">
            Baseline profile
          </h2>
          {lastDiag ? (
            <>
              <p className="small muted">From {fmt(lastDiag.at)} · planning only, no evidence.</p>
              <table className="table">
                <tbody>
                  {diagnosticProfile(diag.questions, lastDiag.answers).map((p) => (
                    <tr key={p.area}>
                      <td>{p.label}</td>
                      <td>
                        {p.correct}/{p.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="small muted">
              Not taken yet. <Link to="/learn/lesson/w01-l2">Take the baseline diagnostic</Link> (about 15 minutes).
            </p>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="ev-h" style={{ marginTop: 16 }}>
        <h2 className="card-title" id="ev-h">
          Evidence history
        </h2>
        {evidence.length ? (
          <table className="table" data-testid="evidence-history">
            <thead>
              <tr>
                <th>When</th>
                <th>Skill</th>
                <th>Level</th>
                <th>Origin</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {evidence.slice(0, 60).map((e) => (
                <tr key={e.id}>
                  <td className="small">{new Date(e.at).toLocaleString()}</td>
                  <td className="small">{skillById(e.skillId)?.title ?? e.skillId}</td>
                  <td>
                    <LevelBadge level={e.level} />
                    {e.assisted && <div className="small muted">assisted</div>}
                  </td>
                  <td>
                    <OriginBadge origin={e.origin} imported={!!e.importedAt} />
                  </td>
                  <td className="small muted">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">No evidence yet. Evidence comes from passing Checks, finishing explanations, reviews and labs — never from Run.</p>
        )}
      </section>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <BackupPanel />
        <SettingsPanel />
      </div>
    </div>
  );
}
