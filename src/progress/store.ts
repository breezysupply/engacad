/**
 * ProgressStore: in-memory learner state with write-through IndexedDB
 * persistence. Every mutation produces a new state object so React can
 * subscribe with useSyncExternalStore.
 */
import type { IDBPDatabase } from 'idb';
import { CONTENT_VERSION, exerciseById, lessonById, reviewPromptsForSkill } from '../content';
import type { EvidenceLevel, EvidenceOrigin, Exercise } from '../curriculum/types';
import type { GradedCheck } from '../runtime/python/grading';
import { createBackup, mergeStates, parseBackup, type BackupFile } from '../storage/backup';
import { loadAll, openProgressDB, replaceAll, type StoreName } from '../storage/db';
import {
  emptyState,
  evidenceForPass,
  maybeScheduleFirstReview,
  recordReviewAttempt,
  uid,
  type AttemptRecord,
  type DiagnosticRecord,
  type EvidenceDecision,
  type EvidenceRecord,
  type LabRecord,
  type LessonProgressRecord,
  type ProgressState,
  type ReviewRecord,
  type Settings,
} from './model';

export type StorageStatus = { state: 'loading' } | { state: 'ok'; persisted: boolean | null } | { state: 'memory-only'; message: string };

export interface CheckOutcome {
  attempt: AttemptRecord;
  decision: EvidenceDecision | null;
  newEvidence: EvidenceRecord[];
  scheduledReviews: ReviewRecord[];
}

type Clock = () => Date;

