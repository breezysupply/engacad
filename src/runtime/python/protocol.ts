import type { Exercise, Requirement } from '../../curriculum/types';

export interface PyError {
  type: string;
  message: string;
  line: number | null;
  traceback: string;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  error: PyError | null;
  variables: { name: string; type: string; repr: string; input: boolean }[];
  protectedWarnings: { name: string; line: number }[];
  durationMs?: number;
}

export interface RequirementCaseResult {
  requirementId: string;
  caseId: string;
  applicable: boolean;
  passed: boolean;
  expected?: string;
  observed?: string;
  note?: string;
  diff?: {
    firstDiffLine?: number | null;
    expectedLine?: string | null;
    observedLine?: string | null;
    lineCountExpected?: number;
    lineCountObserved?: number;
    note?: string;
  };
}

export interface CaseResult {
  caseId: string;
  stdout: string;
  stderr: string;
  error: PyError | null;
  results: RequirementCaseResult[];
  passed: boolean;
}

export interface RawCheckResult {
  passed: boolean;
  syntaxError: PyError | null;
  static: { requirementId: string; passed: boolean; expected?: string; observed?: string }[];
  cases: CaseResult[];
}

export interface CheckSpec {
  protected: string[];
  cases: Exercise['cases'];
  requirements: Requirement[];
}

export const buildCheckSpec = (ex: Pick<Exercise, 'protectedInputs' | 'cases' | 'requirements'>): CheckSpec => ({
  protected: ex.protectedInputs,
  cases: ex.cases,
  requirements: ex.requirements,
});

// ───── worker messages ─────

export type ToWorker =
  | { type: 'init'; indexURL: string }
  | { type: 'run'; id: number; source: string; inputs: Record<string, string> }
  | { type: 'check'; id: number; source: string; spec: CheckSpec };

export type FromWorker =
  | { type: 'ready'; version: string; pythonVersion: string }
  | { type: 'init-error'; message: string }
  | { type: 'run-result'; id: number; result: RunResult }
  | { type: 'check-result'; id: number; result: RawCheckResult }
  | { type: 'internal-error'; id: number; message: string };
