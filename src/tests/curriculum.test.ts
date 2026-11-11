import { beforeAll, describe, expect, it } from 'vitest';
import { DIAGNOSTICS, EXERCISES, LABS, LESSONS, REVIEW_PROMPTS } from '../content';
import { SKILLS } from '../content/skills';
import { MODULES, WEEKS } from '../curriculum/roadmap';
import { validateContent, type ContentBundle } from '../curriculum/validate';
import type { Harness } from '../runtime/python/harness';
import { gradeCheck } from '../runtime/python/grading';
import { buildCheckSpec } from '../runtime/python/protocol';
import { getHarness } from './pyodideNode';

const bundle: ContentBundle = { modules: MODULES, weeks: WEEKS, lessons: LESSONS, exercises: EXERCISES, labs: LABS, skills: SKILLS, reviewPrompts: REVIEW_PROMPTS, diagnostics: DIAGNOSTICS };

describe('curriculum structure', () => {
  it('passes static validation', () => {
    expect(validateContent(bundle)).toEqual([]);
  });

  it('shows all 52 weeks, with only authored weeks available', () => {
    expect(WEEKS).toHaveLength(52);
    const available = WEEKS.filter((w) => w.status === 'available').map((w) => w.id);
    expect(available).toEqual(['w01']);
    for (const w of WEEKS.filter((x) => x.status !== 'available')) expect(w.lessonIds).toEqual([]);
  });

  it('marks Week 02 as awaiting its authoritative reference unit, not as available', () => {
    expect(WEEKS[1].status).toBe('awaiting-content');
  });

  it('detects a broken reference, a planned week exposing lessons, and a cycle', () => {
    const broken: ContentBundle = {
      ...bundle,
      weeks: bundle.weeks.map((w) => (w.number === 3 ? { ...w, lessonIds: ['w01-l1'] } : w)),
      lessons: [
        ...bundle.lessons.map((l) => (l.id === 'w01-l1' ? { ...l, prerequisites: ['env.local-python'], nextLessonId: 'nope' } : l.id === 'w01-l2' ? { ...l, prerequisites: ['py.print-basics'] } : l)),
      ],
    };
    const errs = validateContent(broken);
    expect(errs.some((e) => e.includes('planned weeks must not expose lessons'))).toBe(true);
    expect(errs.some((e) => e.includes('next lesson nope missing'))).toBe(true);
    expect(errs.some((e) => e.includes('prerequisite cycle'))).toBe(true);
  });

  it('flags fixtures that would let hardcoding pass', () => {
    const ex = EXERCISES[0];
    const same = { ...ex, cases: ex.cases.map((c) => ({ ...c, expect: ex.cases[0].expect })) };
    expect(validateContent({ ...bundle, exercises: [same, ...EXERCISES.slice(1)] }).some((e) => e.includes('hardcoding would pass'))).toBe(true);
  });
});

describe('graded exercises (real Pyodide)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await getHarness();
  });

  for (const ex of EXERCISES) {
    describe(ex.id, () => {
      const spec = buildCheckSpec(ex);

      it('reference solution passes every fixture and requirement', () => {
        const g = gradeCheck(ex, h.check(ex.solution.source, spec));
        const failing = g.requirements.filter((r) => !r.passed).map((r) => `${r.requirement.id}: ${JSON.stringify(r.failures)}`);
        expect(failing).toEqual([]);
        expect(g.passed).toBe(true);
      });

      it('starter code does not pass', () => {
        expect(gradeCheck(ex, h.check(ex.starter, spec)).passed).toBe(false);
      });

      for (const neg of ex.negativeExamples) {
        it(`rejects negative example: ${neg.label}`, () => {
          expect(gradeCheck(ex, h.check(neg.source, spec)).passed).toBe(false);
        });
      }

      it('rejects a program that hardcodes the nominal output', () => {
        const nominal = ex.cases.find((c) => c.kind === 'nominal')!;
        const vars = Object.entries(nominal.expect.vars ?? {}).map(([k, v]) => `${k} = ${v}`);
        const out = nominal.expect.stdout !== undefined ? [`print(${JSON.stringify(nominal.expect.stdout.replace(/\n$/, ''))})`] : [];
        const hardcoded = [...vars, ...out].join('\n');
        expect(gradeCheck(ex, h.check(hardcoded, spec)).passed).toBe(false);
      });

      it('teacher example output matches the nominal fixture', () => {
        // The prompt shows the nominal expected output in a ```text block; it must match the checker exactly.
        const shown = /```text\n([\s\S]*?)```/.exec(ex.prompt)?.[1];
        const nominal = ex.cases.find((c) => c.kind === 'nominal')!;
        if (shown !== undefined && nominal.expect.stdout !== undefined) expect(shown).toBe(nominal.expect.stdout);
        // and Run with the nominal inputs reproduces it
        const run = h.run(ex.solution.source, nominal.inputs);
        expect(run.error).toBeNull();
        if (nominal.expect.stdout !== undefined) expect(run.stdout).toBe(nominal.expect.stdout);
      });
    });
  }

  it('lesson example blocks run without errors', () => {
    for (const l of LESSONS)
      for (const s of l.sections)
        for (const b of s.blocks) {
          if (b.type === 'example') expect(h.run(b.code, b.inputs ?? {}).error, b.id).toBeNull();
          if (b.type === 'walkthrough') expect(h.run(b.code, {}).error, b.title).toBeNull();
        }
  });
});
