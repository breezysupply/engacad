/** Parse the ENGACAD-ENV-CHECK summary line from a pasted transcript. */
export function parseEnvCheck(transcript: string): Record<string, string> | null {
  const line = transcript.split(/\r?\n/).find((l) => l.trim().startsWith('ENGACAD-ENV-CHECK'));
  if (!line) return null;
  const out: Record<string, string> = {};
  const parts = line.trim().split(/\s+/);
  out.format = parts[1] ?? '';
  for (const p of parts.slice(2)) {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i)] = p.slice(i + 1);
  }
  return out;
}
