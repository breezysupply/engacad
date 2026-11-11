import { Marked } from 'marked';
import { useMemo } from 'react';
import { highlightToHtml } from './highlight';

const md = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = lang === 'python' || lang === 'py' ? 'python' : 'text';
      return `<pre><code class="language-${language}">${language === 'python' ? highlightToHtml(text) : text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code></pre>`;
    },
  },
});

/** Renders authored (trusted, repository-controlled) Markdown. Never used for learner input. */
export function Markdown({ text, className = 'prose' }: { text: string; className?: string }) {
  const html = useMemo(() => md.parse(text, { async: false }) as string, [text]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function InlineMarkdown({ text }: { text: string }) {
  const html = useMemo(() => md.parseInline(text, { async: false }) as string, [text]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
