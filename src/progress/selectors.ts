/** Derived views of progress used by the dashboard and progress pages. */
import { EXERCISES, LESSONS, exercisesForLesson, lessonById } from '../content';
import { SKILLS } from '../content/skills';
import type { EvidenceLevel, Lesson } from '../curriculum/types';
import { WEEKS } from '../curriculum/roadmap';
import { skillLevel, type ProgressState } from './model';

export interface LessonItem {
  id: string;
  label: string;
  kind: 'reading' | 'exercise' | 'diagnostic';
  minutes: number;
  done: boolean;
  sectionId: string;
}

/** The observable learning actions inside a lesson, in order. */
export function lessonItems(lesson: Lesson, state: ProgressState): LessonItem[] {
  const items: LessonItem[] = [];
  const rec = state.lessons[lesson.id];
  const exMinutes = exercisesForLesson(lesson.id).reduce((n, e) => n + e.estimatedMinutes, 0);
  const diagMinutes = lesson.sections.some((s) => s.blocks.some((b) => b.type === 'diagnostic')) ? 15 : 0;
  const readingMinutes = Math.max(5, lesson.estimatedMinutes - exMinutes - diagMinutes);
  for (const s of lesson.sections) {
    for (const b of s.blocks) {
      if (b.type === 'exercise') {
        const ex = EXERCISES.find((e) => e.id === b.exerciseId);
        if (!ex) continue;
        items.push({ id: ex.id, label: ex.title, kind: 'exercise', minutes: ex.estimatedMinutes, done: state.attempts.some((a) => a.exerciseId === ex.id && a.passed && !a.reviewId), sectionId: s.id });
      } else if (b.type === 'diagnostic') {
        items.push({ id: b.diagnosticId, label: 'Baseline diagnostic', kind: 'diagnostic', minutes: diagMinutes, done: state.diagnostics.some((d) => d.diagnosticId === b.diagnosticId && d.completed), sectionId: s.id });
      }
    }
  }
  items.unshift({ id: `${lesson.id}:reading`, label: 'Work through the explanations', kind: 'reading', minutes: readingMinutes, done: !!rec?.introducedAt, sectionId: lesson.sections[0].id });
  return items;
}

export function lessonProgress(lesson: Lesson, state: ProgressState) {
  const items = lessonItems(lesson, state);
  const done = items.filter((i) => i.done).length;
  const remainingMinutes = items.filter((i) => !i.done).reduce((n, i) => n + i.minutes, 0);
  return { items, done, total: items.length, complete: done === items.length, remainingMinutes };
}

/** Lessons from weeks whose content is actually available, in order. */
export const availableLessons = () =>
  WEEKS.filter((w) => w.status === 'available')
    .flatMap((w) => w.lessonIds)
    .map((id) => lessonById(id)!)
    .filter(Boolean);

export interface NextSession {
  lesson: Lesson;
  item: LessonItem | null;
  remainingMinutes: number;
  resume: boolean;
}

/** "What should I study next?" — resume where the learner was, else the first unfinished lesson. */
export function nextSession(state: ProgressState): NextSession | null {
  const lessons = availableLessons();
  const last = state.meta.lastLocation ? lessonById(state.meta.lastLocation.lessonId) : undefined;
  const ordered = last ? [last, ...lessons.filter((l) => l.id !== last.id)] : lessons;
  for (const lesson of ordered) {
    const p = lessonProgress(lesson, state);
    if (!p.complete) {
      return { lesson, item: p.items.find((i) => !i.done) ?? null, remainingMinutes: p.remainingMinutes, resume: lesson.id === last?.id };
    }
  }
  return null;
}

export interface SkillSummary {
  skillId: string;
  title: string;
  canDo: string;
  domain: string;
  level: EvidenceLevel | null;
  evidenceCount: number;
  origins: string[];
}

export function skillSummaries(state: ProgressState): SkillSummary[] {
  return SKILLS.map((s) => {
    const ev = state.evidence.filter((e) => e.skillId === s.id);
    return { skillId: s.id, title: s.title, canDo: s.canDo, domain: s.domain, level: skillLevel(state.evidence, s.id), evidenceCount: ev.length, origins: [...new Set(ev.map((e) => e.origin))] };
  });
}

export const independentSkills = (state: ProgressState) =>
  skillSummaries(state).filter((s) => s.level === 'applied' || s.level === 'mastered' || s.level === 'retained');

export const allLessons = () => LESSONS;
