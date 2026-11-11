import type { Skill, SkillDomain } from '../curriculum/types';

/**
 * Skills that authored content can currently award evidence for. Skills for
 * later modules are added only when their content is authored, so the skill
 * matrix never implies learnable material that does not exist yet.
 */
export const SKILLS: Skill[] = [
  {
    id: 'orient.run-check',
    domain: 'orientation',
    title: 'Run to explore, Check to prove',
    canDo: 'Use Run to experiment, use Check to prove a requirement, and act on per-requirement feedback.',
    introducedIn: 'w01',
  },
  {
    id: 'py.print-basics',
    domain: 'python',
    title: 'Print values and text with print()',
    canDo: 'Print provided variables and literal text together, on one or several lines.',
    introducedIn: 'w01',
  },
  {
    id: 'env.local-python',
    domain: 'environment',
    title: 'Verify a real Python environment',
    canDo: 'Run Python 3 in a real terminal (Mac or Codespaces) and verify the toolchain with a script.',
    introducedIn: 'w01',
  },
];

export const DOMAIN_LABELS: Record<SkillDomain, string> = {
  orientation: 'Orientation',
  python: 'Python',
  linux: 'Linux & Bash',
  networking: 'Networking',
  apis: 'APIs & Integration',
  containers: 'Docker & Compose',
  iac: 'Infrastructure as Code',
  cicd: 'CI/CD',
  kubernetes: 'Kubernetes & Helm',
  reliability: 'Reliability & Security',
  fde: 'FDE Delivery',
  environment: 'Environments',
};

/** Domains whose skills arrive with later releases. Shown honestly as planned. */
export const PLANNED_DOMAINS: { domain: SkillDomain; weeks: string }[] = [
  { domain: 'linux', weeks: 'Weeks 12–16' },
  { domain: 'networking', weeks: 'Weeks 17–22' },
  { domain: 'apis', weeks: 'Weeks 23–26' },
  { domain: 'containers', weeks: 'Weeks 27–30' },
  { domain: 'iac', weeks: 'Weeks 31–36' },
  { domain: 'cicd', weeks: 'Weeks 37–39' },
  { domain: 'kubernetes', weeks: 'Weeks 40–44' },
  { domain: 'reliability', weeks: 'Weeks 45–48' },
  { domain: 'fde', weeks: 'Weeks 49–52' },
];

export const skillById = (id: string) => SKILLS.find((s) => s.id === id);
