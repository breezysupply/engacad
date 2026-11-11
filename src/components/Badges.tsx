import { Beaker, CheckCircle2, Cloud, FlaskConical, Laptop, MonitorPlay, PenLine, BookOpen, Upload } from 'lucide-react';
import type { EvidenceLevel, EvidenceOrigin, ExerciseMode, LabMode, WeekStatus } from '../curriculum/types';
import { EVIDENCE_LEVELS } from '../curriculum/types';

export const LEVEL_LABEL: Record<EvidenceLevel, string> = {
  introduced: 'Introduced',
  guided: 'Guided',
  applied: 'Applied',
  mastered: 'Mastered',
  retained: 'Retained',
};

export function LevelBadge({ level }: { level: EvidenceLevel | null }) {
  if (!level) return <span className="badge">No evidence yet</span>;
  const cls = level === 'introduced' ? 'badge' : level === 'guided' ? 'badge badge-info' : 'badge badge-success';
  return <span className={cls}>{LEVEL_LABEL[level]}</span>;
}

export function Ladder({ level }: { level: EvidenceLevel | null }) {
  const n = level ? EVIDENCE_LEVELS.indexOf(level) + 1 : 0;
  return (
    <span className="ladder" role="img" aria-label={`Evidence level: ${level ? LEVEL_LABEL[level] : 'none'} (${n} of 5)`}>
      {EVIDENCE_LEVELS.map((l, i) => (
        <i key={l} className={i < n ? 'on' : ''} title={LEVEL_LABEL[l]} />
      ))}
    </span>
  );
}

export const ORIGIN_LABEL: Record<EvidenceOrigin, string> = {
  'browser-python': 'Browser Python',
  'self-reported': 'Self-reported',
  imported: 'Imported',
  simulation: 'Simulation',
  lesson: 'Lesson / knowledge check',
};

export function OriginBadge({ origin, imported }: { origin: EvidenceOrigin; imported?: boolean }) {
  const map: Record<EvidenceOrigin, [string, React.ReactNode]> = {
    'browser-python': ['badge badge-accent', <MonitorPlay size={12} key="i" />],
    'self-reported': ['badge badge-self', <PenLine size={12} key="i" />],
    imported: ['badge', <Upload size={12} key="i" />],
    simulation: ['badge badge-sim', <FlaskConical size={12} key="i" />],
    lesson: ['badge', <BookOpen size={12} key="i" />],
  };
  const [cls, icon] = map[origin];
  return (
    <span className="row" style={{ gap: 4, display: 'inline-flex' }}>
      <span className={cls}>
        {icon}
        {ORIGIN_LABEL[origin]}
      </span>
      {imported && (
        <span className="badge" title="This record came from a backup file">
          <Upload size={12} /> from backup
        </span>
      )}
    </span>
  );
}

export const LAB_MODE_LABEL: Record<LabMode, string> = {
  'browser-python': 'Browser Python',
  'real-codespaces': 'Real · Codespaces',
  'real-local': 'Real · Local Mac',
  simulation: 'Simulation',
};

export function LabModeBadge({ mode }: { mode: LabMode }) {
  const cls = mode === 'simulation' ? 'badge badge-sim' : mode === 'browser-python' ? 'badge badge-accent' : 'badge badge-success';
  const icon = mode === 'simulation' ? <Beaker size={12} /> : mode === 'real-codespaces' ? <Cloud size={12} /> : mode === 'real-local' ? <Laptop size={12} /> : <MonitorPlay size={12} />;
  return (
    <span className={cls}>
      {icon}
      {LAB_MODE_LABEL[mode]}
    </span>
  );
}

export function WeekStatusBadge({ status }: { status: WeekStatus }) {
  if (status === 'available')
    return (
      <span className="badge badge-success">
        <CheckCircle2 size={12} /> Available
      </span>
    );
  if (status === 'awaiting-content') return <span className="badge badge-warning">Awaiting reference unit</span>;
  return <span className="badge badge-planned">Planned</span>;
}

export const MODE_LABEL: Record<ExerciseMode, string> = { guided: 'Guided practice', independent: 'Independent', assessment: 'Skill assessment', review: 'Review' };

export function ModeBadge({ mode }: { mode: ExerciseMode }) {
  const cls = mode === 'guided' ? 'badge badge-info' : mode === 'review' ? 'badge' : 'badge badge-accent';
  return <span className={cls}>{MODE_LABEL[mode]}</span>;
}
