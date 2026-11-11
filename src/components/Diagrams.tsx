/** Purposeful inline SVG diagrams, themed with CSS variables. Referenced by id from content. */

function EvidenceLadder() {
  const steps = [
    ['Introduced', 'Worked through the explanation'],
    ['Guided', 'Scaffolded exercise passed'],
    ['Applied', 'New task passed independently'],
    ['Mastered', 'Larger practical assessment'],
    ['Retained', 'Used again after a delay'],
  ];
  return (
    <svg viewBox="0 0 640 230" role="img" aria-labelledby="ladder-t">
      <title id="ladder-t">Evidence ladder: Introduced, Guided, Applied, Mastered, Retained</title>
      {steps.map(([label, sub], i) => {
        const x = 10 + i * 126;
        const h = 60 + i * 30;
        const y = 210 - h;
        return (
          <g key={label}>
            <rect x={x} y={y} width="116" height={h} rx="10" fill={i >= 2 ? 'var(--success-soft)' : i === 1 ? 'var(--info-soft)' : 'var(--bg-sunken)'} stroke="var(--border-strong)" />
            <text x={x + 58} y={y + 24} textAnchor="middle" fontSize="14" fontWeight="650" fill="var(--text)">
              {label}
            </text>
            <foreignObject x={x + 6} y={y + 32} width="104" height={h - 34}>
              <div style={{ fontSize: 11, lineHeight: 1.3, color: 'var(--text-2)', textAlign: 'center' }}>{sub}</div>
            </foreignObject>
          </g>
        );
      })}
      <line x1="10" y1="220" x2="630" y2="220" stroke="var(--border-strong)" />
    </svg>
  );
}

function RunVsCheck() {
  const box = (x: number, y: number, w: number, label: string, sub: string, tone: string) => (
    <g>
      <rect x={x} y={y} width={w} height="56" rx="10" fill={tone} stroke="var(--border-strong)" />
      <text x={x + w / 2} y={y + 23} textAnchor="middle" fontSize="13.5" fontWeight="650" fill="var(--text)">
        {label}
      </text>
      <text x={x + w / 2} y={y + 42} textAnchor="middle" fontSize="11.5" fill="var(--text-2)">
        {sub}
      </text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--text-3)" strokeWidth="1.6" markerEnd="url(#arr)" />;
  return (
    <svg viewBox="0 0 660 230" role="img" aria-labelledby="rvc-t">
      <title id="rvc-t">Run executes once with the default input. Check executes against several fixtures and evaluates requirements.</title>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" />
        </marker>
      </defs>
      {box(10, 87, 120, 'Your code', 'in the editor', 'var(--bg-elev)')}
      {box(190, 20, 150, 'Run', 'default input, once', 'var(--accent-soft)')}
      {box(400, 20, 250, 'Output · errors · variables', 'no grade, no evidence', 'var(--bg-sunken)')}
      {box(190, 150, 150, 'Check', 'nominal · alternate · boundary', 'var(--success-soft)')}
      {box(400, 150, 250, 'Per-requirement results', 'attempt saved · evidence if passed', 'var(--success-soft)')}
      {arrow(130, 105, 188, 55)}
      {arrow(130, 125, 188, 172)}
      {arrow(340, 48, 398, 48)}
      {arrow(340, 178, 398, 178)}
    </svg>
  );
}

const DIAGRAMS: Record<string, () => React.ReactElement> = {
  'evidence-ladder': EvidenceLadder,
  'run-vs-check': RunVsCheck,
};

export const hasDiagram = (id: string) => id in DIAGRAMS;

export function Diagram({ id, caption }: { id: string; caption: string }) {
  const D = DIAGRAMS[id];
  return (
    <figure className="diagram">
      {D ? <D /> : <div className="empty">Missing diagram: {id}</div>}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
