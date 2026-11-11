/**
 * IndexedDB persistence. One object store per record type, plus a key/value
 * store for settings and meta. Upgrades are applied in order by version so
 * existing learner data survives application updates.
 */
import { openDB, type IDBPDatabase } from 'idb';
import { SCHEMA_VERSION, type ProgressState } from '../progress/model';

export const DB_NAME = 'engacad';

export type StoreName = 'drafts' | 'attempts' | 'hints' | 'evidence' | 'reviews' | 'lessons' | 'notes' | 'diagnostics' | 'labs' | 'kv';

export const KEY_PATHS: Record<Exclude<StoreName, 'kv'>, string> = {
  drafts: 'exerciseId',
  attempts: 'id',
  hints: 'exerciseId',
  evidence: 'id',
  reviews: 'id',
  lessons: 'lessonId',
  notes: 'id',
  diagnostics: 'id',
  labs: 'labId',
};

/**
 * Schema migrations, keyed by the version they upgrade *to*. Never edit an
 * existing step once released; add a new one and bump SCHEMA_VERSION.
 */
export const MIGRATIONS: Record<number, (db: IDBPDatabase) => void> = {
  1: (db) => {
    for (const [name, keyPath] of Object.entries(KEY_PATHS)) {
      const store = db.createObjectStore(name, { keyPath });
      if (name === 'attempts' || name === 'evidence') store.createIndex('at', 'at');
    }
    db.createObjectStore('kv');
  },
};

export async function openProgressDB(name = DB_NAME): Promise<IDBPDatabase> {
  return openDB(name, SCHEMA_VERSION, {
    upgrade(db, oldVersion) {
      for (let v = oldVersion + 1; v <= SCHEMA_VERSION; v++) MIGRATIONS[v]?.(db);
    },
  });
}

type Loaded = Omit<ProgressState, 'settings' | 'meta'> & { settings?: ProgressState['settings']; meta?: ProgressState['meta'] };

export async function loadAll(db: IDBPDatabase): Promise<Loaded> {
  const all = async <T>(s: StoreName) => (await db.getAll(s)) as T[];
  const byKey = <T>(rows: T[], key: keyof T) => Object.fromEntries(rows.map((r) => [String(r[key]), r]));
  const [drafts, attempts, hints, evidence, reviews, lessons, notes, diagnostics, labs] = await Promise.all([
    all<ProgressState['drafts'][string]>('drafts'),
    all<ProgressState['attempts'][number]>('attempts'),
    all<ProgressState['hints'][string]>('hints'),
    all<ProgressState['evidence'][number]>('evidence'),
    all<ProgressState['reviews'][string]>('reviews'),
    all<ProgressState['lessons'][string]>('lessons'),
    all<ProgressState['notes'][string]>('notes'),
    all<ProgressState['diagnostics'][number]>('diagnostics'),
    all<ProgressState['labs'][string]>('labs'),
  ]);
  return {
    drafts: byKey(drafts, 'exerciseId'),
    attempts: attempts.sort((a, b) => a.at.localeCompare(b.at)),
    hints: byKey(hints, 'exerciseId'),
    evidence: evidence.sort((a, b) => a.at.localeCompare(b.at)),
    reviews: byKey(reviews, 'id'),
    lessons: byKey(lessons, 'lessonId'),
    notes: byKey(notes, 'id'),
    diagnostics: diagnostics.sort((a, b) => a.at.localeCompare(b.at)),
    labs: byKey(labs, 'labId'),
    settings: (await db.get('kv', 'settings')) as ProgressState['settings'] | undefined,
    meta: (await db.get('kv', 'meta')) as ProgressState['meta'] | undefined,
  };
}

/** Replace the entire database contents with `state` in one transaction. */
export async function replaceAll(db: IDBPDatabase, state: ProgressState): Promise<void> {
  const names: StoreName[] = ['drafts', 'attempts', 'hints', 'evidence', 'reviews', 'lessons', 'notes', 'diagnostics', 'labs', 'kv'];
  const tx = db.transaction(names, 'readwrite');
  await Promise.all(names.map((n) => tx.objectStore(n).clear()));
  const put = (n: StoreName, rows: object[]) => rows.map((r) => tx.objectStore(n).put(r));
  await Promise.all([
    ...put('drafts', Object.values(state.drafts)),
    ...put('attempts', state.attempts),
    ...put('hints', Object.values(state.hints)),
    ...put('evidence', state.evidence),
    ...put('reviews', Object.values(state.reviews)),
    ...put('lessons', Object.values(state.lessons)),
    ...put('notes', Object.values(state.notes)),
    ...put('diagnostics', state.diagnostics),
    ...put('labs', Object.values(state.labs)),
    tx.objectStore('kv').put(state.settings, 'settings'),
    tx.objectStore('kv').put(state.meta, 'meta'),
  ]);
  await tx.done;
}
