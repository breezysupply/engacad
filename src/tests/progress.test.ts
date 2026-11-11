import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { exerciseById } from '../content';
import { addDays, evidenceForPass, maybeScheduleFirstReview, recordReviewAttempt, reviewsDue, skillLevel, type EvidenceRecord } from '../progress/model';
import { ProgressStore } from '../progress/store';
import { nextSession } from '../progress/selectors';
import type { GradedCheck } from '../runtime/python/grading';

const passing = (n = 3): GradedCheck => ({ passed: true, passedCount: n, totalCount: n, syntaxError: null, timeout: null, requirements: [], cases: [], conceptsToRevisit: [] });
const failing: GradedCheck = { ...passing(), passed: false, passedCount: 1 };

let dbCounter = 0;
const makeStore = async (clock?: () => Date) => {
  const s = new ProgressStore(clock, `test-db-${++dbCounter}`);
  await s.init();
  return s;
};

describe('evidence rules', () => {
  const guided = { mode: 'guided' as const, allowedHintLevel: 3 as const };
  const indep = { mode: 'independent' as const, allowedHintLevel: 1 as const };
  it('guided pass is Guided, assisted when hints used', () => {
    expect(evidenceForPass(guided, { hintLevel: 0, solutionViewed: false })).toMatchObject({ level: 'guided', assisted: false });
    expect(evidenceForPass(guided, { hintLevel: 2, solutionViewed: false })).toMatchObject({ level: 'guided', assisted: true });
  });
  it('independent pass within allowance is Applied', () => {
    expect(evidenceForPass(indep, { hintLevel: 0, solutionViewed: false }).level).toBe('applied');
    expect(evidenceForPass(indep, { hintLevel: 1, solutionViewed: false }).level).toBe('applied');
  });
  it('assistance beyond allowance or a revealed solution never masquerades as Applied', () => {
    expect(evidenceForPass(indep, { hintLevel: 2, solutionViewed: false }).level).toBe('guided');
    expect(evidenceForPass(indep, { hintLevel: 0, solutionViewed: true }).level).toBe('guided');
    expect(evidenceForPass({ mode: 'assessment', allowedHintLevel: 0 }, { hintLevel: 1, solutionViewed: false }).level).toBe('guided');
  });
  it('skill level is the highest level reached', () => {
    const ev = (level: EvidenceRecord['level']): EvidenceRecord => ({ id: level, skillId: 's', level, origin: 'browser-python', sourceType: 'exercise', refId: 'x', at: '', assisted: false });
    expect(skillLevel([ev('introduced'), ev('applied'), ev('guided')], 's')).toBe('applied');
    expect(skillLevel([], 's')).toBeNull();
  });
});

describe('review scheduling (1/7/21/45 days, no penalties)', () => {
  const t0 = '2026-11-01T10:00:00.000Z';
  it('schedules the first review one day after demonstration, once per skill', () => {
    const r = maybeScheduleFirstReview({}, 'py.print-basics', t0, true)!;
    expect(r.dueAt).toBe(addDays(t0, 1));
    expect(maybeScheduleFirstReview({ [r.id]: r }, 'py.print-basics', t0, true)).toBeNull();
    expect(maybeScheduleFirstReview({}, 'x', t0, false)).toBeNull();
  });
  it('walks through 1 → 7 → 21 → 45 day steps relative to completion', () => {
    let r = maybeScheduleFirstReview({}, 's', t0, true)!;
    const gaps: number[] = [];
    const levels: string[] = [];
    let when = r.dueAt;
    for (let i = 0; i < 4; i++) {
      const o = recordReviewAttempt(r, true, false, 'p', when);
      levels.push(o.evidence!.level);
      if (!o.next) break;
      gaps.push((new Date(o.next.dueAt).getTime() - new Date(when).getTime()) / 86400000);
      r = o.next;
      when = r.dueAt;
    }
    expect(gaps).toEqual([6, 14, 24]);
    expect(levels).toEqual(['applied', 'retained', 'retained', 'retained']);
  });
  it('a failed or late review stays available without penalty', () => {
    const r = maybeScheduleFirstReview({}, 's', t0, true)!;
    const o = recordReviewAttempt(r, false, false, 'p', addDays(t0, 30));
    expect(o.review.completedAt).toBeUndefined();
    expect(o.next).toBeNull();
    expect(reviewsDue({ [r.id]: o.review }, addDays(t0, 31))).toHaveLength(1);
  });
  it('an assisted review pass is Guided, not Retained', () => {
    const r = { ...maybeScheduleFirstReview({}, 's', t0, true)!, step: 1 };
    expect(recordReviewAttempt(r, true, true, 'p', t0).evidence!.level).toBe('guided');
  });
});

