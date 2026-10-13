import { Download, Moon, Sun, Monitor, Smartphone, Zap, LayoutGrid, FileText } from 'lucide-react';
import { ThemeMode, LayoutMode } from '../types';

interface Props {
  theme: ThemeMode;
  layout: LayoutMode;
  wideWidth?: number;
  mode?: 'studio' | 'readme';
  onMode?: (m: 'studio' | 'readme') => void;
  onTheme: () => void;
  onLayout: (v: LayoutMode) => void;
  onExport: () => void;
}
export function Navbar({
  theme,
  layout,
  onTheme,
  onLayout,
  onExport,
  wideWidth = 800,
  mode = 'studio',
  onMode,
}: Props) {
  return (
    <header className="navbar">
      <a className="brand" href="#studio" aria-label="Ego Striker component studio">
        <span className="brand-emblem">
          <Zap size={24} fill="currentColor" />
        </span>
        <span>
          <strong>
            EGO<span>STRIKER</span>
          </strong>
          <small>BLUE LOCK COMPONENT STUDIO</small>
        </span>
      </a>
      <div className="nav-controls">
        {onMode && (
          <div className="segmented mode-segmented" aria-label="Studio mode">
            <button
              onClick={() => onMode('studio')}
              aria-pressed={mode === 'studio'}
              title="Card Studio — Edit individual cards"
              aria-label="Card Studio"
            >
              <LayoutGrid size={15} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => onMode('readme')}
              aria-pressed={mode === 'readme'}
              title="Profile README — Compose full GitHub profile"
              aria-label="Profile README"
            >
              <FileText size={15} />
              <span>README</span>
            </button>
          </div>
        )}
        <div className="segmented" aria-label="SVG layout">
          <button
            onClick={() => onLayout('wide')}
            aria-pressed={layout === 'wide'}
            title={`Wide layout, ${wideWidth}px`}
            aria-label={`Wide layout, ${wideWidth}px`}
          >
            <Monitor size={15} />
            <span>Wide</span>
          </button>
          <button
            onClick={() => onLayout('compact')}
            aria-pressed={layout === 'compact'}
            title="Compact layout, 400px"
            aria-label="Compact layout, 400px"
          >
            <Smartphone size={15} />
            <span>Compact</span>
          </button>
        </div>
        <button
          className="theme-button"
          onClick={onTheme}
          title="Switch preview theme"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} SVG theme`}
        >
          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
        <button
          className="button primary"
          aria-label="Export"
          onClick={(event) => {
            event.currentTarget.focus();
            onExport();
          }}
        >
          <Download size={15} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
}
