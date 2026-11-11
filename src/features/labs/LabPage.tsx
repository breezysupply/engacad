import { AlertTriangle, Clipboard, ClipboardCheck, Clock, ShieldCheck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useProgress, useStore } from '../../app/providers';
import { LabModeBadge, OriginBadge } from '../../components/Badges';
import { InlineMarkdown } from '../../components/Markdown';
import { labById } from '../../content';
import { skillById } from '../../content/skills';
import { parseEnvCheck } from './parse';

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyline">
      <code>{text}</code>
      <button
        className="btn btn-sm"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        aria-label="Copy command"
      >
        {copied ? <ClipboardCheck size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function LabPage() {
  const { labId = '' } = useParams();
  const lab = labById(labId);
  const store = useStore();
  const state = useProgress();
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!lab) return <Navigate to="/labs" replace />;
  const rec = state.labs[lab.id];
  const evidence = state.evidence.filter((e) => e.sourceType === 'lab' && e.refId === lab.id);
  const toggle = (k: string) => {
    store.updateLab(lab.id, { status: rec?.status === 'evidence-submitted' ? 'evidence-submitted' : 'in-progress', startedAt: rec?.startedAt ?? store.now(), checklist: { ...(rec?.checklist ?? {}), [k]: !rec?.checklist?.[k] } });
  };
  const submit = () => {
    const parsed = parseEnvCheck(transcript);
    if (!parsed) {
      setError('Could not find the line starting with ENGACAD-ENV-CHECK. Paste the complete output of the script.');
      return;
    }
    setError(null);
    store.submitLabEvidence(lab.id, transcript, parsed, lab.evidence.skills);
    setTranscript('');
  };
  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div className="eyebrow">
          <Link to="/labs">Labs</Link> / Week {lab.weekId.slice(1)}
        </div>
        <h1>{lab.title}</h1>
        <div className="row">
          {lab.mode.map((m) => (
            <LabModeBadge key={m} mode={m} />
          ))}
          {lab.optional && <span className="badge">Optional</span>}
          <span className="row small muted">
            <Clock size={14} /> ~{lab.estimatedMinutes} min
          </span>
        </div>
        <p style={{ marginTop: 12 }}>{lab.objective}</p>
      </div>

      <div className="callout callout-info">
        <div className="callout-title">This is a real environment, outside the browser</div>
        EngAcad is a static website: it cannot open a terminal on your Mac or see inside a Codespace. You run the steps yourself; at the end you can paste the output, which is stored as{' '}
        <strong>self-reported</strong> evidence.
      </div>

      <section className="card">
        <h2 className="card-title">Environment &amp; prerequisites</h2>
        <p className="small">{lab.environment}</p>
        <ul className="small">
          {lab.prerequisites.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div className="callout callout-warn small">
          <div className="callout-title">
            <Wallet size={15} /> Cost
          </div>
          {lab.costNote}
        </div>
        <div className="callout callout-tip small">
          <div className="callout-title">
            <ShieldCheck size={15} /> Safety
          </div>
          {lab.safetyNote}
        </div>
      </section>

      <section className="card lab-steps">
        <h2 className="card-title">1 · Preflight</h2>
        {lab.preflight.map((p, i) => (
          <label key={p} className="check-item">
            <input type="checkbox" checked={!!rec?.checklist?.[`pre${i}`]} onChange={() => toggle(`pre${i}`)} />
            <span className="small">
              <InlineMarkdown text={p} />
            </span>
          </label>
        ))}
      </section>

      <section className="card lab-steps">
        <h2 className="card-title">2 · Setup (choose one)</h2>
        <div className="grid grid-2">
          {lab.setup.map((s) => (
            <div key={s.title}>
              <h3 style={{ fontSize: '0.95rem' }}>{s.title}</h3>
              <ol className="small">
                {s.steps.map((st) => (
                  <li key={st}>
                    <InlineMarkdown text={st} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="card lab-steps">
        <h2 className="card-title">3 · Do the lab</h2>
        <ol className="small">
          {lab.instructions.map((s) => (
            <li key={s}>
              <InlineMarkdown text={s} />
            </li>
          ))}
        </ol>
        {lab.verification.command && <CopyLine text={lab.verification.command} />}
      </section>

      <section className="card">
        <h2 className="card-title">4 · Verification &amp; evidence</h2>
        <p className="small">{lab.verification.description}</p>
        <p className="small muted">{lab.evidence.description}</p>
        {evidence.length > 0 && (
          <div className="evidence-note" data-testid="lab-evidence">
            {evidence.map((e) => (
              <div key={e.id} className="small">
                <div className="row">
                  <OriginBadge origin={e.origin} imported={!!e.importedAt} /> {skillById(e.skillId)?.title} · {new Date(e.at).toLocaleString()}
                </div>
                <div className="muted">{e.note}</div>
              </div>
            ))}
            {rec?.parsed?.status && rec.parsed.status !== 'PASS' && (
              <div className="row small" style={{ color: 'var(--warning)', marginTop: 6 }}>
                <AlertTriangle size={14} /> The pasted report says status={rec.parsed.status}. Fix the items marked in the script output and paste again.
              </div>
            )}
          </div>
        )}
        <label htmlFor="transcript" className="small">
          Paste the full script output
        </label>
        <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="… ENGACAD-ENV-CHECK v1 python=3.12.4 …" rows={6} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} />
        {error && (
          <p className="small" style={{ color: 'var(--danger)' }} role="alert">
            {error}
          </p>
        )}
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={!transcript.trim()}>
            Save as self-reported evidence
          </button>
          <span className="small muted">Stored only in this browser.</span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">5 · Cleanup</h2>
        {lab.cleanup.map((c, i) => (
          <label key={c} className="check-item">
            <input type="checkbox" checked={!!rec?.checklist?.[`clean${i}`]} onChange={() => toggle(`clean${i}`)} />
            <span className="small">{c}</span>
          </label>
        ))}
      </section>
    </div>
  );
}
