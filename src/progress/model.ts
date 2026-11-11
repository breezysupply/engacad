/**
 * Learner progress records and the pure rules that turn activity into
 * evidence. Kept free of React and storage so the rules are easy to test.
 */
import type { EvidenceLevel, EvidenceOrigin, Exercise } from '../curriculum/types';
import { EVIDENCE_LEVELS } from '../curriculum/types';

export const SCHEMA_VERSION = 1;

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  editorFontSize: number;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', editorFontSize: 14 };

export interface DraftRecord {
  exerciseId: string;
  source: string;
  updatedAt: string;
  snapshots: { source: string; at: string; label: string }[];
  lastRun?: { at: string; stdout: string; errorType?: string };
}

export interface AttemptRecord {
  id: string;
  exerciseId: string;
  at: string;
  source: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  failedRequirementIds: string[];
  hintLevel: number;
  solutionViewed: boolean;
  awarded: { skillId: string; level: EvidenceLevel }[];
  reviewId?: string;
  contentVersion: string;
}

export interface HintRecord {
  exerciseId: string;
  /** 0 = none, 1–3 = hints, 4 = worked solution. */
  revealedLevel: number;
  history: { level: number; at: string }[];
  solutionViewedAt?: string;
}

export interface EvidenceRecord {
  id: string;
  skillId: string;
  level: EvidenceLevel;
  origin: EvidenceOrigin;
  sourceType: 'lesson' | 'exercise' | 'review' | 'lab';
  refId: string;
  at: string;
  assisted: boolean;
  note?: string;
  /** Set when this record arrived from a backup file rather than this browser. */
  importedAt?: string;
}

export const REVIEW_INTERVALS_DAYS = [1, 7, 21, 45] as const;

export interface ReviewRecord {
  id: string; // `${skillId}#${step}`
  skillId: string;
  step: number; // index into REVIEW_INTERVALS_DAYS
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  attempts: { at: string; passed: boolean; promptId: string; assisted: boolean }[];
}

export interface LessonProgressRecord {
  lessonId: string;
  startedAt: string;
  sectionsSeen: string[];
  lastSectionId?: string;
  activeExerciseId?: string;
  introducedAt?: string;
  quizAnswers: Record<string, number>;
}

export interface NoteRecord {
  id: string;
  text: string;
  updatedAt: string;
}

export interface DiagnosticRecord {
  id: string;
  diagnosticId: string;
  at: string;
  answers: Record<string, number | 'unsure'>;
  completed: boolean;
}

export interface LabRecord {
  labId: string;
  status: 'not-started' | 'in-progress' | 'evidence-submitted';
  startedAt?: string;
  transcript?: string;
  parsed?: Record<string, string>;
  submittedAt?: string;
  checklist: Record<string, boolean>;
}

export interface Meta {
  createdAt: string;
  contentVersion: string;
  lastLocation?: { lessonId: string; sectionId?: string; exerciseId?: string; at: string };
}

export interface ProgressState {
  drafts: Record<string, DraftRecord>;
  attempts: AttemptRecord[];
  hints: Record<string, HintRecord>;
  evidence: EvidenceRecord[];
  reviews: Record<string, ReviewRecord>;
  lessons: Record<string, LessonProgressRecord>;
  notes: Record<string, NoteRecord>;
  diagnostics: DiagnosticRecord[];
  labs: Record<string, LabRecord>;
  settings: Settings;
  meta: Meta;
}

export const emptyState = (now: string, contentVersion: string): ProgressState => ({
  drafts: {},
  attempts: [],
  hints: {},
  evidence: [],
  reviews: {},
  lessons: {},
  notes: {},
  diagnostics: [],
  labs: {},
  settings: { ...DEFAULT_SETTINGS },
  meta: { createdAt: now, contentVersion },
});

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ───────────────────────── evidence rules ─────────────────────────

export interface AssistanceUsed {
  hintLevel: number; // highest hint level revealed (0–3), 4 if solution viewed
  solutionViewed: boolean;
}

export interface EvidenceDecision {
  level: EvidenceLevel;
  assisted: boolean;
  reason: string;
}

/**
 * What a passing Check on this exercise earns. Running never earns evidence;
 * a failing Check never earns evidence.
 */
