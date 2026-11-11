/**
 * Static curriculum validation. Used by the test suite (and usable in the app
 * for development) to keep authored content consistent and honest.
 */
import type { Diagnostic, Exercise, Lab, Lesson, ReviewPrompt, Skill } from './types';
import type { ModulePlan, WeekPlan } from './types';

export interface ContentBundle {
  modules: ModulePlan[];
  weeks: WeekPlan[];
  lessons: Lesson[];
  exercises: Exercise[];
  labs: Lab[];
  skills: Skill[];
  reviewPrompts: ReviewPrompt[];
  diagnostics: Diagnostic[];
}

const FULL_CONTRACT = ['why', 'model', 'walkthrough', 'guided', 'independent', 'takeaway', 'transfer'] as const;
const ORIENTATION_CONTRACT = ['why', 'takeaway'] as const;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export function validateContent(c: ContentBundle): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  // unique ids
  const allIds = [
    ...c.modules.map((m) => `module:${m.id}`),
    ...c.weeks.map((w) => `week:${w.id}`),
    ...c.lessons.map((l) => `lesson:${l.id}`),
    ...c.exercises.map((e) => `exercise:${e.id}`),
    ...c.labs.map((l) => `lab:${l.id}`),
    ...c.skills.map((s) => `skill:${s.id}`),
    ...c.reviewPrompts.map((r) => `review:${r.id}`),
    ...c.diagnostics.map((d) => `diagnostic:${d.id}`),
  ];
  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) err(`duplicate id ${id}`);
    seen.add(id);
  }
  const skillIds = new Set(c.skills.map((s) => s.id));
  const lessonIds = new Set(c.lessons.map((l) => l.id));
  const exerciseIds = new Set(c.exercises.map((e) => e.id));
  const labIds = new Set(c.labs.map((l) => l.id));
  const moduleIds = new Set(c.modules.map((m) => m.id));

  // weeks ↔ modules
  if (c.weeks.length !== 52) err(`expected 52 core weeks, found ${c.weeks.length}`);
  c.weeks.forEach((w, i) => {
    if (w.number !== i + 1) err(`week ${w.id} out of order`);
    const mod = c.modules.find((m) => m.id === w.moduleId);
    if (!mod) err(`week ${w.id} references unknown module ${w.moduleId}`);
    else if (w.number < mod.weeks[0] || w.number > mod.weeks[1]) err(`week ${w.id} outside module ${mod.id} range`);
    for (const id of w.lessonIds) if (!lessonIds.has(id)) err(`week ${w.id} references missing lesson ${id}`);
    for (const id of w.labIds) if (!labIds.has(id)) err(`week ${w.id} references missing lab ${id}`);
    if (w.status !== 'available' && w.lessonIds.length) err(`week ${w.id} is ${w.status} but lists lessons — planned weeks must not expose lessons`);
    if (w.status === 'available' && !w.lessonIds.length) err(`week ${w.id} is available but has no lessons`);
  });
  for (const l of c.lessons) {
    const w = c.weeks.find((x) => x.id === l.weekId);
    if (!w) err(`lesson ${l.id} references unknown week ${l.weekId}`);
    else {
      if (w.moduleId !== l.moduleId) err(`lesson ${l.id} module ${l.moduleId} ≠ week module ${w.moduleId}`);
      if (w.status !== 'available') err(`lesson ${l.id} belongs to non-available week ${w.id}`);
      if (!w.lessonIds.includes(l.id)) err(`lesson ${l.id} not listed by week ${w.id}`);
    }
    if (!moduleIds.has(l.moduleId)) err(`lesson ${l.id} unknown module`);
    if (l.nextLessonId && !lessonIds.has(l.nextLessonId)) err(`lesson ${l.id} next lesson ${l.nextLessonId} missing`);
    for (const s of [...l.prerequisites, ...l.skillsIntroduced]) if (!skillIds.has(s)) err(`lesson ${l.id} references unknown skill ${s}`);
    if (!l.objectives.length) err(`lesson ${l.id} has no objectives`);

    // lesson contract
    const stages = new Set(l.sections.map((s) => s.stage));
    const contract = l.kind === 'instructional' ? FULL_CONTRACT : ORIENTATION_CONTRACT;
    for (const st of contract) if (!stages.has(st)) err(`lesson ${l.id} missing required stage "${st}"`);
    const secIds = new Set<string>();
    for (const s of l.sections) {
      if (secIds.has(s.id)) err(`lesson ${l.id} duplicate section ${s.id}`);
      secIds.add(s.id);
      if (!s.blocks.length) err(`lesson ${l.id} section ${s.id} is empty`);
      for (const b of s.blocks) {
        if (b.type === 'exercise' && !exerciseIds.has(b.exerciseId)) err(`lesson ${l.id} references missing exercise ${b.exerciseId}`);
        if (b.type === 'lab-link' && !labIds.has(b.labId)) err(`lesson ${l.id} references missing lab ${b.labId}`);
        if (b.type === 'diagnostic' && !c.diagnostics.some((d) => d.id === b.diagnosticId)) err(`lesson ${l.id} references missing diagnostic`);
        if (b.type === 'quiz' && (b.answerIndex < 0 || b.answerIndex >= b.options.length)) err(`quiz ${b.id} answer out of range`);
        if (b.type === 'walkthrough') {
          const n = b.code.split('\n').length;
          for (const st of b.steps) if (st.lines[0] < 1 || st.lines[1] > n || st.lines[0] > st.lines[1]) err(`walkthrough in ${l.id} has bad line range`);
        }
      }
    }
    // substantive teaching copy
    const prose = l.sections
      .flatMap((s) => s.blocks)
      .map((b) => (b.type === 'markdown' || b.type === 'callout' ? b.md : b.type === 'walkthrough' ? b.steps.map((x) => x.md).join(' ') : ''))
      .join(' ');
    const minWords = l.kind === 'instructional' ? 600 : 250;
    if (wordCount(prose) < minWords) err(`lesson ${l.id} has only ${wordCount(prose)} words of teaching copy (min ${minWords})`);
  }

  // exercises
  for (const e of c.exercises) {
    if (!lessonIds.has(e.lessonId)) err(`exercise ${e.id} references missing lesson ${e.lessonId}`);
    for (const s of e.skills) if (!skillIds.has(s)) err(`exercise ${e.id} references unknown skill ${s}`);
    if (!e.skills.length) err(`exercise ${e.id} assesses no skills`);
    if (e.cases.length < 3) err(`exercise ${e.id} needs ≥3 fixtures (has ${e.cases.length})`);
    const kinds = new Set(e.cases.map((x) => x.kind));
    for (const k of ['nominal', 'alternate', 'boundary'] as const) if (!kinds.has(k)) err(`exercise ${e.id} lacks a ${k} fixture`);
    if (e.cases.filter((x) => x.kind === 'nominal').length !== 1) err(`exercise ${e.id} must have exactly one nominal fixture`);
    const caseIds = new Set(e.cases.map((x) => x.id));
    if (caseIds.size !== e.cases.length) err(`exercise ${e.id} duplicate fixture ids`);
    for (const x of e.cases) {
      for (const p of e.protectedInputs) if (!(p in x.inputs)) err(`exercise ${e.id} fixture ${x.id} missing input ${p}`);
      for (const k of Object.keys(x.inputs)) if (!e.protectedInputs.includes(k)) err(`exercise ${e.id} fixture ${x.id} input ${k} is not declared protected`);
    }
    const nominal = e.cases.find((x) => x.kind === 'nominal');
    const others = e.cases.filter((x) => x.kind !== 'nominal');
    if (nominal && others.every((o) => JSON.stringify(o.expect) === JSON.stringify(nominal.expect)))
      err(`exercise ${e.id}: alternate/boundary fixtures expect the same result as nominal, so hardcoding would pass`);
    if (!e.requirements.length) err(`exercise ${e.id} has no requirements`);
    const reqIds = new Set<string>();
    for (const r of e.requirements) {
      if (reqIds.has(r.id)) err(`exercise ${e.id} duplicate requirement ${r.id}`);
      reqIds.add(r.id);
      if (!r.feedback.trim()) err(`exercise ${e.id} requirement ${r.id} has no feedback`);
      for (const cid of r.cases ?? []) if (!caseIds.has(cid)) err(`exercise ${e.id} requirement ${r.id} unknown case ${cid}`);
      if (r.kind === 'stdout' && !e.cases.some((x) => x.expect.stdout !== undefined)) err(`exercise ${e.id} stdout requirement but no expected stdout`);
      if (r.kind === 'var' && !e.cases.some((x) => x.expect.vars && r.name in x.expect.vars)) err(`exercise ${e.id} var requirement ${r.name} has no expected values`);
    }
    if (e.protectedInputs.length && !e.requirements.some((r) => r.kind === 'protected')) err(`exercise ${e.id} has inputs but no protected-input requirement`);
    if (e.hints.length !== 3 || e.hints.some((h, i) => h.level !== i + 1 || !h.text.trim())) err(`exercise ${e.id} must have hints at levels 1, 2, 3`);
    if (!e.solution.source.trim() || !e.solution.explanation.trim()) err(`exercise ${e.id} lacks a reference solution and explanation`);
    if (!e.negativeExamples.length) err(`exercise ${e.id} has no negative examples`);
    if (e.independentVariantId && !exerciseIds.has(e.independentVariantId)) err(`exercise ${e.id} independent variant missing`);
    if (e.mode === 'guided' && !e.independentVariantId) err(`guided exercise ${e.id} should offer an independent variant`);
    if (e.starter.trim() === e.solution.source.trim()) err(`exercise ${e.id} starter equals the solution`);
  }

  // review prompts
  for (const r of c.reviewPrompts) {
    if (!skillIds.has(r.skillId)) err(`review ${r.id} unknown skill ${r.skillId}`);
    if (r.kind === 'exercise') {
      const ex = c.exercises.find((e) => e.id === r.exerciseId);
      if (!ex) err(`review ${r.id} missing exercise ${r.exerciseId}`);
      else if (ex.mode !== 'review') err(`review ${r.id} exercise ${ex.id} should be mode "review"`);
    } else if (r.answerIndex < 0 || r.answerIndex >= r.options.length) err(`review ${r.id} answer out of range`);
  }

  // labs
  for (const l of c.labs) {
    for (const s of l.evidence.skills) if (!skillIds.has(s)) err(`lab ${l.id} unknown skill ${s}`);
    if (l.status === 'available' && (!l.cleanup.length || !l.costNote || !l.safetyNote)) err(`lab ${l.id} needs cleanup, cost and safety notes`);
  }

  // prerequisite cycles (skills → lessons that introduce them)
  const introducedBy = new Map<string, Lesson>();
  for (const l of c.lessons) for (const s of l.skillsIntroduced) if (!introducedBy.has(s)) introducedBy.set(s, l);
  const visiting = new Set<string>();
  const done = new Set<string>();
  const visit = (l: Lesson, path: string[]) => {
    if (done.has(l.id)) return;
    if (visiting.has(l.id)) {
      err(`prerequisite cycle: ${[...path, l.id].join(' → ')}`);
      return;
    }
    visiting.add(l.id);
    for (const p of l.prerequisites) {
      const dep = introducedBy.get(p);
      if (dep && dep.id !== l.id) visit(dep, [...path, l.id]);
    }
    visiting.delete(l.id);
    done.add(l.id);
  };
  c.lessons.forEach((l) => visit(l, []));

  // diagnostics
  for (const d of c.diagnostics) for (const q of d.questions) if (q.answerIndex < 0 || q.answerIndex >= q.options.length) err(`diagnostic ${q.id} answer out of range`);

  return errors;
}
