/**
 * Content registry. New weeks are added by authoring data files and listing
 * them here — no bespoke React pages.
 */
import type { Diagnostic, Exercise, Lab, Lesson, ReviewPrompt } from '../curriculum/types';
import { W01_DIAGNOSTIC } from './modules/m00-orientation/diagnostic';
import { W01_EXERCISES } from './modules/m00-orientation/exercises';
import { W01_LABS } from './modules/m00-orientation/labs';
import { W01_LESSONS } from './modules/m00-orientation/lessons';

/** Bump when authored content changes in a way worth recording with progress. */
export const CONTENT_VERSION = '2026.11.11-r1';

export const LESSONS: Lesson[] = [...W01_LESSONS];
export const EXERCISES: Exercise[] = [...W01_EXERCISES];
export const LABS: Lab[] = [...W01_LABS];
export const DIAGNOSTICS: Diagnostic[] = [W01_DIAGNOSTIC];

export const REVIEW_PROMPTS: ReviewPrompt[] = [
  { id: 'rp-print-connecting', skillId: 'py.print-basics', kind: 'exercise', exerciseId: 'w01-rev-connecting' },
  { id: 'rp-print-status', skillId: 'py.print-basics', kind: 'exercise', exerciseId: 'w01-rev-status-arrow' },
  {
    id: 'rp-runcheck-1',
    skillId: 'orient.run-check',
    kind: 'quiz',
    question: 'Your program prints the right line when you press Run, but Check fails the "alternate" fixture. What is the most likely cause?',
    options: [
      'The checker is broken',
      'The program only works for the default input — for example it hardcodes the example value',
      'Run and Check use different Python versions',
      'You need to press Run again first',
    ],
    answerIndex: 1,
    explanation: 'Run uses only the default input. The alternate fixture uses different values, so a hardcoded or input-ignoring program fails there.',
  },
  {
    id: 'rp-runcheck-2',
    skillId: 'orient.run-check',
    kind: 'quiz',
    question: 'Which action can award Applied evidence?',
    options: [
      'Pressing Run on a program that prints the expected output',
      'Passing Check on an independent task within the allowed hints',
      'Passing Check after revealing the worked solution',
      'Reading the whole lesson',
    ],
    answerIndex: 1,
    explanation: 'Only Check on an independent task, without assistance beyond the stated allowance, counts as Applied.',
  },
];

export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);
export const labById = (id: string) => LABS.find((l) => l.id === id);
export const diagnosticById = (id: string) => DIAGNOSTICS.find((d) => d.id === id);
export const lessonsForWeek = (weekId: string) => LESSONS.filter((l) => l.weekId === weekId).sort((a, b) => a.order - b.order);
export const exercisesForLesson = (lessonId: string) => {
  const lesson = lessonById(lessonId);
  if (!lesson) return [];
  const ids = lesson.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'exercise' ? [b.exerciseId] : [])));
  return ids.map((id) => exerciseById(id)!).filter(Boolean);
};
export const reviewPromptsForSkill = (skillId: string) => REVIEW_PROMPTS.filter((p) => p.skillId === skillId);
