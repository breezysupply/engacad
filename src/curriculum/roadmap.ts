import type { BeaconMilestone, ModulePlan, WeekPlan, WeekStatus } from './types';

/**
 * The 52-week core plan. This is a transparent *scope* plan: only weeks marked
 * `available` contain authored, learnable content. Planned weeks are never
 * clickable lessons and never contribute to learner progress.
 */

export const MODULES: ModulePlan[] = [
  {
    id: 'm00',
    number: 0,
    title: 'Orientation',
    description: 'How the academy works, Run versus Check, environment checks and a low-pressure baseline diagnostic.',
    weeks: [1, 1],
    outcomes: ['Run real Python in the browser', 'Understand how evidence is earned', 'Record a baseline skill profile'],
    prerequisiteSkills: [],
  },
  {
    id: 'm01',
    number: 1,
    title: 'Python Foundations',
    description: 'Values, types, control flow, functions, collections, files, exceptions and simple tests.',
    weeks: [2, 7],
    outcomes: ['Write small correct Python programs', 'Read tracebacks and debug', 'Parse and summarise synthetic telemetry'],
    prerequisiteSkills: ['orient.run-check'],
  },
  {
    id: 'm02',
    number: 2,
    title: 'Applied Python',
    description: 'CLI tools, configuration, HTTP clients, packaging, pytest, logging and defensive error handling.',
    weeks: [8, 11],
    outcomes: ['Build a configurable CLI', 'Call HTTP APIs safely', 'Package and test a Python project'],
    prerequisiteSkills: [],
  },
  {
    id: 'm03',
    number: 3,
    title: 'Linux & Bash Engineering',
    description: 'Processes, systemd, permissions, resource diagnosis and reliable Bash — with operational depth.',
    weeks: [12, 16],
    outcomes: ['Diagnose a degraded host', 'Fix a misconfigured service', 'Write idempotent, tested Bash'],
    prerequisiteSkills: [],
    note: 'Introductory navigation can be accelerated when the Week 01 diagnostic shows proficiency.',
  },
  {
    id: 'm04',
    number: 4,
    title: 'Networking',
    description: 'TCP/UDP, addressing and routing, DNS, HTTP/TLS, firewalls/NAT/load balancers and packet-path reasoning.',
    weeks: [17, 22],
    outcomes: ['Classify DNS vs connection vs TLS vs HTTP failures', 'Trace a customer-style network path'],
    prerequisiteSkills: [],
  },
  {
    id: 'm05',
    number: 5,
    title: 'Applications, APIs & Integration',
    description: 'HTTP API design, FastAPI, SQL persistence, auth fundamentals, webhooks, idempotency and tests.',
    weeks: [23, 26],
    outcomes: ['Build a small ingestion API', 'Integrate a fictional customer data source'],
    prerequisiteSkills: [],
  },
  {
    id: 'm06',
    number: 6,
    title: 'Docker & Compose',
    description: 'Images, containers, Dockerfiles, networks, volumes, Compose and debugging failed starts.',
    weeks: [27, 30],
    outcomes: ['Containerise Beacon', 'Debug a broken Compose deployment'],
    prerequisiteSkills: [],
  },
  {
    id: 'm07',
    number: 7,
    title: 'Infrastructure as Code',
    description: 'Terraform (primary) with provider mocking and a short CloudFormation comparison. No mandatory paid AWS use.',
    weeks: [31, 36],
    outcomes: ['Write, test and safely change Terraform', 'Design Beacon infrastructure'],
    prerequisiteSkills: [],
    note: 'Mocked tests and syntax checks are not proof of a real AWS deployment; live applies are optional and opt-in.',
  },
  {
    id: 'm08',
    number: 8,
    title: 'CI/CD & Release Engineering',
    description: 'GitHub Actions, test gates, artifacts, container publishing, release strategies and rollback.',
    weeks: [37, 39],
    outcomes: ['Pipeline that tests and packages Beacon', 'Recover from a simulated failed release'],
    prerequisiteSkills: [],
  },
  {
    id: 'm09',
    number: 9,
    title: 'Kubernetes & Helm',
    description: 'Pods, Deployments, Services, probes, configuration, storage limits and Helm — in a local disposable cluster.',
    weeks: [40, 44],
    outcomes: ['Deploy and troubleshoot Beacon on a local cluster', 'Package Beacon as a Helm chart'],
    prerequisiteSkills: [],
    note: 'Beginner labs do not teach production multi-cluster administration.',
  },
  {
    id: 'm10',
    number: 10,
    title: 'Reliability, Security & Operations',
    description: 'Telemetry, SLIs/SLOs, alert quality, incident response, postmortems, IAM, secrets, backups and failure domains.',
    weeks: [45, 48],
    outcomes: ['Define service-level monitoring', 'Run an incident exercise and write an RCA'],
    prerequisiteSkills: [],
  },
  {
    id: 'm11',
    number: 11,
    title: 'FDE Customer Delivery Capstone',
    description: 'Discovery, constraints, deployment plan, injected failures, acceptance testing and handoff for a fictional customer.',
    weeks: [49, 52],
    outcomes: ['Scope, deploy, validate and hand off Beacon for a constrained customer environment'],
    prerequisiteSkills: [],
  },
];

