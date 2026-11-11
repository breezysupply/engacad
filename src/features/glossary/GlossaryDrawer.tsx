import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GLOSSARY } from '../../content/glossary';

export function GlossaryList({ query }: { query: string }) {
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return GLOSSARY.filter((g) => !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q) || g.tags.some((t) => t.includes(q))).sort((a, b) =>
      a.term.localeCompare(b.term),
    );
  }, [query]);
  if (!items.length) return <p className="muted">No matching terms.</p>;
  return (
    <dl style={{ margin: 0 }}>
      {items.map((g) => (
        <div key={g.term} className="glossary-entry">
          <dt>{g.term}</dt>
          <dd>{g.definition}</dd>
        </div>
      ))}
    </dl>
  );
}

export function GlossaryDrawer({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="dialog-backdrop" style={{ background: 'rgba(10,12,18,.25)' }} onMouseDown={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Glossary and reference">
        <div className="drawer-head">
          <input ref={input} type="text" placeholder="Search terms…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search glossary" />
          <button className="btn btn-ghost icon-btn" onClick={onClose} aria-label="Close glossary">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">
          <GlossaryList query={q} />
        </div>
      </aside>
    </>
  );
}
