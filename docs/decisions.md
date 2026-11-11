# Design decisions (Release 1)

| Decision | Choice | Why |
|---|---|---|
| Stack | React 19 + TypeScript + Vite 8 | Specified; fast static build. |
| Routing | `HashRouter` | GitHub Pages has no rewrites; deep links and refreshes keep working. |
| Base path | `BASE_PATH` env (`/<repo>/` in CI, `/` locally) | Assets and the Pyodide worker resolve under the repository path. |
| Editor | CodeMirror 6 (`classHighlighter`) | Small, accessible; the same token classes style static code blocks. |
| Python | Pyodide 314.0.7 (Python 3.14), self-hosted from `public/pyodide` | Real CPython in the browser; no CDN dependency at runtime. |
| Isolation | Dedicated module Web Worker; terminate + recreate on timeout | Keeps the UI responsive; SharedArrayBuffer interrupts are unavailable on GitHub Pages (no COOP/COEP headers). |
| Grading | `grader.py` inside Pyodide, shared by browser and Node tests | The code that grades the learner is the code the content tests audit. |
| Fixture values | Python literal strings | JSON cannot distinguish `2` from `2.0`. |
| State leakage | New namespace dict per Run and per Check case | Prevents passing because of earlier state. |
| Storage | IndexedDB via `idb`, one store per record type, versioned migrations | Durable, survives updates; `localStorage` only for layout conveniences. |
| Backup | Versioned JSON (`engacad-progress-backup`), merge or replace, validated | Lets the learner move or restore progress; imported evidence keeps its origin and is marked "from backup". |
| Evidence | Per-skill records with level + origin + assisted flag; levels never inferred from page views | Honest competency tracking. |
| Reviews | 1/7/21/45 days; next step scheduled from completion; failed/missed reviews stay due | Spacing without guilt mechanics. Retained requires a pass at the 7-day step or later. |
| Real labs | Instructions + script + pasted transcript stored as *self-reported* | A static app cannot verify external environments. |
