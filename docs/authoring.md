# Authoring a week

Content is typed data, separate from React views. Adding a week never requires a
bespoke page.

## Steps

1. Create `src/content/modules/<module>/` files (see `m00-orientation/`):
   - `lessons.ts` — `Lesson[]` with ordered `sections`, each tagged with a
     contract stage (`why`, `model`, `walkthrough`, `guided`, `independent`,
     `takeaway`, `transfer`). Instructional lessons must contain all seven
     stages and at least 600 words of teaching copy (validated).
   - `exercises.ts` — `Exercise[]` (guided, independent, assessment, review).
   - `labs.ts`, `diagnostic.ts` if needed.
2. Register them in `src/content/index.ts` (and any new review prompts).
3. Add new skills to `src/content/skills.ts`.
4. In `src/curriculum/roadmap.ts`, set the week's status to `available` and list
   its lesson and lab IDs. Update the Beacon milestone status when its content
   exists.
5. Run `npm test`. The curriculum suite validates structure and executes every
   exercise's reference solution and negative examples in real Pyodide.

## Exercise contract

- **Inputs** are written as Python literals (`'240'`, `'240.0'`, `'"beacon-api"'`,
  `'True'`) so `int`/`float`/`bool` stay exact. Every input is listed in
  `protectedInputs`; learner code that reassigns one fails the `protected`
  requirement.
- **Fixtures**: exactly one `nominal`, at least one `alternate` and one
  `boundary` case, with different expected results (validated).
- **Requirements** (each has a label, concept and a conceptual `feedback` nudge):
  - `runs` — finishes without an exception
  - `stdout` — compares output; `match: 'lines'` ignores trailing whitespace,
    `'exact'` only when exact formatting is what the lesson teaches
  - `stdout-contains`
  - `var` — a variable's value and exact type (`int`, `float`, `str`, `bool`,
    or `number`), with `tolerance` for floats
  - `expr` — a Python expression over `ns`, `stdout`, `expected`, `inputs`
  - `protected` — no reassignment of supplied inputs (static)
  - `uses` — static construct check: `fstring`, `call:print`, `name:x`,
    `op:Add`, `compare:GtE` (add `forbid: true` to forbid)
- **Hints**: levels 1–3 plus `solution` (level 4). `allowedHintLevel` sets how
  many hints still count as independent; the solution never does.
- **negativeExamples**: realistic wrong programs that must fail.
- Prompts that show expected output in a ```` ```text ```` block must match the
  nominal fixture exactly (tested).
- Beacon milestone exercises set `beaconArtifact: { milestoneId, filename }`;
  the Beacon page then exports a standalone `.py` with the nominal inputs.

## Week 02

Week 02 must be authored from `Engineering_Academy_Week_02_Reference_Unit.md`
(the approved source for explanations, scenarios, sample code, fixtures, hints,
assessments and reference solutions). Do not substitute generic content.
