/**
 * Turns the grader's raw per-case output into learner-facing, requirement-level
 * feedback. Pure functions: unit-tested without Pyodide.
 */
import type { Exercise, FixtureCase, Requirement } from '../../curriculum/types';
import type { PyError, RawCheckResult, RequirementCaseResult } from './protocol';

export interface RequirementOutcome {
  requirement: Requirement;
  passed: boolean;
  /** Failing case details (empty for static requirements or passes). */
  failures: (RequirementCaseResult & { caseLabel: string; caseKind: FixtureCase['kind'] })[];
  staticDetail?: { expected?: string; observed?: string };
}

export interface GradedCheck {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  syntaxError: PyError | null;
  timeout: PyError | null;
  requirements: RequirementOutcome[];
  cases: { case: FixtureCase; passed: boolean; error: PyError | null; stdout: string }[];
  /** Concepts with at least one failing requirement. */
  conceptsToRevisit: string[];
}

export function gradeCheck(ex: Pick<Exercise, 'cases' | 'requirements'>, raw: RawCheckResult | { timeout: PyError }): GradedCheck {
  if ('timeout' in raw) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: ex.requirements.length,
      syntaxError: null,
      timeout: raw.timeout,
      requirements: ex.requirements.map((r) => ({ requirement: r, passed: false, failures: [] })),
      cases: [],
      conceptsToRevisit: [],
    };
  }
  if (raw.syntaxError) {
    return {
      passed: false,
      passedCount: 0,
      totalCount: ex.requirements.length,
      syntaxError: raw.syntaxError,
      timeout: null,
      requirements: ex.requirements.map((r) => ({ requirement: r, passed: false, failures: [] })),
      cases: [],
      conceptsToRevisit: [],
    };
  }
  const caseById = new Map(ex.cases.map((c) => [c.id, c]));
  const requirements: RequirementOutcome[] = ex.requirements.map((req) => {
    const st = raw.static.find((s) => s.requirementId === req.id);
    if (st) {
      return { requirement: req, passed: st.passed, failures: [], staticDetail: st.passed ? undefined : { expected: st.expected, observed: st.observed } };
    }
    const perCase = raw.cases.flatMap((c) => c.results.filter((r) => r.requirementId === req.id && r.applicable));
    const failures = perCase
      .filter((r) => !r.passed)
      .map((r) => {
        const fc = caseById.get(r.caseId)!;
        return { ...r, caseLabel: fc?.label ?? r.caseId, caseKind: fc?.kind ?? 'nominal' };
      });
    return { requirement: req, passed: perCase.length > 0 && failures.length === 0, failures };
  });
  const passedCount = requirements.filter((r) => r.passed).length;
  return {
    passed: raw.passed && passedCount === requirements.length,
    passedCount,
    totalCount: requirements.length,
    syntaxError: null,
    timeout: null,
    requirements,
    cases: raw.cases.map((c) => ({ case: caseById.get(c.caseId)!, passed: c.passed, error: c.error, stdout: c.stdout })),
    conceptsToRevisit: [...new Set(requirements.filter((r) => !r.passed).map((r) => r.requirement.concept))],
  };
}

/** A plain-language explanation of common Python errors for beginners. */
export function explainError(err: PyError): string {
  const m = err.message;
  switch (err.type) {
    case 'SyntaxError':
    case 'IndentationError':
    case 'TabError':
      if (/never closed|was never closed/.test(m)) return 'A bracket or quote was opened but not closed. Check the line shown and the one before it.';
      if (/unterminated string/.test(m)) return 'A string starts with a quote but never ends. Every opening quote needs a matching closing quote on the same line.';
      if (/indent/i.test(m)) return 'Python uses indentation to group code. At this stage, lines should normally start in the first column.';
      if (/invalid syntax/.test(m)) return 'Python could not understand this line. Look for a missing comma, quote, bracket or operator near the caret.';
      return 'Python could not read your code, so nothing ran. Fix the line shown and try again.';
    case 'NameError':
      return 'Python does not know this name. Check its spelling (names are case-sensitive) and that it is assigned before it is used. Text needs quotes; names do not.';
    case 'TypeError':
      if (/can only concatenate str/.test(m) || /unsupported operand type/.test(m))
        return 'You combined values of incompatible types — for example text and a number. Convert one explicitly, or use an f-string to build text.';
      if (/not callable/.test(m)) return 'Something that is not a function was called with (). Check for a variable that shadows a function name.';
      return 'An operation received a value of the wrong type. Check the types of the values on the line shown.';
    case 'ValueError':
      return 'A value had the right type but an unusable content — for example int("12.5") or int("abc").';
    case 'ZeroDivisionError':
      return 'Division by zero is undefined. Check the divisor on the line shown.';
    case 'AttributeError':
      return 'That value does not have the attribute or method you used. Check the value’s type and the spelling.';
    case 'Timeout':
      return 'Your program did not finish in time. Look for a loop whose condition never becomes false. The Python runtime was restarted and your code is unchanged.';
    case 'RuntimeError':
      if (/input\(\)/.test(m)) return 'Exercises supply inputs as variables instead of input(). Use the names shown in the Inputs panel.';
      return 'Python stopped while running your program. Read the last line of the traceback first.';
    case 'SystemExit':
      return 'The program called exit(), which stops it early. Remove the exit() call.';
    default:
      return 'Python stopped while running your program. Read the last line of the traceback first, then the line number above it.';
  }
}