describe('ProgressStore with IndexedDB', () => {
  it('persists drafts, hints and attempts across a reload', async () => {
    const s = await makeStore();
    s.saveDraft('w01-ex-reachable', 'print(service_name, "is reachable")');
    s.revealHint('w01-ex-reachable', 2);
    s.recordCheck(exerciseById('w01-ex-reachable')!, 'x', failing);
    await s.flush();
    const s2 = new ProgressStore(undefined, `test-db-${dbCounter}`);
    await s2.init();
    expect(s2.state.drafts['w01-ex-reachable'].source).toContain('is reachable');
    expect(s2.state.hints['w01-ex-reachable'].revealedLevel).toBe(2);
    expect(s2.state.attempts).toHaveLength(1);
    expect(s2.state.evidence).toHaveLength(0);
  });

  it('a failing check records an attempt but no evidence; a pass awards and schedules a review', async () => {
    const s = await makeStore();
    const ex = exerciseById('w01-ex-service-card')!;
    s.recordCheck(ex, 'x', failing);
    expect(s.state.evidence).toHaveLength(0);
    const out = s.recordCheck(ex, 'y', passing());
    expect(out.decision?.level).toBe('applied');
    expect(s.state.evidence.map((e) => [e.skillId, e.level, e.origin])).toEqual([
      ['orient.run-check', 'applied', 'browser-python'],
      ['py.print-basics', 'applied', 'browser-python'],
    ]);
    expect(Object.keys(s.state.reviews).sort()).toEqual(['orient.run-check#0', 'py.print-basics#0']);
  });

  it('revealing the solution downgrades an independent pass to Guided', async () => {
    const s = await makeStore();
    const ex = exerciseById('w01-ex-service-card')!;
    s.revealHint(ex.id, 4);
    expect(s.recordCheck(ex, 'y', passing()).decision).toMatchObject({ level: 'guided', assisted: true });
    expect(s.state.attempts[0].solutionViewed).toBe(true);
  });

  it('hint history is preserved and never decreases', async () => {
    const s = await makeStore();
    s.revealHint('e', 1);
    s.revealHint('e', 3);
    s.revealHint('e', 2);
    expect(s.state.hints.e.revealedLevel).toBe(3);
    expect(s.state.hints.e.history.map((h) => h.level)).toEqual([1, 3]);
  });

  it('exports and imports a backup into a clean profile (replace)', async () => {
    const a = await makeStore();
    a.saveDraft('w01-ex-reachable', 'print(1)');
    a.recordCheck(exerciseById('w01-ex-reachable')!, 'x', passing());
    a.setLocation('w01-l1', 'guided', 'w01-ex-reachable');
    const backup = JSON.stringify(await a.exportBackup());
    const b = await makeStore();
    await b.importBackup(backup, 'replace');
    const reloaded = new ProgressStore(undefined, `test-db-${dbCounter}`);
    await reloaded.init();
    expect(reloaded.state.drafts['w01-ex-reachable'].source).toBe('print(1)');
    expect(reloaded.state.evidence).toHaveLength(2);
    expect(reloaded.state.evidence.every((e) => e.importedAt)).toBe(true);
    expect(reloaded.state.meta.lastLocation?.lessonId).toBe('w01-l1');
  });

  it('merge keeps current work and adds imported records', async () => {
    const a = await makeStore();
    a.recordCheck(exerciseById('w01-ex-reachable')!, 'x', passing());
    const backup = JSON.stringify(await a.exportBackup());
    const b = await makeStore();
    b.saveDraft('w01-ex-service-card', 'mine');
    b.recordCheck(exerciseById('w01-ex-service-card')!, 'y', failing);
    await b.importBackup(backup, 'merge');
    expect(b.state.drafts['w01-ex-service-card'].source).toBe('mine');
    expect(b.state.attempts).toHaveLength(2);
    await b.importBackup(backup, 'merge');
    expect(b.state.attempts).toHaveLength(2); // idempotent
  });

  it('rejects invalid backups without changing progress', async () => {
    const s = await makeStore();
    s.saveDraft('e', 'keep');
    await expect(s.importBackup('{nope', 'replace')).rejects.toThrow(/not valid JSON/);
    await expect(s.importBackup(JSON.stringify({ format: 'other' }), 'replace')).rejects.toThrow(/not an EngAcad/);
    const future = JSON.stringify({ ...(await s.exportBackup()), schemaVersion: 99 });
    await expect(s.importBackup(future, 'replace')).rejects.toThrow(/newer version/);
    expect(s.state.drafts.e.source).toBe('keep');
  });

  it('a review pass at the 7-day step awards Retained', async () => {
    let now = new Date('2026-11-01T09:00:00Z');
    const s = await makeStore(() => now);
    s.recordCheck(exerciseById('w01-ex-service-card')!, 'y', passing());
    now = new Date('2026-11-02T10:00:00Z');
    const r0 = s.recordReview('py.print-basics#0', 'rp-print-connecting', true, false)!;
    expect(r0.evidenceRecord?.level).toBe('applied');
    expect(s.state.reviews['py.print-basics#1'].dueAt.startsWith('2026-11-08')).toBe(true);
    now = new Date('2026-11-09T10:00:00Z');
    expect(s.recordReview('py.print-basics#1', 'rp-print-status', true, false)!.evidenceRecord?.level).toBe('retained');
    expect(skillLevel(s.state.evidence, 'py.print-basics')).toBe('retained');
  });

  it('dashboard next session starts at the first lesson, then resumes the last location', async () => {
    const s = await makeStore();
    expect(nextSession(s.state)?.lesson.id).toBe('w01-l1');
    s.setLocation('w01-l2', 'diagnostic');
    expect(nextSession(s.state)).toMatchObject({ resume: true });
    expect(nextSession(s.state)?.lesson.id).toBe('w01-l2');
  });
});
