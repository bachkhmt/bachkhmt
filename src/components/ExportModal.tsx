import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, X, Package, Check } from 'lucide-react';
import { CharacterId, ComponentId, LayoutMode, ProfileConfig, ThemeMode } from '../types';
import { COMPONENT_REGISTRY, pageCount } from '../generator/svgGenerators';
import {
  createFullExportZip,
  createProfileKitZip,
  generateEmbedSnippet,
} from '../generator/exportZip';
import { generateFullReadme, resolveReadmeSettings, readmePathError } from '../readme';
import { parseConfig } from '../data/configStore';
import { copyText, downloadFile } from '../browserIO';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../characters/themes';
import { getCardTemplate } from '../templates/registry';
import { buildExportManifest } from '../generator/exportManifest';

interface Props {
  config: ProfileConfig;
  selected: ComponentId;
  theme: ThemeMode;
  layout: LayoutMode;
  currentPage?: number;
  initialCards?: ComponentId[];
  onClose: () => void;
  notify: (message: string, error?: boolean) => void;
}
export function ExportModal({
  config,
  selected,
  theme,
  layout,
  currentPage = 0,
  initialCards,
  onClose,
  notify,
}: Props) {
  const [ids, setIds] = useState<ComponentId[]>(initialCards ?? [selected]),
    [characters, setCharacters] = useState<CharacterId[]>([]),
    [allTemplates, setAllTemplates] = useState(false),
    [allIsagiColorways, setAllIsagiColorways] = useState(false),
    [tab, setTab] = useState<'snippet' | 'svg' | 'readme'>('snippet'),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0);
  const busyRef = useRef(false);
  const settings = useMemo(
    () => resolveReadmeSettings(config, { selectedCards: ids }),
    [config, ids],
  );
  const pathError = readmePathError(settings);
  const template = getCardTemplate(selected, config.cardTemplates?.[selected]);
  const page = Math.min(currentPage, pageCount(selected, config) - 1);
  const ref = useRef<HTMLDivElement>(null),
    component = COMPONENT_REGISTRY.find((c) => c.id === selected)!;
  const content =
    tab === 'snippet'
      ? generateEmbedSnippet(config, selected, 'assets/ego-striker', page, template.id)
      : tab === 'readme'
        ? (pathError ?? generateFullReadme(config, settings))
        : component.render(config, theme, { layout, page });
  const svgFileCount = useMemo(
    () =>
      buildExportManifest(config, ids, { characters, allTemplates, allIsagiColorways }).assets
        .length,
    [config, ids, characters, allTemplates, allIsagiColorways],
  );
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background = Array.from(document.querySelectorAll<HTMLElement>('#studio > *')).filter(
      (e) => !e.classList.contains('modal-overlay') && !e.classList.contains('toast'),
    );
    const inertState = background.map((e) => e.inert);
    background.forEach((e) => {
      e.inert = true;
    });
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) onClose();
      if (e.key === 'Tab') {
        const focusable = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
          ) ?? [],
        );
        const visible = focusable.filter((element) => element.getClientRects().length > 0);
        const first = visible[0],
          last = visible.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = originalOverflow;
      background.forEach((e, i) => {
        e.inert = inertState[i];
      });
      previous?.focus();
    };
  }, [onClose]);
  async function download() {
    if (busyRef.current || !ids.length) return;
    busyRef.current = true;
    setProgress(0);
    setBusy(true);
    try {
      parseConfig(config);
      const blob = await createFullExportZip(config, ids, {
        characters: characters.length ? characters : undefined,
        allTemplates,
        allIsagiColorways,
        onProgress: setProgress,
      });
      downloadFile(blob, 'ego-striker-components.zip');
      notify(`${ids.length} components exported with every page and variant.`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busyRef.current) onClose();
      }}
    >
      <div
        className="export-modal"
        aria-busy={busy}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">TAKE YOUR LINEUP TO GITHUB</p>
            <h2 id="export-title">Export components</h2>
          </div>
          <button
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close export"
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <fieldset disabled={busy} className="export-options-fields">
            <div className="export-selection-heading">
              <span>SELECT COMPONENTS</span>
              <button
                className="text-button"
                onClick={() =>
                  setIds(
                    ids.length === COMPONENT_REGISTRY.length
                      ? []
                      : [
                          ...ids,
                          ...COMPONENT_REGISTRY.map((c) => c.id).filter((id) => !ids.includes(id)),
                        ],
                  )
                }
              >
                {ids.length === COMPONENT_REGISTRY.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="export-selection">
              {COMPONENT_REGISTRY.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(c.id)}
                    onChange={(e) =>
                      setIds(e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id))
                    }
                  />
                  <span>{c.name}</span>
                  {ids.includes(c.id) && <Check size={13} />}
                </label>
              ))}
            </div>
            <label className="export-option">
              <input
                type="checkbox"
                checked={allTemplates}
                onChange={(event) => setAllTemplates(event.currentTarget.checked)}
              />
              <span>Export every design for each selected card</span>
            </label>
            <label className="export-option">
              <input
                type="checkbox"
                checked={allIsagiColorways}
                onChange={(event) => setAllIsagiColorways(event.currentTarget.checked)}
              />
              <span>Include both Isagi colorways (Default + Deep Blue)</span>
            </label>
            <p className="field-hint">
              Both colorways apply to selected Isagi cards and additional Isagi variants. The main
              README keeps your active colorway.
            </p>
            <details className="export-characters">
              <summary>
                Additional character variants{' '}
                {characters.length ? `· ${characters.length} selected` : `· current card themes`}
              </summary>
              <div className="export-character-actions">
                <button
                  className="text-button"
                  onClick={() => setCharacters(CHARACTER_IDS)}
                  type="button"
                >
                  All 8
                </button>
                <button className="text-button" onClick={() => setCharacters([])} type="button">
                  Current theme
                </button>
              </div>
              <div className="export-character-grid">
                {CHARACTER_IDS.map((id) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={characters.includes(id)}
                      onChange={(event) =>
                        setCharacters(
                          event.currentTarget.checked
                            ? [...characters, id]
                            : characters.filter((item) => item !== id),
                        )
                      }
                    />
                    <span>{CHARACTER_THEMES[id].name}</span>
                  </label>
                ))}
              </div>
            </details>
            <div className="export-summary">
              <Package size={20} />
              <div>
                <strong>{svgFileCount} SVG files + configuration & snippets</strong>
                <p>
                  {allTemplates ? 'Every card design' : 'The selected design'} ·{' '}
                  {characters.length
                    ? `current profile + ${characters.length} additional selections`
                    : 'current card themes'}{' '}
                  {allIsagiColorways ? '· both Isagi colorways ' : ''}· dark / light × wide /
                  compact.
                </p>
              </div>
            </div>
          </fieldset>
          {!ids.length && (
            <p className="field-hint" role="status">
              Select at least one component to export.
            </p>
          )}
          {pathError && (
            <p className="field-hint error-text" role="alert">
              {pathError} Update repository settings in README Builder.
            </p>
          )}
          <div className="code-heading">
            <div className="segmented">
              <button aria-pressed={tab === 'snippet'} onClick={() => setTab('snippet')}>
                Embed snippet
              </button>
              <button aria-pressed={tab === 'svg'} onClick={() => setTab('svg')}>
                Raw SVG
              </button>
              <button aria-pressed={tab === 'readme'} onClick={() => setTab('readme')}>
                Full README.md
              </button>
            </div>
            <button
              className="button"
              onClick={async () => {
                try {
                  await copyText(content);
                  notify(
                    tab === 'snippet'
                      ? 'Embed snippet copied.'
                      : tab === 'readme'
                        ? 'Complete README.md copied.'
                        : 'SVG code copied.',
                  );
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              <Copy size={13} />
              Copy
            </button>
          </div>
          <p className="field-hint">
            {tab === 'readme'
              ? 'Complete Blue Lock profile README for your GitHub account.'
              : tab === 'snippet'
                ? `${component.name} / ${template.name} / page ${page + 1}. Keep all four SVG variants.`
                : `${component.name} / ${template.name} / page ${page + 1} / ${theme} · ${layout}`}
          </p>
          <textarea
            className="code-content"
            aria-label={
              tab === 'snippet'
                ? 'Embed snippet code'
                : tab === 'readme'
                  ? 'Complete README.md code'
                  : 'Raw SVG code'
            }
            value={content}
            readOnly
            spellCheck={false}
          />
          <p className="field-hint">
            {tab === 'readme'
              ? 'Paste this directly into the README.md file in your profile repository.'
              : 'Copy the snippet into your existing README. Project and contact links stay outside the image so they remain clickable.'}
          </p>
        </div>
        <div className="modal-footer">
          <button className="button" disabled={busy} onClick={onClose}>
            Close
          </button>
          <button
            className="button"
            disabled={busy || !ids.length || !!pathError}
            onClick={async () => {
              if (busyRef.current) return;
              busyRef.current = true;
              setProgress(0);
              setBusy(true);
              try {
                parseConfig(config);
                const zip = await createProfileKitZip(
                  config,
                  { selectedCards: ids },
                  {
                    characters: characters.length ? characters : undefined,
                    allTemplates,
                    allIsagiColorways,
                    onProgress: setProgress,
                  },
                );
                const blob = await zip.generateAsync(
                  { type: 'blob', compression: 'DEFLATE' },
                  (metadata) => setProgress(70 + metadata.percent * 0.3),
                );
                downloadFile(blob, 'ego-striker-profile-kit.zip');
                notify(
                  'Full Profile Kit (.ZIP) downloaded with README.md, SVGs and install instructions.',
                );
              } catch (e) {
                notify((e as Error).message, true);
              } finally {
                busyRef.current = false;
                setBusy(false);
              }
            }}
          >
            <Package size={15} />
            <span>Profile Kit</span>
          </button>
          <button className="button primary" disabled={busy || !ids.length} onClick={download}>
            <Download size={15} />
            <span>{busy ? `Packing ${Math.round(progress)}%` : 'Download ZIP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