export function evidenceForPass(ex: Pick<Exercise, 'mode' | 'allowedHintLevel'>, used: AssistanceUsed): EvidenceDecision {
  const hints = used.solutionViewed ? 4 : used.hintLevel;
  if (ex.mode === 'guided') {
    return {
      level: 'guided',
      assisted: hints > 0,
      reason: used.solutionViewed
        ? 'Guided practice completed after viewing the worked solution.'
        : hints > 0
          ? `Guided practice completed with hints up to level ${hints}.`
          : 'Guided practice completed without hints.',
    };
  }
  // independent, assessment, review
  if (used.solutionViewed) {
    return { level: 'guided', assisted: true, reason: 'The worked solution was viewed, so this pass counts as guided practice, not independent work.' };
  }
  if (hints > ex.allowedHintLevel) {
    return {
      level: 'guided',
      assisted: true,
      reason: `Hint level ${hints} exceeds the ${ex.allowedHintLevel === 0 ? 'no-hint' : `level-${ex.allowedHintLevel}`} allowance for independent work, so this pass counts as guided practice.`,
    };
  }
  return { level: 'applied', assisted: hints > 0, reason: hints > 0 ? `Independent pass within the allowed hints (level ${hints}).` : 'Independent pass with no hints.' };
}

const rank = (l: EvidenceLevel) => EVIDENCE_LEVELS.indexOf(l);

export function highestLevel(evidence: Pick<EvidenceRecord, 'level'>[]): EvidenceLevel | null {
  let best: EvidenceLevel | null = null;
  for (const e of evidence) if (best === null || rank(e.level) > rank(best)) best = e.level;
  return best;
}

export function skillLevel(evidence: EvidenceRecord[], skillId: string): EvidenceLevel | null {
  return highestLevel(evidence.filter((e) => e.skillId === skillId));
}

/** True when the learner has ever reached at least `level` for `skillId`. */
export const hasLevel = (evidence: EvidenceRecord[], skillId: string, level: EvidenceLevel) => {
  const l = skillLevel(evidence, skillId);
  return l !== null && rank(l) >= rank(level);
};

// ───────────────────────── review scheduling ─────────────────────────

const DAY = 86_400_000;
export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

/**
 * Called when a skill is demonstrated (Guided or better). Creates the first
 * review (+1 day) if the skill has review prompts and no schedule yet.
 */
export function maybeScheduleFirstReview(reviews: Record<string, ReviewRecord>, skillId: string, at: string, hasPrompts: boolean): ReviewRecord | null {
  if (!hasPrompts) return null;
  if (Object.values(reviews).some((r) => r.skillId === skillId)) return null;
  return { id: `${skillId}#0`, skillId, step: 0, createdAt: at, dueAt: addDays(at, REVIEW_INTERVALS_DAYS[0]), attempts: [] };
}

export interface ReviewOutcome {
  review: ReviewRecord;
  next: ReviewRecord | null;
  evidence: { level: EvidenceLevel; assisted: boolean; reason: string } | null;
}

/**
 * Record a review attempt. A failed review stays due (no penalty, retry any
 * time). A pass completes the step and schedules the next interval relative to
 * the completion date. A pass at the 7-day step or later is Retained evidence.
 */
export function recordReviewAttempt(review: ReviewRecord, passed: boolean, assisted: boolean, promptId: string, at: string): ReviewOutcome {
  const updated: ReviewRecord = { ...review, attempts: [...review.attempts, { at, passed, promptId, assisted }] };
  if (!passed) return { review: updated, next: null, evidence: null };
  updated.completedAt = at;
  const step = review.step;
  const nextStep = step + 1;
  const next =
    nextStep < REVIEW_INTERVALS_DAYS.length
      ? {
          id: `${review.skillId}#${nextStep}`,
          skillId: review.skillId,
          step: nextStep,
          createdAt: at,
          dueAt: addDays(at, REVIEW_INTERVALS_DAYS[nextStep] - REVIEW_INTERVALS_DAYS[step]),
          attempts: [],
        }
      : null;
  let evidence: ReviewOutcome['evidence'];
  if (assisted) evidence = { level: 'guided', assisted: true, reason: 'Review passed with assistance beyond the allowance.' };
  else if (step >= 1)
    evidence = { level: 'retained', assisted: false, reason: `Used again successfully at the ${REVIEW_INTERVALS_DAYS[step]}-day review.` };
  else evidence = { level: 'applied', assisted: false, reason: 'Independent pass of a new task at the 1-day review.' };
  return { review: updated, next, evidence };
}

export const reviewsDue = (reviews: Record<string, ReviewRecord>, now: string) =>
  Object.values(reviews)
    .filter((r) => !r.completedAt && r.dueAt <= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

export const reviewsUpcoming = (reviews: Record<string, ReviewRecord>, now: string) =>
  Object.values(reviews)
    .filter((r) => !r.completedAt && r.dueAt > now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

/** Rotate prompts across steps so later reviews show a different task. */
export const promptForStep = <T>(prompts: T[], step: number): T | undefined => (prompts.length ? prompts[step % prompts.length] : undefined);