type Row = [number, string, string, string];

const ROWS: Row[] = [
  [1, 'm00', 'Product tour, Run vs Check, environment checks, baseline diagnostic, progress model', 'Successful browser Python run; optional real Python lab; baseline skill profile'],
  [2, 'm01', 'Values, variable assignment, arithmetic, types, conversions, Boolean comparisons, f-strings', 'Beacon Signal Reporter v0.1'],
  [3, 'm01', 'Conditionals, truthy/falsey behaviour, for/while loops, control flow, basic validation', 'Threshold classification and repeated synthetic readings'],
  [4, 'm01', 'Functions, parameters, return values, scope, reusable logic', 'Refactor Beacon calculations into tested functions'],
  [5, 'm01', 'Lists, tuples, dictionaries, sets, iteration and lookup', 'Aggregate multiple service observations'],
  [6, 'm01', 'Strings, file paths, reading/writing text, CSV and JSON fundamentals', 'Read synthetic telemetry files and produce structured output'],
  [7, 'm01', 'Exceptions, debugging, tracebacks, simple unit tests, clean code', 'Independent log parsing and summary mini-project'],
  [8, 'm02', 'CLI arguments, configuration, environment variables, pathlib and subprocess', 'Configurable operational command-line utility'],
  [9, 'm02', 'HTTP clients, JSON response handling, status codes, pagination, timeouts', 'Simple API health-check client'],
  [10, 'm02', 'Virtual environments, dependencies, pytest, typing, project organisation', 'Packaged and tested Python CLI'],
  [11, 'm02', 'Logging, retries, idempotency basics, defensive error handling, debugging', 'Beacon health-check utility with usable failure behaviour'],
  [12, 'm03', 'Processes, signals, environment, service ownership, inspection tools', 'Find and explain a degraded process'],
  [13, 'm03', 'Permissions, users/groups, systemd, journalctl, service startup', 'Fix a misconfigured service in a disposable Linux lab'],
  [14, 'm03', 'Disk, inodes, memory, CPU, load, logs, basic performance reasoning', 'Diagnose a synthetic slow/disk-full host'],
  [15, 'm03', 'Reliable Bash, quoting, functions, exit codes, pipes, traps, text tools', 'Idempotent diagnostic script with tests'],
  [16, 'm03', 'SSH, scheduled automation, package/service checks, combined incident', 'Linux incident response and verification lab'],
  [17, 'm04', 'Layers and mental models; TCP vs UDP; connection lifecycle and ports', 'Trace an application request through the stack'],
  [18, 'm04', 'IP addressing, CIDR, subnets, gateways, routing tables', 'Diagnose a routed/subnetted connectivity issue'],
  [19, 'm04', 'DNS records, caching, resolvers, recursive lookup, dig/nslookup', 'Diagnose name-resolution failure'],
  [20, 'm04', 'HTTP semantics, TLS basics, certificates, curl and failure classification', 'Distinguish DNS, connection, TLS and HTTP errors'],
  [21, 'm04', 'Firewalls, NAT, security groups, proxies, load balancers, SSH tunnels', 'Draw and troubleshoot a customer-style network path'],
  [22, 'm04', 'Integrated diagnostics: tcpdump basics, ss, traceroute, packet-path reasoning', 'Novel broken-connection capstone with written diagnosis'],
  [23, 'm05', 'HTTP API design, routes, status codes, request/response validation, FastAPI basics', 'Beacon ingestion API'],
  [24, 'm05', 'Relational databases, SQL CRUD, schemas, simple migrations and persistence', 'Persist synthetic events with a local database'],
  [25, 'm05', 'Auth fundamentals, API keys, webhook shapes, retries, idempotency and input safety', 'Integrate a fictional customer data source'],
  [26, 'm05', 'Unit/integration tests, configuration changes, failure contracts and documentation', 'Tested integration with acceptance criteria'],
  [27, 'm06', 'Images, containers, isolation mental model, runtime lifecycle, inspection', 'Run and inspect a simple container'],
  [28, 'm06', 'Dockerfiles, build context, layers, caching, smaller/safer images', 'Containerise Beacon'],
  [29, 'm06', 'Ports, networks, persistent volumes, environment values, Compose', 'Multi-container Beacon and database stack'],
  [30, 'm06', 'Health checks, logs, failed starts, DNS/port mistakes, image security basics', 'Debug and recover a broken Compose deployment'],
  [31, 'm07', 'Terraform/HCL, providers, resources, variables, outputs, init/validate/plan/apply', 'First working configuration in a safe lab'],
  [32, 'm07', 'Dependencies, state, drift, import concepts, safe change review', 'Understand and repair a state/configuration mismatch'],
  [33, 'm07', 'AWS VPC, subnets, routes, gateways and security-group design', 'Declarative network configuration'],
  [34, 'm07', 'EC2/service deployment choices, IAM least privilege, secrets and cost awareness', 'Reviewable architecture change with access controls'],
  [35, 'm07', 'Modules, composition, testability, Terraform provider mocking', 'Tested reusable Terraform module'],
  [36, 'm07', 'End-to-end review, CloudFormation stacks/changesets/drift comparison, safe teardown', 'Beacon infrastructure design with optional real apply/destroy'],
  [37, 'm08', 'CI concepts, GitHub Actions workflow, lint/test gates, reproducibility', 'Pipeline that tests Beacon'],
  [38, 'm08', 'Build artifacts, container publishing, configuration, safe secrets handling', 'Build/test/package workflow'],
  [39, 'm08', 'Release strategies, approvals, rollback and verification', 'Simulated failed release and recovery'],
  [40, 'm09', 'Cluster architecture, Pods, Deployments, kubectl, desired state', 'Run Beacon in a local disposable cluster'],
  [41, 'm09', 'Services, endpoints, DNS, ingress basics and connectivity', 'Diagnose an unreachable workload'],
  [42, 'm09', 'Readiness/liveness/startup probes, resources, rollouts', 'Fix unhealthy Pods and failed rollout'],
  [43, 'm09', 'ConfigMaps, Secrets, volumes, storage limitations, namespaces and access', 'Configuration-safe deployment'],
  [44, 'm09', 'Helm chart basics, values, releases, rollback, integrated troubleshooting', 'Packaged Beacon chart and incident recovery'],
  [45, 'm10', 'Logs, metrics, traces, correlation, health checks and alert quality', 'Observable Beacon application'],
  [46, 'm10', 'SLIs, SLOs, error budgets, symptoms vs causes, sensible alerts', 'Service-level monitoring definition'],
  [47, 'm10', 'Incident triage, escalation, mitigation, verification, postmortems', 'Incident exercise with optional timer and RCA'],
  [48, 'm10', 'IAM, secrets, TLS, backups, resilience, rollback and failure domains', 'Security/recovery review of Beacon'],
  [49, 'm11', 'Customer discovery, ambiguous requirements, environment constraints, acceptance criteria', 'Requirements and risk register'],
  [50, 'm11', 'Architecture selection, integration contract, deployment plan, config portability', 'Customer-specific Beacon deployment'],
  [51, 'm11', 'Injected integration failure, networking constraints, rollback and support triage', 'Verified recovery and incident notes'],
  [52, 'm11', 'Acceptance testing, runbook, handoff, limitations and future roadmap', 'Complete customer deployment package and walkthrough'],
];

