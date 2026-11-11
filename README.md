# EngAcad — Engineering Academy

A personal, browser-based academy for building practical SRE, DevOps/platform
and Forward Deployed Engineering skills: authored lessons, real Python executed
in the browser, fixture-based grading, evidence tracking, spaced reviews, real
labs and an evolving project (Beacon). Single learner, no login, no backend, no
AI API, no paid services. Deploys as a static site on GitHub Pages.

> **Status: Release 1 (vertical slice) — partially complete.** The platform,
> execution engine, grading, persistence and Week 01 are implemented and
> tested. **Week 02 is not yet authored**: its authoritative source,
> `Engineering_Academy_Week_02_Reference_Unit.md`, was not available when this
> build was made, and no substitute content has been written. Week 02 shows as
> *Awaiting reference unit*. Weeks 03–52 are shown as *Planned* scope only.

## What works today

| Area | State |
|---|---|
| App shell, design system, light/dark theme, responsive + mobile nav | ✅ |
| Dashboard (next session + minutes, reviews due, independent skills, Beacon milestone, pending items) | ✅ |
| Learn: 52-week roadmap (Available / Awaiting / Planned — planned weeks are not clickable) | ✅ |
| Week 01 orientation: 2 lessons, environment check, guided + independent exercise, baseline diagnostic | ✅ |
| CodeMirror 6 editor, Pyodide (Python 3.14) in a Web Worker, Run vs Check | ✅ |
| Grading: multiple fixtures (nominal/alternate/boundary), per-requirement feedback, protected-input detection, float tolerance, exact types, timeouts with runtime restart | ✅ |
| Hint ladder (3 hints + worked solution), persisted; assistance never counts as independent | ✅ |
| Evidence model (Introduced → Guided → Applied → Mastered → Retained) with origin labels | ✅ |
| Reviews at ~1/7/21/45 days, no penalties; Retained from delayed reviews | ✅ |
| IndexedDB persistence, autosave, snapshots, resume, versioned backup export/import (merge or replace) | ✅ |
| Labs catalogue with Real / Simulation / Browser Python badges; Week 01 real Python lab (Mac or Codespaces) with self-reported evidence | ✅ |
| Beacon page (timeline, artifact export mechanism, notes) | ✅ (v0.1 content awaits Week 02) |
| Week 02 lessons, Beacon v0.1, Week 02 assessment and reviews | ⛔ awaiting the reference unit |
| GitHub Pages + CI workflows | ✅ prepared (needs one-time Pages setting, below) |

## Run it locally

Requirements: Node.js 22+ and npm. (Python 3.11+ only for the optional real lab.)

```bash
npm ci            # also copies the pinned Pyodide runtime into public/pyodide
npm run dev       # http://localhost:5173
```

Open the app, choose **Continue learning**, and work through Week 01. The first
Run downloads the Python runtime (~12 MB, cached afterwards).

## Test and build

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript (app + config/e2e)
npm test            # Vitest: curriculum validation, grading with real Pyodide, progress/storage/backup
npm run build       # production build into dist/
npx playwright test # browser e2e against the production build served under /engacad/
npm run verify      # all of the above
```

The unit suite loads the real Pyodide runtime in Node and runs every exercise's
reference solution (must pass), negative examples and an auto-generated
"hardcoded nominal output" program (must fail) through the same `grader.py` the
browser uses.

E2E tests use the Playwright Chromium already installed on most machines; if
not, run `npx playwright install chromium` once.

## Deploy to GitHub Pages

The workflow `.github/workflows/pages.yml` lints, tests, builds with
`BASE_PATH=/<repository-name>/`, runs the browser e2e suite, and deploys `dist/`
on every push to `main`.

One-time setup in the repository on GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Merge to `main` (or run the workflow manually from the Actions tab).
3. The site appears at `https://<owner>.github.io/<repository-name>/`.

Routing uses URL hashes (`#/learn/...`), so deep links and refreshes work on
GitHub Pages without server rewrites. Pyodide is self-hosted from the build, not
a CDN.

`.github/workflows/ci.yml` runs the same checks on other branches and pull
requests.

## Optional real lab (Week 01)

```bash
python3 labs/week01-environment/check_env.py
```

Run it on your Mac or in a GitHub Codespace (this repository includes a
`.devcontainer` with Python 3.12 and Node 22). Paste the output into the lab
page to record **self-reported** evidence. Codespaces has a monthly included
allowance; stop the codespace when finished.

## Honest limitations

- **Week 02 content is missing** until the reference unit is supplied (see top).
- Progress lives in this browser profile only (IndexedDB). There is no sync.
  Export a backup to move or protect it. Clearing site data erases progress.
- Grading tests ship inside the static bundle. This is a personal learning tool,
  not proctoring: tests are not secret and the Web Worker is a responsiveness
  boundary, not a security sandbox.
- Browser Python (Pyodide) has no real sockets, subprocesses or host files.
  Infinite loops are stopped by terminating the worker after 6 s (12 s for Check),
  then the runtime reloads (a few seconds).
- Real-lab evidence is self-reported: a static site cannot verify a pasted
  transcript, and the UI says so.
- Reflections are saved with model criteria; they are not automatically graded.
- No Mastered evidence is possible yet: it requires module-level practical
  assessments, which arrive with Release 2.

## Project layout

```
src/
  app/            routes, layout, providers (store, theme, runtime status)
  components/     design-system pieces: badges, markdown, code, dialogs, diagrams
  content/        authored content: skills, glossary, modules/<module>/{lessons,exercises,labs,diagnostic}.ts
  curriculum/     content types, 52-week roadmap, static validation
  features/       dashboard, curriculum, lesson workbench, editor, labs, beacon, progress, review, glossary
  progress/       evidence/review rules (pure), ProgressStore, selectors
  runtime/python/ grader.py, Pyodide worker, client (timeouts/restart), grading feedback
  storage/        IndexedDB schema + migrations, versioned backup format
  tests/          Vitest suites (Pyodide in Node)
e2e/              Playwright browser tests
labs/             real-lab scripts (week01-environment/check_env.py)
docs/             authoring guide and design decisions
```

See [`docs/authoring.md`](docs/authoring.md) for how a week is added (this is how
Week 02 will be ingested) and [`docs/decisions.md`](docs/decisions.md) for the
main technical decisions.
