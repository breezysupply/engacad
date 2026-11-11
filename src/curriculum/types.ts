/**
 * Engineering Academy content model.
 *
 * Authored content (modules, lessons, exercises, labs, reviews) is plain typed
 * data kept separate from view components. Everything has a stable string ID so
 * learner progress survives content updates.
 */

export type EvidenceLevel = 'introduced' | 'guided' | 'applied' | 'mastered' | 'retained';
export const EVIDENCE_LEVELS: EvidenceLevel[] = ['introduced', 'guided', 'applied', 'mastered', 'retained'];

/** Where a piece of evidence actually came from. Never upgrade an origin. */
export type EvidenceOrigin =
  | 'browser-python' // learner code executed and checked by Pyodide in this browser
  | 'self-reported' // learner states or pastes something; EngAcad did not verify it
  | 'imported' // came from a backup file
  | 'simulation' // a deterministic simulated scenario
  | 'lesson'; // engaged with instructional content

export type LabMode = 'browser-python' | 'real-codespaces' | 'real-local' | 'simulation';

export type LessonStage = 'why' | 'model' | 'walkthrough' | 'guided' | 'independent' | 'takeaway' | 'transfer';

export interface Skill {
  id: string;
  domain: SkillDomain;
  title: string;
  /** What "can do" means for this skill, in plain language. */
  canDo: string;
  introducedIn: string; // week id, e.g. "w01"
}

export type SkillDomain =
  | 'orientation'
  | 'python'
  | 'linux'
  | 'networking'
  | 'apis'
  | 'containers'
  | 'iac'
  | 'cicd'
  | 'kubernetes'
  | 'reliability'
  | 'fde'
  | 'environment';

// ───────────────────────────── content blocks ─────────────────────────────

export type ContentBlock =
  | { type: 'markdown'; md: string }
  | { type: 'callout'; tone: 'info' | 'tip' | 'warn' | 'safety'; title: string; md: string }
  | { type: 'code'; code: string; language?: 'python' | 'bash' | 'text'; caption?: string }
  | { type: 'example'; id: string; title: string; code: string; caption?: string; inputs?: Record<string, string> }
  | { type: 'walkthrough'; title: string; code: string; steps: WalkthroughStep[] }
  | { type: 'diagram'; diagramId: string; caption: string }
  | { type: 'exercise'; exerciseId: string }
  | { type: 'quiz'; id: string; question: string; options: string[]; answerIndex: number; explanation: string }
  | { type: 'reflection'; id: string; prompt: string; criteria: string[] }
  | { type: 'takeaway'; points: string[] }
  | { type: 'envcheck' }
  | { type: 'diagnostic'; diagnosticId: string }
  | { type: 'lab-link'; labId: string };

export interface WalkthroughStep {
  /** 1-based inclusive line range in `code` that this step explains. */
  lines: [number, number];
  md: string;
}