export class ProgressStore {
  state: ProgressState;
  storage: StorageStatus = { state: 'loading' };
  private db: IDBPDatabase | null = null;
  private listeners = new Set<() => void>();
  private writes: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly clock: Clock = () => new Date(),
    private readonly dbName?: string,
  ) {
    this.state = emptyState(this.now(), CONTENT_VERSION);
  }

  now = () => this.clock().toISOString();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  async init(): Promise<void> {
    try {
      this.db = await openProgressDB(this.dbName);
      const loaded = await loadAll(this.db);
      const base = emptyState(this.now(), CONTENT_VERSION);
      this.state = {
        ...base,
        ...loaded,
        settings: { ...base.settings, ...(loaded.settings ?? {}) },
        meta: { ...base.meta, ...(loaded.meta ?? {}), contentVersion: CONTENT_VERSION },
      };
      if (!loaded.meta) await this.put('kv', this.state.meta, 'meta');
      let persisted: boolean | null = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.persisted) persisted = await navigator.storage.persisted();
      } catch {
        persisted = null;
      }
      this.storage = { state: 'ok', persisted };
    } catch (err) {
      this.db = null;
      this.storage = {
        state: 'memory-only',
        message: `Browser storage is unavailable (${err instanceof Error ? err.message : String(err)}). Progress will be lost when this tab closes; export a backup to keep it.`,
      };
    }
    this.emit();
  }

  async requestPersistence(): Promise<boolean> {
    try {
      const ok = (await navigator.storage?.persist?.()) ?? false;
      if (this.storage.state === 'ok') this.storage = { state: 'ok', persisted: ok };
      this.emit();
      return ok;
    } catch {
      return false;
    }
  }

  /** Wait for queued writes (used by tests and before export). */
  flush() {
    return this.writes;
  }

  private put(store: StoreName, value: unknown, key?: string) {
    const db = this.db;
    if (!db) return Promise.resolve();
    const p = this.writes
      .then(() => (key === undefined ? db.put(store, value) : db.put(store, value, key)))
      .catch((err) => {
        this.storage = { state: 'memory-only', message: `Saving failed: ${err instanceof Error ? err.message : String(err)}. Export a backup to keep your work.` };
        this.emit();
      });
    this.writes = p;
    return p;
  }

  private set(next: Partial<ProgressState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  // ───── settings & location ─────

  updateSettings(patch: Partial<Settings>) {
    const settings = { ...this.state.settings, ...patch };
    this.set({ settings });
    void this.put('kv', settings, 'settings');
  }

  setLocation(lessonId: string, sectionId?: string, exerciseId?: string) {
    const prev = this.state.meta.lastLocation;
    if (prev && prev.lessonId === lessonId && prev.sectionId === sectionId && prev.exerciseId === exerciseId) return;
    const meta = { ...this.state.meta, lastLocation: { lessonId, sectionId, exerciseId, at: this.now() } };
    this.set({ meta });
    void this.put('kv', meta, 'meta');
  }

  // ───── lessons ─────

  private lesson(lessonId: string): LessonProgressRecord {
    return this.state.lessons[lessonId] ?? { lessonId, startedAt: this.now(), sectionsSeen: [], quizAnswers: {} };
  }

  private saveLesson(rec: LessonProgressRecord) {
    this.set({ lessons: { ...this.state.lessons, [rec.lessonId]: rec } });
    void this.put('lessons', rec);
  }

  markSectionSeen(lessonId: string, sectionId: string) {
    const rec = this.lesson(lessonId);
    if (rec.sectionsSeen.includes(sectionId) && rec.lastSectionId === sectionId) return;
    this.saveLesson({ ...rec, lastSectionId: sectionId, sectionsSeen: rec.sectionsSeen.includes(sectionId) ? rec.sectionsSeen : [...rec.sectionsSeen, sectionId] });
    this.setLocation(lessonId, sectionId, rec.activeExerciseId);
  }

  setActiveExercise(lessonId: string, exerciseId: string) {
    const rec = this.lesson(lessonId);
    if (rec.activeExerciseId !== exerciseId) this.saveLesson({ ...rec, activeExerciseId: exerciseId });
    this.setLocation(lessonId, rec.lastSectionId, exerciseId);
  }

  answerQuiz(lessonId: string, quizId: string, answer: number) {
    const rec = this.lesson(lessonId);
    this.saveLesson({ ...rec, quizAnswers: { ...rec.quizAnswers, [quizId]: answer } });
  }

  /** Learner finished working through the explanation: Introduced evidence. */
  completeLessonReading(lessonId: string) {
    const lesson = lessonById(lessonId);
    const rec = this.lesson(lessonId);
    if (!lesson || rec.introducedAt) return;
    const at = this.now();
    this.saveLesson({ ...rec, introducedAt: at });
    for (const skillId of lesson.skillsIntroduced) {
      this.addEvidence({ skillId, level: 'introduced', origin: 'lesson', sourceType: 'lesson', refId: lessonId, at, assisted: false, note: `Worked through “${lesson.title}”.` });
    }
  }

  // ───── drafts ─────

  saveDraft(exerciseId: string, source: string) {
    const prev = this.state.drafts[exerciseId];
    if (prev && prev.source === source) return;
    const rec = { exerciseId, source, updatedAt: this.now(), snapshots: prev?.snapshots ?? [], lastRun: prev?.lastRun };
    this.set({ drafts: { ...this.state.drafts, [exerciseId]: rec } });
    void this.put('drafts', rec);
  }

  snapshot(exerciseId: string, source: string, label: string) {
    const prev = this.state.drafts[exerciseId];
    const snaps = [...(prev?.snapshots ?? [])];
    if (snaps.length && snaps[snaps.length - 1].source === source) return;
    snaps.push({ source, at: this.now(), label });
    const rec = { exerciseId, source: prev?.source ?? source, updatedAt: prev?.updatedAt ?? this.now(), snapshots: snaps.slice(-20), lastRun: prev?.lastRun };
    this.set({ drafts: { ...this.state.drafts, [exerciseId]: rec } });
    void this.put('drafts', rec);
  }

  recordRun(exerciseId: string, source: string, stdout: string, errorType?: string) {
    const prev = this.state.drafts[exerciseId];
    const rec = { exerciseId, source, updatedAt: prev?.source === source ? prev.updatedAt : this.now(), snapshots: prev?.snapshots ?? [], lastRun: { at: this.now(), stdout: stdout.slice(0, 4000), errorType } };
    this.set({ drafts: { ...this.state.drafts, [exerciseId]: rec } });
    void this.put('drafts', rec);
  }

  // ───── hints ─────

  revealHint(exerciseId: string, level: number) {
    const prev = this.state.hints[exerciseId] ?? { exerciseId, revealedLevel: 0, history: [] };
    if (level <= prev.revealedLevel) return;
    const at = this.now();
    const rec = {
      ...prev,
      revealedLevel: level,
      history: [...prev.history, { level, at }],
      solutionViewedAt: level >= 4 ? (prev.solutionViewedAt ?? at) : prev.solutionViewedAt,
    };
    this.set({ hints: { ...this.state.hints, [exerciseId]: rec } });
    void this.put('hints', rec);
  }

  assistance(exerciseId: string) {
    const h = this.state.hints[exerciseId];
    return { hintLevel: Math.min(h?.revealedLevel ?? 0, 3), solutionViewed: !!h?.solutionViewedAt };
  }

  // ───── evidence ─────

  private addEvidence(e: Omit<EvidenceRecord, 'id'>): EvidenceRecord {
    const rec = { ...e, id: uid() };
    this.set({ evidence: [...this.state.evidence, rec] });
    void this.put('evidence', rec);
    return rec;
  }

  private scheduleFor(skillId: string, at: string): ReviewRecord | null {
    const r = maybeScheduleFirstReview(this.state.reviews, skillId, at, reviewPromptsForSkill(skillId).length > 0);
    if (r) {
      this.set({ reviews: { ...this.state.reviews, [r.id]: r } });
      void this.put('reviews', r);
    }
    return r;
  }

  /** Record a Check attempt; award evidence only for a pass. */
  recordCheck(ex: Exercise, source: string, graded: GradedCheck, opts: { reviewId?: string; stateKey?: string } = {}): CheckOutcome {
    const at = this.now();
    const used = this.assistance(opts.stateKey ?? ex.id);
    const decision = graded.passed && !opts.reviewId ? evidenceForPass(ex, used) : null;
    const newEvidence: EvidenceRecord[] = [];
    const scheduledReviews: ReviewRecord[] = [];
    if (decision && !opts.reviewId) {
      for (const skillId of ex.skills) {
        newEvidence.push(
          this.addEvidence({ skillId, level: decision.level, origin: 'browser-python', sourceType: 'exercise', refId: ex.id, at, assisted: decision.assisted, note: decision.reason }),
        );
        const r = this.scheduleFor(skillId, at);
        if (r) scheduledReviews.push(r);
      }
    }
    const attempt: AttemptRecord = {
      id: uid(),
      exerciseId: ex.id,
      at,
      source,
      passed: graded.passed,
      passedCount: graded.passedCount,
      totalCount: graded.totalCount,
      failedRequirementIds: graded.requirements.filter((r) => !r.passed).map((r) => r.requirement.id),
      hintLevel: used.solutionViewed ? 4 : used.hintLevel,
      solutionViewed: used.solutionViewed,
      awarded: newEvidence.map((e) => ({ skillId: e.skillId, level: e.level })),
      reviewId: opts.reviewId,
      contentVersion: CONTENT_VERSION,
    };
    this.set({ attempts: [...this.state.attempts, attempt] });
    void this.put('attempts', attempt);
    return { attempt, decision, newEvidence, scheduledReviews };
  }

  // ───── reviews ─────

  recordReview(reviewId: string, promptId: string, passed: boolean, assisted: boolean, origin: EvidenceOrigin = 'browser-python') {
    const review = this.state.reviews[reviewId];
    if (!review || review.completedAt) return null;
    const at = this.now();
    const outcome = recordReviewAttempt(review, passed, assisted, promptId, at);
    const reviews = { ...this.state.reviews, [review.id]: outcome.review };
    if (outcome.next) reviews[outcome.next.id] = outcome.next;
    this.set({ reviews });
    void this.put('reviews', outcome.review);
    if (outcome.next) void this.put('reviews', outcome.next);
    let evidence: EvidenceRecord | null = null;
    if (outcome.evidence) {
      evidence = this.addEvidence({ skillId: review.skillId, level: outcome.evidence.level, origin, sourceType: 'review', refId: promptId, at, assisted: outcome.evidence.assisted, note: outcome.evidence.reason });
    }
    return { ...outcome, evidenceRecord: evidence };
  }

  /** Exercise-based review: a Check run inside the review screen. */
  recordReviewCheck(reviewId: string, promptId: string, ex: Exercise, source: string, graded: GradedCheck, stateKey: string) {
    const used = this.assistance(stateKey);
    const assisted = used.solutionViewed || used.hintLevel > ex.allowedHintLevel;
    const check = this.recordCheck(ex, source, graded, { reviewId, stateKey });
    const review = this.recordReview(reviewId, promptId, graded.passed, assisted);
    return { check, review };
  }

  // ───── diagnostics ─────

  saveDiagnostic(rec: DiagnosticRecord) {
    const others = this.state.diagnostics.filter((d) => d.id !== rec.id);
    this.set({ diagnostics: [...others, rec].sort((a, b) => a.at.localeCompare(b.at)) });
    void this.put('diagnostics', rec);
  }

  // ───── labs ─────

  updateLab(labId: string, patch: Partial<LabRecord>) {
    const prev = this.state.labs[labId] ?? { labId, status: 'not-started' as const, checklist: {} };
    const rec = { ...prev, ...patch };
    this.set({ labs: { ...this.state.labs, [labId]: rec } });
    void this.put('labs', rec);
  }

  submitLabEvidence(labId: string, transcript: string, parsed: Record<string, string>, skills: string[]) {
    const at = this.now();
    this.updateLab(labId, { status: 'evidence-submitted', transcript, parsed, submittedAt: at });
    for (const skillId of skills) {
      this.addEvidence({
        skillId,
        level: 'applied' as EvidenceLevel,
        origin: 'self-reported',
        sourceType: 'lab',
        refId: labId,
        at,
        assisted: false,
        note: `Pasted transcript (status=${parsed.status ?? 'unknown'}, python=${parsed.python ?? '?'}). Self-reported: EngAcad cannot verify where it ran.`,
      });
    }
  }

  // ───── notes ─────

  saveNote(id: string, text: string) {
    const rec = { id, text, updatedAt: this.now() };
    this.set({ notes: { ...this.state.notes, [id]: rec } });
    void this.put('notes', rec);
  }

  // ───── backup ─────

  async exportBackup(): Promise<BackupFile> {
    await this.flush();
    return createBackup(this.state, this.now());
  }

  async importBackup(text: string, mode: 'replace' | 'merge'): Promise<BackupFile> {
    const backup = parseBackup(text);
    const at = this.now();
    const incoming: ProgressState = {
      ...backup.data,
      evidence: backup.data.evidence.map((e) => ({ ...e, importedAt: e.importedAt ?? at })),
    };
    const next =
      mode === 'replace'
        ? { ...incoming, meta: { ...incoming.meta, contentVersion: CONTENT_VERSION }, settings: { ...this.state.settings, ...incoming.settings } }
        : mergeStates(this.state, incoming);
    this.state = next;
    if (this.db) {
      await this.flush();
      await replaceAll(this.db, next);
    }
    this.emit();
    return backup;
  }

  async resetAll() {
    this.state = emptyState(this.now(), CONTENT_VERSION);
    if (this.db) {
      await this.flush();
      await replaceAll(this.db, this.state);
    }
    this.emit();
  }
}

export const exerciseOrThrow = (id: string) => {
  const ex = exerciseById(id);
  if (!ex) throw new Error(`Unknown exercise ${id}`);
  return ex;
};
