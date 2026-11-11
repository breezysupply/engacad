import { beforeAll, describe, expect, it } from 'vitest';
import { exerciseById } from '../content';
import { buildArtifact } from '../features/beacon/artifacts';
import { getHarness } from './pyodideNode';
import type { Harness } from '../runtime/python/harness';
import { parseEnvCheck } from '../features/labs/parse';
import { LESSONS } from '../content';
import { hasDiagram } from '../components/Diagrams';

let h: Harness;
beforeAll(async () => {
  h = await getHarness();
});

describe('Beacon artifact export', () => {
  it('produces a standalone runnable Python file with the nominal inputs', () => {
    const ex = { ...exerciseById('w01-ex-service-card')!, beaconArtifact: { milestoneId: 'beacon-v0.1', filename: 'signal_reporter.py' } };
    const { filename, text } = buildArtifact(ex, ex.solution.source, '2026-11-11T00:00:00Z');
    expect(filename).toBe('signal_reporter.py');
    expect(text).toContain('service_name = "beacon-api"');
    const r = h.run(text, {}); // no injected inputs: the file must define its own
    expect(r.error).toBeNull();
    expect(r.stdout).toBe(ex.cases.find((c) => c.kind === 'nominal')!.expect.stdout);
  });
});

describe('lab transcript parsing', () => {
  it('reads the summary line and ignores other output', () => {
    expect(parseEnvCheck('hello\nENGACAD-ENV-CHECK v1 python=3.12.4 platform=darwin git=yes status=PASS\n')).toEqual({ format: 'v1', python: '3.12.4', platform: 'darwin', git: 'yes', status: 'PASS' });
    expect(parseEnvCheck('no marker here')).toBeNull();
  });
});

describe('lesson diagrams', () => {
  it('every referenced diagram exists', () => {
    for (const l of LESSONS) for (const s of l.sections) for (const b of s.blocks) if (b.type === 'diagram') expect(hasDiagram(b.diagramId), b.diagramId).toBe(true);
  });
});