export interface LessonSection {
  id: string;
  stage: LessonStage;
  title: string;
  blocks: ContentBlock[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  weekId: string;
  order: number;
  title: string;
  summary: string;
  estimatedMinutes: number;
  /**
   * 'instructional' lessons must implement the full lesson contract.
   * 'orientation' lessons (Week 01) are product/diagnostic sessions and are
   * validated against a lighter contract.
   */
  kind: 'instructional' | 'orientation';
  objectives: string[];
  prerequisites: string[]; // skill ids
  skillsIntroduced: string[]; // skill ids that reading this lesson introduces
  sections: LessonSection[];
  nextLessonId?: string;
}

// ───────────────────────────── exercises & grading ─────────────────────────────

/**
 * - worked: runnable example, never graded.
 * - guided: scaffolded practice; a pass awards Guided evidence.
 * - independent: transfer task; a pass within the allowed assistance awards Applied.
 * - assessment: independent skill assessment with fresh fixtures; awards Applied.
 * - review: delayed transfer review prompt; can award Retained.
 */
export type ExerciseMode = 'guided' | 'independent' | 'assessment' | 'review';

/** Inputs and expected values are written as Python literals so int/float/bool stay exact. */
export type PyLiteral = string;

export interface FixtureCase {
  id: string;
  label: string;
  kind: 'nominal' | 'alternate' | 'boundary';
  inputs: Record<string, PyLiteral>;
  expect: {
    stdout?: string;
    vars?: Record<string, PyLiteral>;
  };
}

export type Requirement =
  | ({ kind: 'runs' } & RequirementBase)
  | ({ kind: 'stdout'; match?: 'exact' | 'lines' } & RequirementBase)
  | ({ kind: 'stdout-contains'; text: string } & RequirementBase)
  | ({ kind: 'var'; name: string; type?: 'int' | 'float' | 'str' | 'bool' | 'number'; tolerance?: number } & RequirementBase)
  | ({ kind: 'expr'; expr: string } & RequirementBase)
  | ({ kind: 'protected' } & RequirementBase)
  | ({ kind: 'uses'; construct: string; forbid?: boolean } & RequirementBase);

export interface RequirementBase {
  id: string;
  label: string;
  concept: string;
  /** Conceptual nudge shown when this requirement fails. */
  feedback: string;
  /** Restrict to specific case ids (default: all cases). */
  cases?: string[];
}

export interface Hint {
  level: 1 | 2 | 3;
  text: string;
}

export interface NegativeExample {
  label: string;
  source: string;
}

export interface Exercise {
  id: string;
  lessonId: string;
  mode: ExerciseMode;
  title: string;
  prompt: string; // markdown
  estimatedMinutes: number;
  skills: string[];
  /** Names the checker supplies; learner code must not reassign them. */
  protectedInputs: string[];
  /** Short description of each provided input, shown in the Inputs panel. */
  inputNotes?: Record<string, string>;
  starter: string;
  cases: FixtureCase[];
  requirements: Requirement[];
  /** Level 1–3 hints; level 4 is the worked solution. */
  hints: Hint[];
  solution: { source: string; explanation: string };
  negativeExamples: NegativeExample[];
  /**
   * Highest hint level that still counts as independent work. Revealing the
   * solution (level 4) never counts as independent.
   */
  allowedHintLevel: 0 | 1 | 2 | 3;
  /** For guided exercises whose solution was revealed: an equivalent fresh task. */
  independentVariantId?: string;
  beaconArtifact?: { milestoneId: string; filename: string };
}

// ───────────────────────────── labs ─────────────────────────────

export interface Lab {
  id: string;
  weekId: string;
  title: string;
  mode: LabMode[];
  status: 'available' | 'planned';
  optional: boolean;
  estimatedMinutes: number;
  objective: string;
  prerequisites: string[];
  environment: string;
  costNote: string;
  safetyNote: string;
  preflight: string[];
  setup: { title: string; steps: string[] }[];
  instructions: string[];
  verification: { description: string; command?: string; expectMarker?: string };
  cleanup: string[];
  evidence: { kind: 'self-reported-transcript' | 'none'; description: string; skills: string[] };
}

// ───────────────────────────── reviews & diagnostics ─────────────────────────────

export type ReviewPrompt =
  | { id: string; skillId: string; kind: 'exercise'; exerciseId: string }
  | { id: string; skillId: string; kind: 'quiz'; question: string; options: string[]; answerIndex: number; explanation: string };

export interface DiagnosticQuestion {
  id: string;
  area: 'python' | 'linux' | 'networking' | 'git';
  question: string;
  code?: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Diagnostic {
  id: string;
  title: string;
  questions: DiagnosticQuestion[];
}

// ───────────────────────────── modules & roadmap ─────────────────────────────

/**
 * - available: authored, tested, usable now.
 * - awaiting-content: platform ready but authoritative content not yet supplied.
 * - planned: scope only; not learnable and never counted as progress.
 */
export type WeekStatus = 'available' | 'awaiting-content' | 'planned';

export interface WeekPlan {
  id: string; // "w01" … "w52"
  number: number;
  moduleId: string;
  focus: string;
  output: string;
  status: WeekStatus;
  lessonIds: string[];
  labIds: string[];
  beaconMilestoneId?: string;
}

export interface ModulePlan {
  id: string;
  number: number;
  title: string;
  description: string;
  weeks: [number, number];
  outcomes: string[];
  prerequisiteSkills: string[];
  note?: string;
}

export interface BeaconMilestone {
  id: string;
  version: string;
  weeks: string;
  title: string;
  description: string;
  status: WeekStatus;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  tags: string[];
}
