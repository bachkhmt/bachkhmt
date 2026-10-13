import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ShieldCheck,
  CircleUserRound,
  Flag,
  Target,
  Trophy,
  ChartNoAxesCombined,
  FolderGit2,
  Activity,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ReadmePreview } from './components/ReadmePreview';
import { ConfigEditor } from './components/ConfigEditor';
import { ExportModal } from './components/ExportModal';
import { PreviewBoundary } from './components/PreviewBoundary';
import { EditorHistory } from './data/editorHistory';
import { resolveReadmeSettings } from './readme/settings';
const ReadmeBuilderView = lazy(() =>
  import('./components/ReadmeBuilder/ReadmeBuilderView').then((module) => ({
    default: module.ReadmeBuilderView,
  })),
);
import { ComponentId, LayoutMode, ProfileConfig, ThemeMode } from './types';
import { arrangeFormation, DEFAULT_CONFIG } from './data/defaultConfig';
import { parseConfig, readStoredConfig, serializeConfig, STORAGE_KEY } from './data/configStore';
import { COMPONENT_REGISTRY } from './generator/svgGenerators';
import { getCardTemplate } from './templates/registry';
import { layoutKey } from './generator/layoutElements';

const ICONS: Record<ComponentId, LucideIcon> = {
  hero: Flag,
  'player-card': CircleUserRound,
  'tech-pitch': Target,
  'match-stats': Trophy,
  'league-table': ChartNoAxesCombined,
  projects: FolderGit2,
  season: Activity,
  footer: Mail,
};
export default function App() {
  const [initial] = useState(() => {
    try {
      const result = readStoredConfig(window.localStorage);
      if (new URLSearchParams(window.location.search).get('component') === 'hero-anime')
        result.config = {
          ...result.config,
          cardTemplates: { ...result.config.cardTemplates, hero: 'poster' },
        };
      return result;
    } catch {
      return {
        config: structuredClone(DEFAULT_CONFIG),
        error: 'Local storage is unavailable. Export JSON to keep your edits.',
        migrated: false,
        warnings: [],
      };
    }
  });
  const [config, setConfig] = useState(initial.config),
    [selected, setSelected] = useState<ComponentId>(() => {
      const requested = new URLSearchParams(window.location.search).get('component');
      return requested === 'hero-anime'
        ? 'hero'
        : (COMPONENT_REGISTRY.find((c) => c.id === requested)?.id ?? 'hero');
    }),
    [theme, setTheme] = useState<ThemeMode>('dark'),
    [layout, setLayout] = useState<LayoutMode>(() =>
      window.innerWidth <= 480 ? 'compact' : 'wide',
    ),
    [gallery, setGallery] = useState(false),
    [layoutEdit, setLayoutEdit] = useState(false),
    [layoutUndoCount, setLayoutUndoCount] = useState(0),
    [layoutRedoCount, setLayoutRedoCount] = useState(0),
    [activeElementId, setActiveElementId] = useState(''),
    [activeNodeId, setActiveNodeId] = useState<string | undefined>(),
    [currentPage, setCurrentPage] = useState(0),
    [configEpoch, setConfigEpoch] = useState(0),
    [activeElementLabel, setActiveElementLabel] = useState(''),
    [activeElementX, setActiveElementX] = useState(0),
    [activeElementY, setActiveElementY] = useState(0),
    [activeElementOriginX, setActiveElementOriginX] = useState(0),
    [activeElementOriginY, setActiveElementOriginY] = useState(0),
    [activeElementScale, setActiveElementScale] = useState(1),
    [activeElementRotation, setActiveElementRotation] = useState(0),
    [appMode, setAppMode] = useState<'studio' | 'readme'>('studio'),
    [mobileTab, setMobileTab] = useState<'components' | 'preview' | 'customize'>('preview'),
    [exportOpen, setExportOpen] = useState(false),
    [sound, setSound] = useState(false),
    [saveStatus, setSaveStatus] = useState(
      initial.error ? 'Backup recommended' : 'Saved on this device',
    );
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(
    initial.error
      ? { message: initial.error, error: true }
      : initial.warnings.length
        ? { message: initial.warnings.join(' '), error: false }
        : null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    dirty = useRef(initial.migrated),
    audioRef = useRef<AudioContext | null>(null),
    history = useRef(new EditorHistory()),
    configRef = useRef(config);
  configRef.current = config;
  const notify = useCallback((message: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, error });
    timer.current = setTimeout(() => setToast(null), error ? 10000 : 4500);
  }, []);
  const syncHistoryCounts = () => {
    setLayoutUndoCount(history.current.undoStack.length);
    setLayoutRedoCount(history.current.redoStack.length);
  };
  const change = useCallback(
    (value: ProfileConfig | ((c: ProfileConfig) => ProfileConfig), group = false) => {
      try {
        const next = parseConfig(typeof value === 'function' ? value(configRef.current) : value);
        history.current.capture(configRef.current, next, group);
        configRef.current = next;
        dirty.current = true;
        setSaveStatus('Saving…');
        setConfig(next);
        syncHistoryCounts();
      } catch (error) {
        notify((error as Error).message, true);
      }
    },
    [notify],
  );
  const closeExport = useCallback(() => setExportOpen(false), []);
  function replaceConfig(next: ProfileConfig) {
    history.current.clear();
    setActiveElementId('');
    setActiveNodeId(undefined);
    setLayoutUndoCount(0);
    setLayoutRedoCount(0);
    setConfigEpoch((epoch) => epoch + 1);
    configRef.current = next;
    dirty.current = true;
    setSaveStatus('Saving…');
    setConfig(next);
  }
  function commitLayout(
    elementId: string,
    x: number,
    y: number,
    scale = 1,
    rotation = 0,
    nodeId?: string,
    keyboard = false,
  ) {
    const target = nodeId ?? (elementId === activeElementId ? activeNodeId : undefined);
    if (target !== undefined) {
      const width = layout === 'wide' ? 500 : 400,
        inset = layout === 'compact' ? 34 : 42;
      const pitchHeight = layout === 'compact' ? 368 : 468;
      const px = Math.max(0, Math.min(100, ((x - 24 - inset) / (width - 48 - inset * 2)) * 100));
      const py = Math.max(0, Math.min(100, ((y - 113) / (pitchHeight - 80)) * 100));
      change(
        (current) => ({
          ...current,
          pitchTechs: current.pitchTechs.map((n) => (n.id === target ? { ...n, x: px, y: py } : n)),
        }),
        keyboard,
      );
      return;
    }
    const position = {
      x: Math.max(-400, Math.min(1200, x)),
      y: Math.max(-400, Math.min(1500, y)),
      scale: Math.max(0.1, Math.min(4, scale)),
      rotation: Math.max(-360, Math.min(360, rotation)),
    };
    const key = layoutKey(
      selected,
      getCardTemplate(selected, config.cardTemplates?.[selected]).id,
      layout,
    );
    change(
      (current) => ({
        ...current,
        layoutOverrides: {
          ...current.layoutOverrides,
          [key]: { ...current.layoutOverrides?.[key], [elementId]: position },
        },
      }),
      keyboard,
    );
  }
  function undoLayout() {
    configRef.current = history.current.undo(configRef.current);
    dirty.current = true;
    setSaveStatus('Saving…');
    setConfig(configRef.current);
    syncHistoryCounts();
  }
  function redoLayout() {
    configRef.current = history.current.redo(configRef.current);
    dirty.current = true;
    setSaveStatus('Saving…');
    setConfig(configRef.current);
    syncHistoryCounts();
  }
  function resetLayout(elementId: string) {
    if (activeNodeId !== undefined) {
      const original = arrangeFormation(config.pitchTechs, config.pitchFormation).find(
        (n) => n.id === activeNodeId,
      );
      if (original)
        change((current) => ({
          ...current,
          pitchTechs: current.pitchTechs.map((n) =>
            n.id === activeNodeId ? { ...n, x: original.x, y: original.y } : n,
          ),
        }));
      return;
    }
    const key = layoutKey(
      selected,
      getCardTemplate(selected, config.cardTemplates?.[selected]).id,
      layout,
    );
    change((current) => {
      const overrides = { ...current.layoutOverrides },
        group = { ...overrides[key] };
      delete group[elementId];
      if (Object.keys(group).length) overrides[key] = group;
      else delete overrides[key];
      return { ...current, layoutOverrides: overrides };
    });
  }
  useEffect(() => {
    if (!dirty.current) return;
    const save = () => {
      if (!dirty.current) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeConfig(configRef.current));
        dirty.current = false;
        setSaveStatus('Saved on this device');
      } catch (error) {
        setSaveStatus('Not saved · export JSON');
        notify(`Could not save: ${(error as Error).message} Export JSON to keep your edits.`, true);
      }
    };
    const timeout = setTimeout(save, 300);
    const flush = () => {
      clearTimeout(timeout);
      save();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('blur', flush);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('blur', flush);
    };
  }, [config, notify]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      audioRef.current?.close().catch(() => {});
    },
    [],
  );
  useEffect(() => {
    const release = () => history.current.endGesture();
    window.addEventListener('keyup', release, true);
    return () => window.removeEventListener('keyup', release, true);
  }, []);
  function select(id: ComponentId) {
    const url = new URL(window.location.href);
    url.searchParams.set('component', id);
    window.history.replaceState(null, '', url);
    setSelected(id);
    setGallery(false);
    setMobileTab('preview');
    if (sound) {
      try {
        const ctx = audioRef.current ?? (audioRef.current = new AudioContext());
        ctx.resume().catch(() => {});
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.frequency.value = 640;
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      } catch {
        /* Sound is optional. */
      }
    }
  }
  return (
    <div className="studio" id="studio">
      <Navbar
        mode={appMode}
        onMode={setAppMode}
        theme={theme}
        layout={layout}
        wideWidth={COMPONENT_REGISTRY.find((c) => c.id === selected)?.baseSize?.wide[0]}
        onTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onLayout={setLayout}
        onExport={() => setExportOpen(true)}
      />
      <div className="studio-status">
        <span>
          <span className="live-dot" /> EGO PROTOCOL <b>ONLINE</b>
        </span>
        <span className="status-middle">
          AI ENGINEERING <i>×</i> BLUE LOCK
        </span>
        <span>
          <ShieldCheck size={12} />
          {saveStatus}
        </span>
      </div>
      {appMode === 'readme' ? (
        <PreviewBoundary resetKey={`readme:${configEpoch}`}>
          <ReadmeBuilderView
            config={config}
            theme={theme}
            layout={layout}
            onChange={change}
            notify={notify}
            onExit={() => setAppMode('studio')}
          />
        </PreviewBoundary>
      ) : (
        <>
          <nav className="mobile-tabs" aria-label="Studio panels">
            {(['components', 'preview', 'customize'] as const).map((tab) => (
              <button key={tab} aria-pressed={mobileTab === tab} onClick={() => setMobileTab(tab)}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
          <main className="studio-layout">
            <aside
              className={`library-panel ${mobileTab === 'components' ? 'mobile-active' : ''}`}
              aria-label="Component library"
            >
              <div className="library-heading">
                <p className="eyebrow">YOUR LINEUP</p>
                <h2>
                  Components <span>{String(COMPONENT_REGISTRY.length).padStart(2, '0')}</span>
                </h2>
                <p>Pick a component. Make it yours.</p>
              </div>
              <div className="component-list">
                {COMPONENT_REGISTRY.map((c, i) => {
                  const Icon = ICONS[c.id];
                  return (
                    <button
                      className={`component-item ${selected === c.id ? 'active' : ''}`}
                      key={c.id}
                      aria-pressed={selected === c.id}
                      onClick={() => select(c.id)}
                    >
                      <span className="component-index">{String(i + 1).padStart(2, '0')}</span>
                      <span className="component-icon">
                        <Icon size={18} />
                      </span>
                      <span className="component-item-text">
                        <strong>{c.name}</strong>
                        <small>{c.category}</small>
                      </span>
                      <ArrowUpRight size={13} className="component-arrow" />
                    </button>
                  );
                })}
              </div>
              <div className="library-tip">
                <Target size={20} />
                <strong>Build your own formation.</strong>
                <p>Each SVG stands on its own. Use one, a few, or the full lineup.</p>
                <span>
                  {COMPONENT_REGISTRY.length} COMPONENTS /{' '}
                  {COMPONENT_REGISTRY.reduce((count, item) => count + item.templates.length, 0)}{' '}
                  DESIGNS
                </span>
              </div>
              <div className="library-footer">
                <span className="tiny-mark">E / S</span>
                <span>FAN-MADE. EGO-DRIVEN.</span>
              </div>
            </aside>
            <div className={`center-panel ${mobileTab === 'preview' ? 'mobile-active' : ''}`}>
              <PreviewBoundary resetKey={`${selected}:${layout}:${configEpoch}`}>
                <ReadmePreview
                  key={configEpoch}
                  onPageChange={setCurrentPage}
                  onLayoutGestureEnd={() => history.current.endGesture()}
                  config={config}
                  theme={theme}
                  layout={layout}
                  selected={selected}
                  gallery={gallery}
                  onGallery={() => setGallery((v) => !v)}
                  onSelect={select}
                  onCharacterSelect={(character) =>
                    change((current) => ({
                      ...current,
                      characterOverrides: { ...current.characterOverrides, hero: character },
                    }))
                  }
                  notify={notify}
                  layoutEdit={layoutEdit}
                  canUndoLayout={layoutUndoCount > 0}
                  canRedoLayout={layoutRedoCount > 0}
                  onUndoLayout={undoLayout}
                  onRedoLayout={redoLayout}
                  onLayoutCommit={commitLayout}
                  onElementSelect={(id, label, x, y, originX, originY, scale, rotation, nodeId) => {
                    setActiveNodeId(nodeId);
                    setActiveElementId(id);
                    setActiveElementLabel(label);
                    setActiveElementX(x);
                    setActiveElementY(y);
                    setActiveElementOriginX(originX ?? 0);
                    setActiveElementOriginY(originY ?? 0);
                    setActiveElementScale(scale ?? 1);
                    setActiveElementRotation(rotation ?? 0);
                  }}
                />
              </PreviewBoundary>
            </div>
            <div className={`right-panel ${mobileTab === 'customize' ? 'mobile-active' : ''}`}>
              <PreviewBoundary resetKey={`config:${selected}:${configEpoch}`}>
                <ConfigEditor
                  resetEpoch={configEpoch}
                  onImport={replaceConfig}
                  activeNodeId={activeNodeId}
                  config={config}
                  theme={theme}
                  selected={selected}
                  onChange={change}
                  onReset={() => {
                    replaceConfig(structuredClone(DEFAULT_CONFIG));
                    notify('All components reset to the AI Engineer demo.');
                  }}
                  sound={sound}
                  onSound={setSound}
                  notify={notify}
                  layoutEdit={layoutEdit}
                  onLayoutEdit={setLayoutEdit}
                  layout={layout}
                  activeElementId={activeElementId}
                  activeElementLabel={activeElementLabel}
                  activeElementX={activeElementX}
                  activeElementY={activeElementY}
                  activeElementOriginX={activeElementOriginX}
                  activeElementOriginY={activeElementOriginY}
                  activeElementScale={activeElementScale}
                  activeElementRotation={activeElementRotation}
                  onLayoutCommit={commitLayout}
                  onResetLayout={resetLayout}
                />
              </PreviewBoundary>
            </div>
          </main>
        </>
      )}
      {exportOpen && (
        <PreviewBoundary resetKey={`export:${configEpoch}`}>
          <ExportModal
            currentPage={currentPage}
            initialCards={
              appMode === 'readme' ? resolveReadmeSettings(config).selectedCards : undefined
            }
            config={config}
            selected={selected}
            theme={theme}
            layout={layout}
            onClose={closeExport}
            notify={notify}
          />
        </PreviewBoundary>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
