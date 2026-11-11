import type { Lab } from '../../../curriculum/types';

export const W01_LABS: Lab[] = [
  {
    id: 'lab-w01-real-python',
    weekId: 'w01',
    title: 'Real Python on your Mac or in Codespaces',
    mode: ['real-local', 'real-codespaces'],
    status: 'available',
    optional: true,
    estimatedMinutes: 25,
    objective: 'Confirm that Python 3.11+ and Git work in a real terminal, and run the EngAcad environment check script.',
    prerequisites: ['A Mac with Terminal, or a GitHub account for Codespaces'],
    environment: 'Your own Mac (Terminal / zsh) or a GitHub Codespace created from this repository’s dev container (Python 3.12).',
    costNote:
      'Mac: free. Codespaces: personal GitHub accounts include a monthly allowance of free core-hours and storage; usage beyond it can be billed to you. Stop the codespace when you finish, and delete it when you no longer need it.',
    safetyNote: 'The check script only reads version information and writes one temporary file that it deletes again. It needs no credentials, no sudo and no network access.',
    preflight: [
      'Open a terminal (Mac: Terminal or iTerm; Codespaces: the terminal panel).',
      'Run `python3 --version` — you want Python 3.11 or newer.',
      'Run `git --version` — any recent version is fine.',
    ],
    setup: [
      {
        title: 'Option A — Mac',
        steps: [
          'If `python3 --version` reports 3.11 or newer, you are ready.',
          'Otherwise install Python from python.org (the official macOS installer) or with Homebrew: `brew install python@3.12`.',
          'Clone this repository: `git clone <your fork or this repo URL> engacad && cd engacad`.',
        ],
      },
      {
        title: 'Option B — GitHub Codespaces',
        steps: [
          'On the repository page choose Code → Codespaces → Create codespace on main.',
          'Wait for the dev container to build (Python 3.12 is preinstalled).',
          'The terminal opens in the repository root.',
        ],
      },
    ],
    instructions: [
      'From the repository root, run: `python3 labs/week01-environment/check_env.py`',
      'Read the report. Every line should say OK; anything else includes a suggested fix.',
      'Optional extension: open a Python prompt with `python3`, type `print("hello from a real terminal")`, then exit with `exit()`.',
      'Copy the whole output, including the final ENGACAD-ENV-CHECK line, and paste it below.',
    ],
    verification: {
      description: 'The script ends with a single summary line beginning with ENGACAD-ENV-CHECK. EngAcad reads that line, but cannot confirm where it was produced.',
      command: 'python3 labs/week01-environment/check_env.py',
      expectMarker: 'ENGACAD-ENV-CHECK',
    },
    cleanup: [
      'Mac: nothing to clean up; the script removes its temporary file.',
      'Codespaces: stop the codespace (Codespaces menu → Stop Current Codespace) so it stops consuming your allowance. Delete it from github.com/codespaces when you no longer need it.',
    ],
    evidence: {
      kind: 'self-reported-transcript',
      description: 'Pasting the output records self-reported evidence for “Verify a real Python environment”. It is labelled self-reported because a static website cannot verify a transcript.',
      skills: ['env.local-python'],
    },
  },
];
