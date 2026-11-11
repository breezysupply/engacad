import { beforeAll, describe, expect, it } from 'vitest';
import type { Exercise } from '../../curriculum/types';
import { getHarness } from '../../tests/pyodideNode';
import type { Harness } from './harness';
import { buildCheckSpec } from './protocol';
import { gradeCheck } from './grading';

let h: Harness;
beforeAll(async () => {
  h = await getHarness();
});

const ex: Pick<Exercise, 'protectedInputs' | 'cases' | 'requirements'> = {
  protectedInputs: ['latency_ms', 'requests'],
  cases: [
    { id: 'n', label: 'nominal', kind: 'nominal', inputs: { latency_ms: '240', requests: '3' }, expect: { stdout: 'avg 80.0\n', vars: { avg: '80.0', slow: 'True' } } },
    { id: 'a', label: 'alternate', kind: 'alternate', inputs: { latency_ms: '99', requests: '4' }, expect: { stdout: 'avg 24.75\n', vars: { avg: '24.75', slow: 'False' } } },
    { id: 'b', label: 'boundary', kind: 'boundary', inputs: { latency_ms: '150', requests: '3' }, expect: { stdout: 'avg 50.0\n', vars: { avg: '50.0', slow: 'True' } } },
  ],
  requirements: [
    { id: 'runs', kind: 'runs', label: 'runs', concept: 'execution', feedback: '' },
    { id: 'avg', kind: 'var', name: 'avg', type: 'float', tolerance: 1e-6, label: 'avg', concept: 'arithmetic', feedback: '' },
    { id: 'slow', kind: 'var', name: 'slow', type: 'bool', label: 'slow', concept: 'comparison', feedback: '' },
    { id: 'out', kind: 'stdout', label: 'out', concept: 'output', feedback: '' },
    { id: 'prot', kind: 'protected', label: 'inputs', concept: 'inputs', feedback: '' },
    { id: 'fs', kind: 'uses', construct: 'fstring', label: 'f-string', concept: 'fstrings', feedback: '' },
  ],
};
const spec = buildCheckSpec(ex);
const good = 'avg = latency_ms / requests\nslow = avg >= 50\nprint(f"avg {avg}")\n';

describe('grader.py', () => {
  it('runs code and captures stdout and variables', () => {
    const r = h.run('x = 2 + 3\nprint("hi", x)', {});
    expect(r.stdout).toBe('hi 5\n');
    expect(r.error).toBeNull();
    expect(r.variables).toContainEqual({ name: 'x', type: 'int', repr: '5', input: false });
  });

  it('keeps int and float fixtures distinct', () => {
    const r = h.run('print(type(a).__name__, type(b).__name__, type(c).__name__)', { a: '2', b: '2.0', c: 'True' });
    expect(r.stdout).toBe('int float bool\n');
  });

  it('passes a correct solution on every case', () => {
    const g = gradeCheck(ex, h.check(good, spec));
    expect(g.passed).toBe(true);
    expect(g.passedCount).toBe(g.totalCount);
  });

  it('rejects a nominal-value hardcoded answer', () => {
    const g = gradeCheck(ex, h.check('avg = 80.0\nslow = True\nprint(f"avg {avg}")', spec));
    expect(g.passed).toBe(false);
    const avg = g.requirements.find((r) => r.requirement.id === 'avg')!;
    expect(avg.passed).toBe(false);
    expect(avg.failures.map((f) => f.caseId)).toEqual(['a', 'b']);
  });

  it('detects reassignment of protected inputs', () => {
    const g = gradeCheck(ex, h.check('latency_ms = 240\n' + good, spec));
    const prot = g.requirements.find((r) => r.requirement.id === 'prot')!;
    expect(prot.passed).toBe(false);
    expect(prot.staticDetail?.observed).toContain('latency_ms reassigned on line 1');
  });

  it('catches the boundary (>= vs >) case', () => {
    const g = gradeCheck(ex, h.check(good.replace('>=', '>'), spec));
    const slow = g.requirements.find((r) => r.requirement.id === 'slow')!;
    expect(slow.passed).toBe(false);
    expect(slow.failures.map((f) => f.caseKind)).toEqual(['boundary']);
  });

  it('distinguishes bool from int and float from int', () => {
    const g = gradeCheck(ex, h.check('avg = latency_ms // requests\nslow = 1\nprint(f"avg {avg}")', spec));
    expect(g.requirements.find((r) => r.requirement.id === 'avg')!.passed).toBe(false);
    expect(g.requirements.find((r) => r.requirement.id === 'slow')!.passed).toBe(false);
  });

  it('uses float tolerance', () => {
    const g = gradeCheck(ex, h.check('avg = latency_ms / requests + 1e-9\nslow = avg >= 50\nprint(f"avg {round(avg, 2)}")', spec));
    expect(g.requirements.find((r) => r.requirement.id === 'avg')!.passed).toBe(true);
  });

  it('reports syntax errors with a line number and does not run cases', () => {
    const raw = h.check('print("hi"', spec);
    expect(raw.syntaxError?.type).toBe('SyntaxError');
    expect(raw.syntaxError?.line).toBe(1);
    expect(raw.cases).toEqual([]);
  });

  it('reports runtime errors with learner line numbers only', () => {
    const r = h.run('a = 1\nb = "x" + a\n', {});
    expect(r.error?.type).toBe('TypeError');
    expect(r.error?.line).toBe(2);
    expect(r.error?.traceback).toContain('Line 2');
    expect(r.error?.traceback).not.toContain('grader');
  });

  it('gives every check case a fresh namespace', () => {
    const leakSpec = buildCheckSpec({
      protectedInputs: [],
      cases: [
        { id: '1', label: '1', kind: 'nominal', inputs: {}, expect: { stdout: 'False\n' } },
        { id: '2', label: '2', kind: 'alternate', inputs: {}, expect: { stdout: 'False\n' } },
      ],
      requirements: [{ id: 'o', kind: 'stdout', label: 'o', concept: 'c', feedback: '' }],
    });
    const raw = h.check("print('seen' in globals())\nseen = 1", leakSpec);
    expect(raw.passed).toBe(true);
    expect(h.run("print('seen' in globals())", {}).stdout).toBe('False\n');
  });

  it('blocks input() with a clear message', () => {
    const r = h.run('x = input("name")', {});
    expect(r.error?.type).toBe('RuntimeError');
    expect(r.error?.message).toContain('Inputs panel');
  });

  it('reports exact-mode trailing whitespace mismatches but accepts them in lines mode', () => {
    const s = (match: 'exact' | 'lines') =>
      buildCheckSpec({
        protectedInputs: [],
        cases: [{ id: '1', label: '1', kind: 'nominal', inputs: {}, expect: { stdout: 'ok\n' } }],
        requirements: [{ id: 'o', kind: 'stdout', match, label: 'o', concept: 'c', feedback: '' }],
      });
    expect(h.check('print("ok ")', s('lines')).passed).toBe(true);
    expect(h.check('print("ok ")', s('exact')).passed).toBe(false);
  });
});
