import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { bracketMatching, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState } from '@codemirror/state';
import { classHighlighter } from '@lezer/highlight';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as placeholderExt,
} from '@codemirror/view';
import { useEffect, useRef } from 'react';

const theme = EditorView.theme({
  '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-text)', height: '100%' },
  '.cm-content': { fontFamily: 'var(--font-mono)', caretColor: 'var(--accent)', padding: '10px 0' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-gutters': { backgroundColor: 'var(--code-bg)', color: 'var(--text-3)', border: 'none', borderRight: '1px solid var(--border)' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--text)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent) !important' },
  '.cm-placeholder': { color: 'var(--text-3)' },
});

export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  onRun?: () => void;
  onCheck?: () => void;
  fontSize?: number;
  ariaLabel: string;
  placeholder?: string;
  minHeight?: number;
}

/**
 * CodeMirror 6 editor. Cmd/Ctrl+Enter runs, Cmd/Ctrl+Shift+Enter checks.
 * Standard text-editing shortcuts are left alone. Tab indents; Esc then Tab
 * moves focus out of the editor (CodeMirror's accessible tab-trapping escape).
 */
export function CodeEditor({ value, onChange, onRun, onCheck, fontSize = 14, ariaLabel, placeholder, minHeight }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onRun, onCheck });
  handlers.current = { onChange, onRun, onCheck };
  const fontComp = useRef(new Compartment());

  useEffect(() => {
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        python(),
        syntaxHighlighting(classHighlighter),
        theme,
        fontComp.current.of(EditorView.theme({ '&': { fontSize: `${fontSize}px` } })),
        placeholder ? placeholderExt(placeholder) : [],
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
        keymap.of([
          { key: 'Mod-Enter', preventDefault: true, run: () => (handlers.current.onRun?.(), true) },
          { key: 'Mod-Shift-Enter', preventDefault: true, run: () => (handlers.current.onCheck?.(), true) },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) handlers.current.onChange?.(u.state.doc.toString());
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current! });
    return () => view.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // external value changes (reset, restore snapshot, switching exercise)
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: fontComp.current.reconfigure(EditorView.theme({ '&': { fontSize: `${fontSize}px` } })) });
  }, [fontSize]);

  return <div className="editor-host" ref={host} style={minHeight ? { minHeight } : undefined} data-testid="code-editor" />;
}
