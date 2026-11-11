/**
 * Versioned JSON backup. Export is a full snapshot; import validates the file,
 * migrates older formats, and either replaces or merges with current progress.
 */
import { SCHEMA_VERSION, type ProgressState } from '../progress/model';

export const BACKUP_FORMAT = 'engacad-progress-backup';

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  contentVersion: string;
  exportedAt: string;
  data: ProgressState;
}

export function createBackup(state: ProgressState, now: string): BackupFile {
  return { format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, contentVersion: state.meta.contentVersion, exportedAt: now, data: state };
}

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Backup migrations keyed by the version they upgrade *from*. */
const BACKUP_MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // Example for the future: 1: (d) => ({ ...d, newCollection: {} }),
};

export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('This file is not valid JSON.');
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) throw new BackupError('This is not an EngAcad progress backup.');
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    throw new BackupError('The backup has no valid schema version.');
  if (version > SCHEMA_VERSION)
    throw new BackupError(`This backup was made by a newer version of EngAcad (schema ${version}); this app understands up to ${SCHEMA_VERSION}.`);
  if (!isObj(raw.data)) throw new BackupError('The backup has no data section.');
  let data = raw.data;
  for (let v = version; v < SCHEMA_VERSION; v++) data = BACKUP_MIGRATIONS[v]?.(data) ?? data;
  validateData(data);
  return { format: BACKUP_FORMAT, schemaVersion: SCHEMA_VERSION, contentVersion: String(raw.contentVersion ?? 'unknown'), exportedAt: String(raw.exportedAt ?? ''), data: data as unknown as ProgressState };
}

function validateData(d: Record<string, unknown>) {
  const maps = ['drafts', 'hints', 'reviews', 'lessons', 'notes', 'labs'];
  const lists = ['attempts', 'evidence', 'diagnostics'];
  for (const k of maps) if (!isObj(d[k])) throw new BackupError(`The backup's "${k}" section is missing or malformed.`);
  for (const k of lists) if (!Array.isArray(d[k])) throw new BackupError(`The backup's "${k}" section is missing or malformed.`);
  if (!isObj(d.settings) || !isObj(d.meta)) throw new BackupError('The backup is missing settings or metadata.');
  for (const e of d.evidence as unknown[]) {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.skillId !== 'string' || typeof e.level !== 'string' || typeof e.origin !== 'string')
      throw new BackupError('The backup contains a malformed evidence record.');
  }
  for (const [k, v] of Object.entries(d.drafts as Record<string, unknown>)) {
    if (!isObj(v) || v.exerciseId !== k || typeof v.source !== 'string') throw new BackupError('The backup contains a malformed code draft.');
  }
}

const newer = <T extends { updatedAt?: string }>(a: T | undefined, b: T) => (!a || (b.updatedAt ?? '') > (a.updatedAt ?? '') ? b : a);

/**
 * Merge an imported backup into the current state. Nothing current is deleted:
 * attempts and evidence are unioned by ID, drafts keep the most recently
 * edited version, hint levels keep the highest revealed level, and reviews keep
 * whichever record is further along. Settings stay as they are on this device.
 */
export function mergeStates(current: ProgressState, incoming: ProgressState): ProgressState {
  const unionById = <T extends { id: string }>(a: T[], b: T[]) => {
    const seen = new Map(a.map((x) => [x.id, x]));
    for (const x of b) if (!seen.has(x.id)) seen.set(x.id, x);
    return [...seen.values()].sort((p, q) => String((p as { at?: string }).at ?? '').localeCompare(String((q as { at?: string }).at ?? '')));
  };
  const drafts = { ...current.drafts };
  for (const [k, v] of Object.entries(incoming.drafts)) drafts[k] = newer(drafts[k], v);
  const hints = { ...current.hints };
  for (const [k, v] of Object.entries(incoming.hints)) {
    const c = hints[k];
    hints[k] = !c
      ? v
      : {
          ...c,
          revealedLevel: Math.max(c.revealedLevel, v.revealedLevel),
          history: [...c.history, ...v.history.filter((h) => !c.history.some((x) => x.at === h.at && x.level === h.level))].sort((a, b) => a.at.localeCompare(b.at)),
          solutionViewedAt: c.solutionViewedAt ?? v.solutionViewedAt,
        };
  }
  const reviews = { ...current.reviews };
  for (const [k, v] of Object.entries(incoming.reviews)) {
    const c = reviews[k];
    if (!c || (!c.completedAt && v.completedAt) || v.attempts.length > c.attempts.length) reviews[k] = v;
  }
  const lessons = { ...current.lessons };
  for (const [k, v] of Object.entries(incoming.lessons)) {
    const c = lessons[k];
    lessons[k] = !c
      ? v
      : {
          ...c,
          sectionsSeen: [...new Set([...c.sectionsSeen, ...v.sectionsSeen])],
          introducedAt: c.introducedAt ?? v.introducedAt,
          quizAnswers: { ...v.quizAnswers, ...c.quizAnswers },
        };
  }
  const notes = { ...current.notes };
  for (const [k, v] of Object.entries(incoming.notes)) notes[k] = newer(notes[k], v);
  const labs = { ...current.labs };
  for (const [k, v] of Object.entries(incoming.labs)) if (!labs[k] || (v.submittedAt && !labs[k].submittedAt)) labs[k] = v;
  return {
    ...current,
    drafts,
    hints,
    reviews,
    lessons,
    notes,
    labs,
    attempts: unionById(current.attempts, incoming.attempts),
    evidence: unionById(current.evidence, incoming.evidence),
    diagnostics: unionById(current.diagnostics, incoming.diagnostics),
    meta: { ...current.meta, lastLocation: current.meta.lastLocation ?? incoming.meta.lastLocation },
  };
}
