import type { Lesson } from '../../../curriculum/types';

export const W01_LESSONS: Lesson[] = [
  {
    id: 'w01-l1',
    moduleId: 'm00',
    weekId: 'w01',
    order: 1,
    title: 'How EngAcad works',
    summary: 'Evidence instead of page views, Run versus Check, and your first real Python program in the browser.',
    estimatedMinutes: 40,
    kind: 'orientation',
    objectives: [
      'Explain the five evidence levels and what earns each one',
      'Use Run to explore and Check to prove a requirement',
      'Write and check a one-line Python program that uses a provided input',
    ],
    prerequisites: [],
    skillsIntroduced: ['orient.run-check', 'py.print-basics'],
    nextLessonId: 'w01-l2',
    sections: [
      {
        id: 'why',
        stage: 'why',
        title: 'Why this academy is built around practice',
        blocks: [
          {
            type: 'markdown',
            md: `Picture a customer call. Their deployment of your product is failing, their network blocks most outbound traffic, and the familiar console you read about is not available. Nobody asks whether you have *read* about DNS, containers or Terraform. The question is whether you can find the failure, change something safely, and prove it is fixed.

That is the gap this academy is designed to close. Reading builds a mental model; only doing builds the skill. So every week here follows the same shape:

| Part of the week | Typical time |
|---|---:|
| Two focused instructional lessons | 60 min |
| Guided coding or troubleshooting practice | 45 min |
| A real lab or a Beacon project milestone | 75 min |
| An independent skill assessment | 20 min |
| Retrieval and reflection | 10 min |

That is about **3½ hours a week**, at your own pace. There are no fixed days, no streaks, and no penalties for a slow week. If a lab is hard, the app suggests a longer session rather than marking you down.`,
          },
          {
            type: 'callout',
            tone: 'info',
            title: 'What Week 01 is (and is not)',
            md: 'This week is orientation: how the tools work, a quick environment check, and a low-pressure baseline. It deliberately teaches only one tiny piece of Python — `print()` — so you can try the workflow. Variables, types and arithmetic are taught properly in Week 02.',
          },
        ],
      },
      {
        id: 'evidence',
        stage: 'model',
        title: 'Evidence, not page views',
        blocks: [
          {
            type: 'markdown',
            md: `EngAcad does not track "percent of pages opened". It tracks **evidence**: a dated record that you demonstrated a specific skill, and *how* you demonstrated it. Each skill climbs a five-step ladder:`,
          },
          { type: 'diagram', diagramId: 'evidence-ladder', caption: 'Each step needs a different kind of proof. Opening a page never gets you past Introduced.' },
          {
            type: 'markdown',
            md: `- **Introduced** — you worked through the explanation.
- **Guided** — you completed a scaffolded exercise. Hints and even a revealed solution are fine here; that is what guided practice is for.
- **Applied** — you passed a *different* task on your own, within the allowed assistance.
- **Mastered** — you passed a larger practical assessment, including its critical criteria.
- **Retained** — you used the skill again after a real delay (a 7-, 21- or 45-day review), ideally in a new context.

Evidence is always tagged with its **origin**, and the app never upgrades it:`,
          },
          {
            type: 'markdown',
            md: `| Badge | Meaning |
|---|---|
| **Browser Python** | Your code actually ran in this browser (Pyodide) and passed automated checks. |
| **Real lab** | You worked in a real terminal — your Mac or a GitHub Codespace. |
| **Simulation** | A deterministic scripted scenario. It proves your reasoning inside the scenario, not a real infrastructure change. |
| **Self-reported** | You supplied it (for example a pasted transcript). It is stored honestly, but EngAcad cannot verify where it came from. |`,
          },
          {
            type: 'quiz',
            id: 'w01-q-evidence',
            question: 'You revealed the worked solution of a guided exercise, then pressed Check and it passed. What evidence does that produce?',
            options: ['Applied — the check passed', 'Guided — assisted practice counts as guided, not independent', 'Mastered — every requirement passed', 'Nothing at all'],
            answerIndex: 1,
            explanation: 'A revealed solution still teaches you something, so the pass counts as Guided practice. Applied needs a fresh task you solve within the allowed assistance — the app offers one.',
          },
        ],
      },
      {
        id: 'run-vs-check',
        stage: 'model',
        title: 'Run versus Check',
        blocks: [
          {
            type: 'markdown',
            md: `The code pane has two different buttons, and the difference matters.`,
          },
          { type: 'diagram', diagramId: 'run-vs-check', caption: 'Run explores with the default input. Check proves the program works for several inputs.' },
          {
            type: 'markdown',
            md: `**Run** executes your program once with the default input and shows what it printed, any error with its line number, and the variables it created. Use it freely and often: it never grades you and never awards evidence.

**Check** runs your program several times against **fixtures** — prepared inputs chosen to be *normal*, *alternate* and *boundary* cases. It then evaluates each requirement separately and tells you which ones passed, what was expected, and what your program actually did. Only Check records an attempt and can award evidence.

Two consequences:

1. **Hardcoding doesn't pass.** If you type the example answer directly, the alternate fixture will expose it.
2. **Inputs are provided, not typed.** Exercises name the inputs the checker supplies (they are listed in the *Inputs* panel). Use them; don't reassign them, or your program ignores the real input. Check flags any reassignment.`,
          },
          {
            type: 'callout',
            tone: 'tip',
            title: 'Keyboard shortcuts',
            md: '**⌘/Ctrl + Enter** runs the code. **⌘/Ctrl + Shift + Enter** runs Check. Normal text-editing shortcuts (undo, select all, copy, paste) behave as usual. Press **?** outside the editor to see all shortcuts.',
          },
        ],
      },
      {
        id: 'first-program',
        stage: 'walkthrough',
        title: 'Walkthrough: your first program',
        blocks: [
          {
            type: 'markdown',
            md: `First, confirm your browser can run Python. The check below starts the interpreter (a few megabytes, downloaded once and then cached by the browser) and confirms that your progress can be saved.`,
          },
          { type: 'envcheck' },
          {
            type: 'walkthrough',
            title: 'Two calls to print()',
            code: `print("Beacon is online")\nprint("checks passing:", 3)\nprint("region:", "eu-west-1", "zone:", "b")`,
            steps: [
              { lines: [1, 1], md: '`print(...)` calls a built-in **function**: a named piece of behaviour. The value inside the parentheses is its **argument**. `"Beacon is online"` is a **string** — text in quotes — and it is printed exactly as written, followed by a newline.' },
              { lines: [2, 2], md: 'A comma separates two arguments: a string and the number `3` (no quotes, so it is a number, not text). `print` writes each value and puts **exactly one space** between them: `checks passing: 3`.' },
              { lines: [3, 3], md: 'Any number of comma-separated values works the same way. Notice that the space after each colon comes from `print`, not from the quotes.' },
            ],
          },
          {
            type: 'example',
            id: 'w01-ex-playground',
            title: 'Try it: edit and Run',
            caption: 'Change the text, add a third print() call, or remove a quote to see what a syntax error looks like. Nothing here is graded.',
            code: `print("Beacon is online")\nprint("checks passing:", 3)\n`,
          },
          {
            type: 'markdown',
            md: `One more idea before you practise. A **variable** is a name that refers to a value. In the exercises the checker creates variables for you — for example \`service_name\` holding \`"beacon-api"\`. Written **without quotes**, the name means "the value it refers to"; written **with quotes**, \`"service_name"\` is just the literal word. Week 02 covers variables properly; for now that one distinction is enough.`,
          },
          {
            type: 'example',
            id: 'w01-ex-variable-demo',
            title: 'Try it: a provided input',
            caption: 'Here the input service_name is supplied as if by a checker. Compare the two lines of output.',
            code: `print(service_name)\nprint("service_name")\n`,
            inputs: { service_name: '"beacon-api"' },
          },
        ],
      },
      {
        id: 'guided',
        stage: 'guided',
        title: 'Guided practice',
        blocks: [
          {
            type: 'markdown',
            md: `Open the exercise in the code pane. Run the starter code first to see what it does, then change it. If you get stuck, the **Hints** tab has a ladder: a nudge, a concept reminder, a specific hint, and finally the worked solution. Hints you open are remembered.`,
          },
          { type: 'exercise', exerciseId: 'w01-ex-reachable' },
        ],
      },
      {
        id: 'independent',
        stage: 'independent',
        title: 'Independent application',
        blocks: [
          {
            type: 'markdown',
            md: `Now a similar, but not identical, task with two inputs and two lines of output. This one can award **Applied** evidence. Its assistance rule is stated in the prompt: the first hint is allowed, deeper hints or the solution turn the pass into Guided practice.`,
          },
          { type: 'exercise', exerciseId: 'w01-ex-service-card' },
        ],
      },
      {
        id: 'takeaway',
        stage: 'takeaway',
        title: 'Takeaway',
        blocks: [
          {
            type: 'takeaway',
            points: [
              'Run is for exploring; Check is for proving. Only Check records evidence.',
              'Check uses several inputs, including boundary cases, so a program must use its inputs rather than hardcode an example.',
              'print(a, b, c) prints the values with one space between them and ends the line. Quoted text is literal; an unquoted name is replaced by its value.',
              'Evidence carries its origin. Browser Python checks, real labs, simulations and self-reports are always labelled differently.',
            ],
          },
          {
            type: 'reflection',
            id: 'w01-refl-1',
            prompt: 'In two or three sentences: why would a single passing example be weak evidence that a program is correct? Think of one input that could break a program that works on the example.',
            criteria: [
              'Mentions that a program can match one example by coincidence or hardcoding',
              'Names a different or boundary input (an empty value, a value with spaces, a threshold)',
              'Connects this to why Check uses several fixtures',
            ],
          },
        ],
      },
      {
        id: 'transfer',
        stage: 'transfer',
        title: 'Transfer and review',
        blocks: [
          {
            type: 'markdown',
            md: `When you demonstrate a skill, EngAcad schedules short **reviews** about 1, 7, 21 and 45 days later. Reviews are usually small new tasks rather than flashcards — for example printing a connection message with a host and a port. A review you miss simply stays available; nothing is lost and there is no streak to break.

Next: a short baseline diagnostic, and an optional real-terminal lab.`,
          },
        ],
      },
    ],
  },
  {
    id: 'w01-l2',
    moduleId: 'm00',
    weekId: 'w01',
    order: 2,
    title: 'Baseline diagnostic & real environment',
    summary: 'A low-pressure snapshot of where you are in Python, Linux, networking and Git, plus an optional real Python lab.',
    estimatedMinutes: 35,
    kind: 'orientation',
    objectives: ['Record a baseline skill profile', 'Know which modules you may accelerate later, and how', 'Optionally verify a real Python environment'],
    prerequisites: [],
    skillsIntroduced: ['env.local-python'],
    sections: [
      {
        id: 'why',
        stage: 'why',
        title: 'Why a baseline',
        blocks: [
          {
            type: 'markdown',
            md: `You already run cloud infrastructure for a living, so some early material — Linux navigation and everyday Git — may be familiar. Other areas, like Python or packet-level networking, may be new. A baseline lets the course respond to that honestly.

This diagnostic is **not graded** and does **not** award or remove evidence. Answer quickly from what you know; choose *"I'm not sure yet"* rather than guessing. The result is a profile and a set of suggestions, never an automatic skip: you will always keep access to every lesson, lab and review.`,
          },
        ],
      },
      {
        id: 'diagnostic',
        stage: 'model',
        title: 'Diagnostic: 16 quick questions',
        blocks: [{ type: 'diagnostic', diagnosticId: 'w01-baseline' }],
      },
      {
        id: 'how-used',
        stage: 'model',
        title: 'How the results are used',
        blocks: [
          {
            type: 'markdown',
            md: `- **Python and networking** start from first principles regardless of the result; a strong score means the early weeks should feel quick.
- **Linux and Git**: if you answer most questions correctly, the Linux module will offer a *proficiency check* so you can move faster through introductory material by demonstrating skill — not by self-rating.
- You can retake the diagnostic later; earlier results are kept for comparison.`,
          },
          {
            type: 'callout',
            tone: 'info',
            title: 'What the four areas sample',
            md: '**Python** questions ask you to predict what short programs print, because reading code precisely is the first debugging skill. **Linux** questions sample service logs, permissions, exit codes and signals. **Networking** questions sample the failure classes you will learn to separate — name resolution, refused connections and timeouts. **Git** questions sample the everyday safety moves: fetching without merging, recovering from a commit on the wrong branch, and reading what is staged.',
          },
        ],
      },
      {
        id: 'lab',
        stage: 'transfer',
        title: 'Optional: real Python on your Mac or in Codespaces',
        blocks: [
          {
            type: 'markdown',
            md: `Browser Python is perfect for the early weeks, but later modules use a real terminal. This optional lab checks that you have a working Python 3 locally or in a GitHub Codespace. It takes about 20–30 minutes and costs nothing on a Mac.`,
          },
          { type: 'lab-link', labId: 'lab-w01-real-python' },
        ],
      },
      {
        id: 'takeaway',
        stage: 'takeaway',
        title: 'Takeaway',
        blocks: [
          {
            type: 'takeaway',
            points: [
              'The diagnostic is a snapshot for planning, not a grade.',
              'Acceleration is earned by demonstrating skill, never by self-confidence alone.',
              'Real labs are labelled differently from browser Python and simulations, and pasted evidence is marked self-reported.',
            ],
          },
        ],
      },
    ],
  },
];
