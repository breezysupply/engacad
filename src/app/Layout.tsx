import { BookOpen, ChartColumn, FlaskConical, Keyboard, LayoutDashboard, Moon, Radar, Search, Sun, SunMoon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Dialog } from '../components/Dialog';
import { GlossaryDrawer } from '../features/glossary/GlossaryDrawer';
import { useProgress, useStore } from './providers';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/labs', label: 'Labs', icon: FlaskConical },
  { to: '/beacon', label: 'Beacon', icon: Radar },
  { to: '/progress', label: 'Skills & Progress', short: 'Progress', icon: ChartColumn },
];

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || !!t.closest?.('.cm-editor'));
};

export function Layout() {
  const store = useStore();
  const { settings } = useProgress();
  const [glossary, setGlossary] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const location = useLocation();
  const inLesson = location.pathname.startsWith('/learn/lesson') || location.pathname.startsWith('/review/');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') {
        e.preventDefault();
        setShortcuts(true);
      } else if (e.key === '/') {
        e.preventDefault();
        setGlossary(true);
      }
    };
    window.addEventListener('keydown', onKey);
    const openGlossary = () => setGlossary(true);
    window.addEventListener('engacad:glossary', openGlossary);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('engacad:glossary', openGlossary);
    };
  }, []);

  const nextTheme = settings.theme === 'system' ? 'light' : settings.theme === 'light' ? 'dark' : 'system';
  const ThemeIcon = settings.theme === 'system' ? SunMoon : settings.theme === 'light' ? Sun : Moon;
  const storage = store.storage;

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="EngAcad home">
          <span className="brand-mark" aria-hidden>
            <Radar size={17} />
          </span>
          EngAcad <small>Engineering Academy</small>
        </NavLink>
        <nav className="mainnav" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={16} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setGlossary(true)} aria-label="Open glossary and reference (/)">
            <Search size={15} /> <span className="hide-sm">Glossary</span>
          </button>
          <button className="btn btn-ghost icon-btn" onClick={() => setShortcuts(true)} aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)">
            <Keyboard size={17} />
          </button>
          <button
            className="btn btn-ghost icon-btn"
            onClick={() => store.updateSettings({ theme: nextTheme })}
            aria-label={`Theme: ${settings.theme}. Switch to ${nextTheme}`}
            title={`Theme: ${settings.theme}`}
          >
            <ThemeIcon size={17} />
          </button>
        </div>
      </header>
      {storage.state === 'memory-only' && (
        <div className="banner banner-warn" role="alert">
          <strong>Progress is not being saved.</strong> {storage.message}
        </div>
      )}
      <main id="main" className={inLesson ? 'main-lesson' : ''}>
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Primary (mobile)">
        {NAV.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} aria-hidden />
            {short ?? label}
          </NavLink>
        ))}
      </nav>
      {glossary && <GlossaryDrawer onClose={() => setGlossary(false)} />}
      {shortcuts && (
        <Dialog title="Keyboard shortcuts" onClose={() => setShortcuts(false)}>
          <table className="table">
            <tbody>
              <tr>
                <td>
                  <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                </td>
                <td>Run code (in the editor)</td>
              </tr>
              <tr>
                <td>
                  <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Enter</kbd>
                </td>
                <td>Check against all fixtures</td>
              </tr>
              <tr>
                <td>
                  <kbd>Tab</kbd>
                </td>
                <td>Indent in the editor. Press <kbd>Esc</kbd> then <kbd>Tab</kbd> to move focus out.</td>
              </tr>
              <tr>
                <td>
                  <kbd>/</kbd>
                </td>
                <td>Open the glossary &amp; reference</td>
              </tr>
              <tr>
                <td>
                  <kbd>?</kbd>
                </td>
                <td>Show this panel</td>
              </tr>
            </tbody>
          </table>
          <p className="small muted" style={{ marginTop: 12 }}>
            Normal editing shortcuts (undo, redo, select all, copy, paste) are never intercepted.
          </p>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setShortcuts(false)}>
              Close
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
