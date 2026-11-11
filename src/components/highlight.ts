import { classHighlighter, highlightCode } from '@lezer/highlight';
import { parser } from '@lezer/python';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Returns HTML with tok-* classes, shared with the CodeMirror editor's highlighting. */
export function highlightPython(code: string): string[] {
  const lines: string[] = [''];
  highlightCode(
    code,
    parser.parse(code),
    classHighlighter,
    (text, classes) => {
      lines[lines.length - 1] += classes ? `<span class="${classes}">${esc(text)}</span>` : esc(text);
    },
    () => lines.push(''),
  );
  return lines;
}

export function highlightToHtml(code: string, language = 'python'): string {
  if (language !== 'python') return esc(code);
  return highlightPython(code).join('\n');
}