const STATUS: Record<number, WeekStatus> = { 1: 'available', 2: 'awaiting-content' };
const LESSONS: Record<number, string[]> = { 1: ['w01-l1', 'w01-l2'] };
const LABS: Record<number, string[]> = { 1: ['lab-w01-real-python'] };
const BEACON: Record<number, string> = { 2: 'beacon-v0.1' };

export const weekId = (n: number) => `w${String(n).padStart(2, '0')}`;

export const WEEKS: WeekPlan[] = ROWS.map(([n, moduleId, focus, output]) => ({
  id: weekId(n),
  number: n,
  moduleId,
  focus,
  output,
  status: STATUS[n] ?? 'planned',
  lessonIds: LESSONS[n] ?? [],
  labIds: LABS[n] ?? [],
  beaconMilestoneId: BEACON[n],
}));

export const BEACON_MILESTONES: BeaconMilestone[] = [
  { id: 'beacon-v0.1', version: 'v0.1', weeks: 'Week 02', title: 'Signal Reporter', description: 'Report a few synthetic service measurements in Python.', status: 'awaiting-content' },
  { id: 'beacon-v0.2', version: 'v0.2', weeks: 'Weeks 03–07', title: 'Classify & aggregate', description: 'Classify, aggregate, parse and test synthetic events.', status: 'planned' },
  { id: 'beacon-v0.3', version: 'v0.3', weeks: 'Weeks 08–11', title: 'CLI & health checks', description: 'A configurable CLI with an API health-check capability.', status: 'planned' },
  { id: 'beacon-v0.4', version: 'v0.4', weeks: 'Weeks 12–16', title: 'Linux tooling', description: 'Linux/Bash installation and diagnostic tools.', status: 'planned' },
  { id: 'beacon-v0.5', version: 'v0.5', weeks: 'Weeks 17–22', title: 'Network path', description: 'Documented network path and connectivity checks.', status: 'planned' },
  { id: 'beacon-v0.6', version: 'v0.6', weeks: 'Weeks 23–26', title: 'Ingestion API', description: 'An ingestion API with local persistence.', status: 'planned' },
  { id: 'beacon-v0.7', version: 'v0.7', weeks: 'Weeks 27–30', title: 'Containers', description: 'Application and database containerised with Compose.', status: 'planned' },
  { id: 'beacon-v0.8', version: 'v0.8', weeks: 'Weeks 31–36', title: 'Infrastructure', description: 'Infrastructure defined and tested with Terraform.', status: 'planned' },
  { id: 'beacon-v0.9', version: 'v0.9', weeks: 'Weeks 37–39', title: 'CI & release', description: 'CI, build and release checks.', status: 'planned' },
  { id: 'beacon-v0.10', version: 'v0.10', weeks: 'Weeks 40–44', title: 'Kubernetes', description: 'Packaged and deployed locally with Kubernetes and Helm.', status: 'planned' },
  { id: 'beacon-v0.11', version: 'v0.11', weeks: 'Weeks 45–48', title: 'Reliability', description: 'Telemetry, reliability indicators, security and recovery.', status: 'planned' },
  { id: 'beacon-v1.0', version: 'v1.0', weeks: 'Weeks 49–52', title: 'Customer delivery', description: 'Adapted to a fictional customer, validated, troubleshot and handed off.', status: 'planned' },
];

export const PLANNED_LABS: { weekNumber: number; title: string; mode: 'real-codespaces' | 'real-local' | 'simulation' }[] = [
  { weekNumber: 13, title: 'Fix a misconfigured systemd service', mode: 'real-codespaces' },
  { weekNumber: 14, title: 'Diagnose a disk-full host', mode: 'simulation' },
  { weekNumber: 19, title: 'Name-resolution failure', mode: 'simulation' },
  { weekNumber: 22, title: 'Broken-connection capstone', mode: 'simulation' },
  { weekNumber: 29, title: 'Beacon + database Compose stack', mode: 'real-codespaces' },
  { weekNumber: 35, title: 'Terraform module with mocked provider tests', mode: 'real-codespaces' },
  { weekNumber: 39, title: 'Failed release and rollback', mode: 'simulation' },
  { weekNumber: 40, title: 'Beacon on a local kind cluster', mode: 'real-local' },
  { weekNumber: 47, title: 'Incident exercise', mode: 'simulation' },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
export const weekByNumber = (n: number) => WEEKS.find((w) => w.number === n);
export const weekById = (id: string) => WEEKS.find((w) => w.id === id);
