import type { Exercise } from '../../curriculum/types';

/**
 * Build a standalone, runnable Python file from a learner's Beacon exercise
 * code: the nominal fixture inputs are written as assignments at the top so
 * `python3 <file>` works outside the browser.
 */
export function buildArtifact(ex: Pick<Exercise, 'title' | 'cases' | 'protectedInputs' | 'beaconArtifact'>, source: string, exportedAt: string): { filename: string; text: string } {
  const nominal = ex.cases.find((c) => c.kind === 'nominal') ?? ex.cases[0];
  const inputs = ex.protectedInputs.map((n) => `${n} = ${nominal.inputs[n]}`);
  const header = [
    `# ${ex.beaconArtifact ? `Beacon ${ex.beaconArtifact.milestoneId.replace('beacon-', '')} — ` : ''}${ex.title}`,
    `# Exported from EngAcad on ${exportedAt.slice(0, 10)}. Run with: python3 ${ex.beaconArtifact?.filename ?? 'beacon.py'}`,
    '# Synthetic data only.',
    '',
    ...(inputs.length ? ['# --- inputs (sample values; change them to try other readings) ---', ...inputs, '', '# --- program ---'] : []),
  ];
  return { filename: ex.beaconArtifact?.filename ?? 'beacon.py', text: `${header.join('\n')}\n${source.replace(/\s+$/, '')}\n` };
}

export function downloadText(filename: string, text: string, type = 'text/x-python') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
