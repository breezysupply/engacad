import { useMemo } from 'react';
import { highlightToHtml } from './highlight';

export function CodeBlock({ code, language = 'python', caption }: { code: string; language?: string; caption?: string }) {
  const html = useMemo(() => highlightToHtml(code.replace(/\n$/, ''), language), [code, language]);
  return (
    <figure className="codeblock" style={{ margin: 'var(--space-3) 0' }}>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      {caption && <figcaption className="codeblock-caption">{caption}</figcaption>}
    </figure>
  );
}
