import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Copy, Download, Grid2X2, Scan, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import { CharacterId, ComponentId, LayoutMode, ProfileConfig, ThemeMode } from '../types';
import { COMPONENT_REGISTRY, svgDataUrl, pageCount } from '../generator/svgGenerators';
import { generateEmbedSnippet, svgFilename } from '../generator/exportZip';
import { characterColorway } from '../characters/colorways';
import { copyText, downloadFile } from '../browserIO';
import { getCardTemplate } from '../templates/registry';
import { CharacterBannerGallery } from './CharacterBannerGallery';
import { elementTransform } from '../generator/layoutElements';
import { useReducedMotion } from './useReducedMotion';

interface Props {
  config: ProfileConfig;
  theme: ThemeMode;
  layout: LayoutMode;
  selected: ComponentId;
  gallery: boolean;
  onGallery: () => void;
  onSelect: (id: ComponentId) => void;
  onCharacterSelect: (id: CharacterId) => void;
  notify: (message: string, error?: boolean) => void;
  layoutEdit: boolean;
  canUndoLayout: boolean;
  canRedoLayout: boolean;
  onUndoLayout: () => void;
  onRedoLayout: () => void;
  onPageChange: (page: number) => void;
  onLayoutGestureEnd: () => void;
  onLayoutCommit: (
    elementId: string,
    x: number,
    y: number,
    scale?: number,
    rotation?: number,
    nodeId?: string,
    keyboard?: boolean,
  ) => void;
  onElementSelect: (
    elementId: string,
    label: string,
    x: number,
    y: number,
    originX?: number,
    originY?: number,
    scale?: number,
    rotation?: number,
    nodeId?: string,
  ) => void;
}
export function ReadmePreview({
  config,
  theme,
  layout,
  selected,
  gallery,
  onGallery,
  onSelect,
  onCharacterSelect,
  notify,
  layoutEdit,
  canUndoLayout,
  canRedoLayout,
  onUndoLayout,
  onRedoLayout,
  onLayoutCommit,
  onLayoutGestureEnd,
  onPageChange,
  onElementSelect,
}: Props) {
  const component = COMPONENT_REGISTRY.find((c) => c.id === selected)!;
  const template = getCardTemplate(selected, config.cardTemplates?.[selected]);
  const [pages, setPages] = useState<Partial<Record<ComponentId, number>>>({});
  const [activeElement, setActiveElement] = useState('');
  const [focusedElementId, setFocusedElementId] = useState('');
  const [previewMotion, setPreviewMotion] = useState(false);
  const reducedMotion = useReducedMotion();
  const restoreCanvasFocus = useRef(false);
  const [scrubSeconds, setScrubSeconds] = useState(0);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [layers, setLayers] = useState<Array<{ id: string; label: string; x: number; y: number }>>(
    [],
  );
  const inlineRef = useRef<HTMLDivElement>(null);
  const onElementSelectRef = useRef(onElementSelect);
  onElementSelectRef.current = onElementSelect;
  const drag = useRef<{
    element: SVGGElement;
    nodeId?: string;
    id: string;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    moved: boolean;
  } | null>(null);
  const count = pageCount(selected, config, template.id),
    page = Math.min(pages[selected] ?? 0, count - 1);
  const cycleSeconds =
    config.motionCycleSeconds ??
    (config.animationLevel === 'cinematic' ? 20 : config.animationLevel === 'subtle' ? 18 : 16);
  const svg = useMemo(
    () =>
      component.render(
        (layoutEdit && !previewMotion) || reducedMotion
          ? { ...config, animationLevel: 'none' }
          : config,
        theme,
        { layout, page, template: template.id },
      ),
    [component, config, theme, layout, page, template.id, layoutEdit, previewMotion, reducedMotion],
  );
  useEffect(() => {
    onPageChange(page);
  }, [page, selected, onPageChange]);
  useEffect(() => {
    drag.current = null;
    setActiveElement('');
    setFocusedElementId('');
    onElementSelect('', '', 0, 0);
  }, [selected, layout, template.id, page, gallery]);
  useEffect(() => {
    if (!layoutEdit || gallery) {
      setLayers([]);
      return;
    }
    const groups = Array.from(
      inlineRef.current?.querySelectorAll('g[data-layout-element="true"]') ?? [],
    ) as SVGGElement[];
    groups.forEach((element) => {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
    });
    setLayers(
      groups
        .map((element) => ({
          id: element.dataset.elementId ?? '',
          label: element.dataset.elementLabel ?? element.dataset.elementId ?? 'SVG element',
          x: Number(element.dataset.layoutX),
          y: Number(element.dataset.layoutY),
        }))
        .filter((element) => element.id),
    );
  }, [layoutEdit, gallery, svg]);
  useEffect(() => {
    if (!layoutEdit || gallery || !focusedElementId) return;
    const element = Array.from(
      inlineRef.current?.querySelectorAll('g[data-layout-element="true"]') ?? [],
    ).find((node) => (node as SVGGElement).dataset.elementId === focusedElementId) as
      SVGGElement | undefined;
    if (!element) {
      setFocusedElementId('');
      setActiveElement('');
      onElementSelectRef.current('', '', 0, 0);
      return;
    }
    if (restoreCanvasFocus.current) {
      element.focus({ preventScroll: true });
      restoreCanvasFocus.current = false;
    }
    onElementSelectRef.current(
      focusedElementId,
      element.dataset.elementLabel ?? focusedElementId,
      Number(element.dataset.layoutX),
      Number(element.dataset.layoutY),
      Number(element.dataset.originX),
      Number(element.dataset.originY),
      Number(element.dataset.layoutScale ?? 1),
      Number(element.dataset.layoutRotation ?? 0),
      element.dataset.nodeId,
    );
  }, [focusedElementId, layoutEdit, gallery, svg]);
  const size = (new Blob([svg]).size / 1024).toFixed(1);
  useEffect(() => {
    setScrubSeconds((time) => Math.min(time, cycleSeconds));
  }, [cycleSeconds]);
  useEffect(() => {
    if (!layoutEdit || !previewMotion || reducedMotion) return;
    const root = inlineRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!root) return;
    try {
      if (typeof root.pauseAnimations === 'function') root.pauseAnimations();
      if (typeof root.setCurrentTime === 'function') root.setCurrentTime(scrubSeconds);
    } catch {
      // Some SVG hosts expose SMIL controls but do not allow scrubbing.
    }
    root.querySelectorAll('*').forEach((element) => {
      try {
        element.getAnimations?.().forEach((animation) => {
          animation.pause();
          animation.currentTime = scrubSeconds * 1000;
        });
      } catch {
        // Keep the preview usable when a host cannot set animation time.
      }
    });
  }, [layoutEdit, gallery, svg, scrubSeconds, previewMotion, reducedMotion]);
  function svgPoint(event: ReactPointerEvent<HTMLDivElement>, target: SVGSVGElement) {
    const matrix = target.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }
  function setElementTransform(
    element: SVGGElement,
    x: number,
    y: number,
    scale: number,
    rotation: number,
  ) {
    element.setAttribute(
      'transform',
      elementTransform(
        Number(element.dataset.originX),
        Number(element.dataset.originY),
        x,
        y,
        scale,
        rotation,
      ),
    );
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!layoutEdit || event.button !== 0) return;
    const target = event.target as Element;
    const element = target.closest('g[data-layout-element="true"]') as SVGGElement | null;
    const root = element?.ownerSVGElement;
    if (!element || !root) return;
    const point = svgPoint(event, root);
    const id = element.dataset.elementId ?? '';
    const originX = Number(element.dataset.originX);
    const originY = Number(element.dataset.originY);
    const x = Number(element.dataset.layoutX);
    const y = Number(element.dataset.layoutY);
    const scale = Number(element.dataset.layoutScale ?? 1);
    const rotation = Number(element.dataset.layoutRotation ?? 0);
    if (!id || ![originX, originY, x, y, scale, rotation].every(Number.isFinite)) return;
    event.preventDefault();
    drag.current = {
      element,
      id,
      nodeId: element.dataset.nodeId,
      originX,
      originY,
      startX: point.x,
      startY: point.y,
      x,
      y,
      scale,
      rotation,
      moved: false,
    };
    element.dataset.layoutSelected = 'true';
    setActiveElement(element.dataset.elementLabel ?? id);
    onElementSelect(
      id,
      element.dataset.elementLabel ?? id,
      x,
      y,
      originX,
      originY,
      scale,
      rotation,
      element.dataset.nodeId,
    );
    event.currentTarget.setPointerCapture(event.pointerId);
    setFocusedElementId(id);
  }
  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!layoutEdit || !current) return;
    const root = current.element.ownerSVGElement;
    if (!root) return;
    const point = svgPoint(event, root);
    const dx = point.x - current.startX;
    const dy = point.y - current.startY;
    if (Math.hypot(dx, dy) > 1.5) current.moved = true;
    if (!current.moved) return;
    let x = current.x + dx,
      y = current.y + dy;
    if (snapToGrid && !event.shiftKey) {
      x = Math.round(x / 8) * 8;
      y = Math.round(y / 8) * 8;
    }
    setElementTransform(current.element, x, y, current.scale, current.rotation);
    current.element.dataset.layoutX = String(x);
    current.element.dataset.layoutY = String(y);
  }
  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    if (current.moved) {
      const x = Number(current.element.dataset.layoutX),
        y = Number(current.element.dataset.layoutY);
      onElementSelect(
        current.id,
        current.element.dataset.elementLabel ?? current.id,
        x,
        y,
        current.originX,
        current.originY,
        current.scale,
        current.rotation,
        current.nodeId,
      );
      restoreCanvasFocus.current = true;
      onLayoutCommit(current.id, x, y, current.scale, current.rotation, current.nodeId);
    } else delete current.element.dataset.layoutSelected;
    drag.current = null;
    onLayoutGestureEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function pointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current) return;
    current.element.dataset.layoutX = String(current.x);
    current.element.dataset.layoutY = String(current.y);
    setElementTransform(current.element, current.x, current.y, current.scale, current.rotation);
    delete current.element.dataset.layoutSelected;
    drag.current = null;
    onLayoutGestureEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function moveFocusedElement(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!layoutEdit) return;
    const target = event.target as Element;
    const element = target.closest('g[data-layout-element="true"]') as SVGGElement | null;
    if (!element) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      return;
    }
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const x =
      Number(element.dataset.layoutX) +
      (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0);
    const y =
      Number(element.dataset.layoutY) +
      (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0);
    const originX = Number(element.dataset.originX),
      originY = Number(element.dataset.originY);
    const scale = Number(element.dataset.layoutScale ?? 1),
      rotation = Number(element.dataset.layoutRotation ?? 0);
    if (![x, y, originX, originY, scale, rotation].every(Number.isFinite)) return;
    const id = element.dataset.elementId ?? '';
    if (!id) return;
    element.dataset.layoutX = String(x);
    element.dataset.layoutY = String(y);
    setElementTransform(element, x, y, scale, rotation);
    const label = element.dataset.elementLabel ?? id;
    setActiveElement(label);
    setFocusedElementId(id);
    onElementSelect(id, label, x, y, originX, originY, scale, rotation, element.dataset.nodeId);
    restoreCanvasFocus.current = true;
    onLayoutCommit(id, x, y, scale, rotation, element.dataset.nodeId, true);
  }
  function focusElement(event: ReactFocusEvent<HTMLDivElement>) {
    if (!layoutEdit) return;
    const element = (event.target as Element).closest(
      'g[data-layout-element="true"]',
    ) as SVGGElement | null;
    if (!element) return;
    const id = element.dataset.elementId ?? '';
    const label = element.dataset.elementLabel ?? id;
    const x = Number(element.dataset.layoutX),
      y = Number(element.dataset.layoutY);
    const originX = Number(element.dataset.originX),
      originY = Number(element.dataset.originY);
    const scale = Number(element.dataset.layoutScale ?? 1),
      rotation = Number(element.dataset.layoutRotation ?? 0);
    if (!id || ![x, y, originX, originY, scale, rotation].every(Number.isFinite)) return;
    setFocusedElementId(id);
    setActiveElement(label);
    onElementSelect(id, label, x, y, originX, originY, scale, rotation, element.dataset.nodeId);
  }
  function focusLayer(id: string) {
    const element = Array.from(
      inlineRef.current?.querySelectorAll('g[data-layout-element="true"]') ?? [],
    ).find((node) => (node as SVGGElement).dataset.elementId === id) as SVGGElement | undefined;
    if (!element) return;
    element.focus();
    setFocusedElementId(id);
    const label = element.dataset.elementLabel ?? id;
    onElementSelect(
      id,
      label,
      Number(element.dataset.layoutX),
      Number(element.dataset.layoutY),
      Number(element.dataset.originX),
      Number(element.dataset.originY),
      Number(element.dataset.layoutScale ?? 1),
      Number(element.dataset.layoutRotation ?? 0),
      element.dataset.nodeId,
    );
    setActiveElement(label);
  }
  async function copy() {
    try {
      await copyText(
        generateEmbedSnippet(config, selected, 'assets/ego-striker', page, template.id),
      );
      notify('Embed snippet copied.');
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  return (
    <section
      className={`preview-panel ${layoutEdit ? 'element-editing' : ''}`}
      aria-label="Component preview"
    >
      <div className="preview-heading">
        <div>
          <p className="eyebrow">
            LIVE PREVIEW <span className="live-dot" />
          </p>
          <h1>{gallery ? 'The starting lineup' : template.name}</h1>
          <p className="panel-description">
            {gallery
              ? 'Eight card families. Select a card to edit its design.'
              : component.description}
          </p>
        </div>
        <button
          className="icon-button gallery-toggle"
          onClick={onGallery}
          aria-pressed={gallery}
          title={gallery ? 'Show selected component' : 'Show all components'}
          aria-label={gallery ? 'Show selected component' : 'Show all components'}
        >
          {gallery ? <Scan size={18} /> : <Grid2X2 size={18} />}
          <span>{gallery ? 'Focus' : 'Gallery'}</span>
        </button>
      </div>
      <div className="canvas-toolbar">
        <span>
          <span className="live-dot" /> {theme.toUpperCase()} <i>/</i>{' '}
          {component.baseSize?.[layout][0]} PX
        </span>
        <span className="layout-toolbar">
          {layoutEdit ? (
            <>
              <span>EDIT ELEMENTS · {activeElement || 'SELECT A LAYER'}</span>
              <label className="snap-toggle">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(event) => setSnapToGrid(event.currentTarget.checked)}
                />{' '}
                Snap 8px
              </label>
              <button
                className="button"
                aria-pressed={previewMotion}
                onClick={() => setPreviewMotion((value) => !value)}
              >
                {previewMotion ? 'Motion preview' : 'Static layout'}
              </button>
              <label className="timeline-scrub">
                {scrubSeconds.toFixed(1)}s
                <input
                  type="range"
                  aria-label="Scrub animation timeline"
                  disabled={!previewMotion || reducedMotion}
                  min="0"
                  max={cycleSeconds}
                  step="0.1"
                  value={scrubSeconds}
                  onChange={(event) => setScrubSeconds(Number(event.currentTarget.value))}
                />
                {cycleSeconds}s
              </label>
              <button
                className="icon-button"
                disabled={!canUndoLayout}
                onClick={onUndoLayout}
                aria-label="Undo element edit"
                title="Undo element edit"
              >
                <Undo2 size={14} />
              </button>
              <button
                className="icon-button"
                disabled={!canRedoLayout}
                onClick={onRedoLayout}
                aria-label="Redo element edit"
                title="Redo element edit"
              >
                <Redo2 size={14} />
              </button>
            </>
          ) : (
            'SVG IMAGE PREVIEW'
          )}
        </span>
      </div>
      <div className={`preview-canvas ${gallery ? 'gallery-canvas' : ''}`}>
        {gallery ? (
          COMPONENT_REGISTRY.map((c, i) => (
            <button
              className={`gallery-card ${selected === c.id ? 'is-selected' : ''}`}
              key={c.id}
              onClick={() => onSelect(c.id)}
            >
              <div>
                <span>
                  {String(i + 1).padStart(2, '0')} / {c.name}
                </span>
                <span>↗</span>
              </div>
              <img
                src={svgDataUrl(c.render({ ...config, animationLevel: 'none' }, theme, { layout }))}
                alt={`${c.name} preview`}
                loading="lazy"
                style={{ maxWidth: c.baseSize?.[layout][0], marginInline: 'auto' }}
              />
            </button>
          ))
        ) : (
          <div
            className={`svg-stage ${layout} ${layoutEdit ? 'layout-editing' : ''}`}
            style={{ maxWidth: component.baseSize?.[layout][0] }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerCancel}
            onKeyDown={moveFocusedElement}
            onKeyUp={onLayoutGestureEnd}
            onFocus={focusElement}
          >
            {layoutEdit ? (
              <div
                ref={inlineRef}
                className="component-inline-svg"
                role="group"
                aria-label={`${component.name} editable SVG preview`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <img
                className="component-image"
                src={svgDataUrl(svg)}
                alt={`${component.name} preview`}
              />
            )}
          </div>
        )}
        {layoutEdit && !gallery && reducedMotion && previewMotion && (
          <p className="field-hint">Motion is disabled by your reduced-motion preference.</p>
        )}
        {layoutEdit && !gallery && layers.length > 0 && (
          <aside className="layout-layer-panel" aria-label="SVG layers">
            <div className="layer-panel-heading">
              <strong>LAYERS</strong>
              <span>{layers.length} elements / current page</span>
            </div>
            <div className="layer-list">
              {layers.map((element) => (
                <button
                  type="button"
                  key={element.id}
                  aria-label={`Select layer: ${element.label}`}
                  className={focusedElementId === element.id ? 'is-active' : ''}
                  aria-pressed={focusedElementId === element.id}
                  onClick={() => focusLayer(element.id)}
                >
                  {element.label}
                  <small>
                    {element.x.toFixed(0)}, {element.y.toFixed(0)}
                  </small>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
      <div className="preview-footer">
        <div className="file-meta">
          <CheckCircle2 size={14} />
          <span>
            {svgFilename(
              selected,
              theme,
              layout,
              page,
              config.characterOverrides?.[selected] ?? config.character,
              template.id,
              characterColorway(config, config.characterOverrides?.[selected] ?? config.character),
            )}
          </span>
          <small>{size} KB</small>
        </div>
        <div className="footer-actions">
          {!gallery && count > 1 && (
            <div className="page-controls">
              <button
                className="icon-button"
                aria-label="Previous component page"
                disabled={page === 0}
                onClick={() => setPages({ ...pages, [selected]: page - 1 })}
              >
                ‹
              </button>
              <span>
                {' '}
                {page + 1} / {count}{' '}
              </span>
              <button
                className="icon-button"
                aria-label="Next component page"
                disabled={page === count - 1}
                onClick={() => setPages({ ...pages, [selected]: page + 1 })}
              >
                ›
              </button>
            </div>
          )}
          <button className="button" onClick={copy}>
            <Copy size={14} />
            <span>Copy snippet</span>
          </button>
          <button
            className="button"
            onClick={() => {
              downloadFile(
                component.render(config, theme, { layout, page, template: template.id }),
                svgFilename(
                  selected,
                  theme,
                  layout,
                  page,
                  config.characterOverrides?.[selected] ?? config.character,
                  template.id,
                  characterColorway(
                    config,
                    config.characterOverrides?.[selected] ?? config.character,
                  ),
                ),
                'image/svg+xml',
              );
              notify('SVG downloaded.');
            }}
          >
            <Download size={14} />
            <span>SVG</span>
          </button>
        </div>
      </div>
      {selected === 'hero' && !gallery && (
        <CharacterBannerGallery
          config={config}
          theme={theme}
          layout={layout}
          onSelect={onCharacterSelect}
        />
      )}
      <div className="preview-note">
        <span>YOUR README. YOUR FORMATION.</span>
        <p>Export a component and place it wherever you want in your GitHub README.</p>
      </div>
    </section>
  );
}
