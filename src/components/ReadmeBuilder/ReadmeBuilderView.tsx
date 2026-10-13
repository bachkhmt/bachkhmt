import { useState, useMemo, useRef } from 'react';
import {
  Copy,
  Download,
  Eye,
  FileCode,
  Package,
  Layers,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Check,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { ComponentId, LayoutMode, ProfileConfig, ThemeMode } from '../../types';
import { COMPONENT_REGISTRY, svgDataUrl } from '../../generator/svgGenerators';
import {
  generateFullReadme,
  TEMPLATE_DEFINITIONS,
  ProfileReadmeSettings,
  DEFAULT_README_SETTINGS,
  generateBlueLockBadges,
  generateSocialBadges,
  resolveReadmeSettings,
  readmePathError,
  buildReadmeSections,
  buildReadmeQuote,
} from '../../readme';
import { createProfileKitZip } from '../../generator/exportZip';
import { copyText, downloadFile } from '../../browserIO';
import { BadgeImage } from '../BadgeImage';
import { useReducedMotion } from '../useReducedMotion';

interface Props {
  config: ProfileConfig;
  theme: ThemeMode;
  layout: LayoutMode;
  onChange: (next: ProfileConfig | ((c: ProfileConfig) => ProfileConfig)) => void;
  notify: (message: string, error?: boolean) => void;
  onExit: () => void;
}

export function ReadmeBuilderView({ config, theme, layout, onChange, notify, onExit }: Props) {
  const reducedMotion = useReducedMotion();
  const renderConfig = useMemo(
    () => (reducedMotion ? { ...config, animationLevel: 'none' as const } : config),
    [config, reducedMotion],
  );
  const settings = useMemo(() => resolveReadmeSettings(config), [config]);
  const pathError = readmePathError(settings);
  const sections = useMemo(() => buildReadmeSections(config, settings), [config, settings]);
  const quote = buildReadmeQuote(config, settings);
  const [mobilePanel, setMobilePanel] = useState<'preview' | 'settings'>('preview');
  const exportingRef = useRef(false);
  const [progress, setProgress] = useState(0);

  const [viewMode, setViewMode] = useState<'visual' | 'markdown'>('visual');
  const [isExporting, setIsExporting] = useState(false);

  // Sync settings into config when modified
  const updateSettings = (updates: Partial<ProfileReadmeSettings>) => {
    const next = { ...settings, ...updates };
    const { egoWeapon, nelRank, currentBid, ...readmeSettings } = next;
    onChange((prev) => ({
      ...prev,
      egoWeapon: next.egoWeapon,
      nelRank: next.nelRank,
      currentBid: next.currentBid,
      readmeSettings,
    }));
  };

  const markdown = useMemo(() => {
    return pathError ? '' : generateFullReadme(config, settings);
  }, [config, settings]);

  const badges = useMemo(() => {
    return generateBlueLockBadges(config, settings);
  }, [config, settings]);

  const socialBadges = useMemo(() => {
    return generateSocialBadges(config);
  }, [config]);

  // Apply a template layout
  const applyTemplate = (key: ProfileReadmeSettings['template']) => {
    const tmpl = TEMPLATE_DEFINITIONS[key];
    if (!tmpl) return;
    updateSettings({
      template: key,
      selectedCards: [...tmpl.defaultCards],
    });
    notify(`Applied "${tmpl.name}" layout.`);
  };

  // Move card up/down in lineup
  const moveCard = (index: number, direction: 'up' | 'down') => {
    const cards = [...settings.selectedCards];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= cards.length) return;
    const temp = cards[index];
    cards[index] = cards[target];
    cards[target] = temp;
    updateSettings({ selectedCards: cards });
  };

  const toggleCard = (id: ComponentId) => {
    const current = settings.selectedCards;
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    updateSettings({ selectedCards: next });
  };

  const handleCopyMarkdown = async () => {
    try {
      await copyText(markdown);
      notify('Complete README.md copied! Ready to paste into GitHub.');
    } catch (e) {
      notify((e as Error).message, true);
    }
  };

  const handleDownloadMarkdown = () => {
    downloadFile(markdown, 'README.md', 'text/markdown;charset=utf-8');
    notify('README.md downloaded.');
  };

  const handleDownloadKit = async () => {
    if (exportingRef.current || !settings.selectedCards.length || pathError) return;
    exportingRef.current = true;
    setProgress(0);
    setIsExporting(true);
    try {
      const zip = await createProfileKitZip(config, settings, { onProgress: setProgress });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (metadata) =>
        setProgress(70 + metadata.percent * 0.3),
      );
      downloadFile(blob, 'ego-striker-profile-kit.zip');
      notify('Full Profile Kit downloaded! Extract directly into your profile repo.');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      exportingRef.current = false;
      setIsExporting(false);
    }
  };

  return (
    <div className="readme-builder-container">
      {/* Top action header */}
      <div className="readme-builder-header">
        <div className="builder-title-group">
          <p className="eyebrow">
            BLUE LOCK PROFILE GENERATOR <span className="live-dot" />
          </p>
          <h2>GitHub Profile README Builder</h2>
          <p className="panel-description">
            Customize, preview, and export a complete Blue Lock themed README.md for your profile
            repository.
          </p>
        </div>

        <div className="builder-actions">
          <div className="segmented" aria-label="Preview mode">
            <button
              aria-pressed={viewMode === 'visual'}
              onClick={() => setViewMode('visual')}
              title="Visual preview"
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>
            <button
              aria-pressed={viewMode === 'markdown'}
              onClick={() => setViewMode('markdown')}
              title="Markdown code"
            >
              <FileCode size={14} />
              <span>Markdown</span>
            </button>
          </div>

          <button
            className="button"
            disabled={!!pathError}
            onClick={handleCopyMarkdown}
            title="Copy full README markdown"
          >
            <Copy size={14} />
            <span>Copy README</span>
          </button>

          <button
            className="button"
            disabled={!!pathError}
            onClick={handleDownloadMarkdown}
            title="Download README.md"
          >
            <Download size={14} />
            <span>Download .md</span>
          </button>

          <button
            className="button primary"
            onClick={handleDownloadKit}
            disabled={isExporting || !!pathError || !settings.selectedCards.length}
            title="Download README, SVGs, configuration and install instructions"
          >
            <Package size={14} />
            <span>{isExporting ? `Packaging ${Math.round(progress)}%` : 'Export Profile Kit'}</span>
          </button>
        </div>
      </div>

      {/* Main split view: Preview on left, Settings on right */}
      <nav className="builder-mobile-tabs" aria-label="README panels">
        <button aria-pressed={mobilePanel === 'preview'} onClick={() => setMobilePanel('preview')}>
          README preview
        </button>
        <button
          aria-pressed={mobilePanel === 'settings'}
          onClick={() => setMobilePanel('settings')}
        >
          README settings
        </button>
      </nav>
      <div className="readme-builder-workspace">
        {/* Left Side: GitHub Markdown Preview */}
        <div
          className={`readme-preview-scroll-pane ${mobilePanel === 'preview' ? 'mobile-active' : ''}`}
        >
          {viewMode === 'visual' ? (
            <div className={`github-mockup-frame ${theme}`}>
              <div className="github-mockup-header">
                <span className="github-file-pill">
                  🐱 {settings.repoPath || (config.socials.github ? `${config.socials.github}/${config.socials.github}` : 'your-profile')} /
                  README.md
                </span>
                <span className="github-mode-tag">
                  Theme: {theme.toUpperCase()} · Mode: {settings.embedMode.toUpperCase()}
                </span>
              </div>

              {/* Rendered GitHub content */}
              <div className={`github-rendered-content align-${settings.align}`}>
                {/* Badges block */}
                {settings.showBadges && (
                  <div className="preview-badges-row">
                    {badges.map((b) => (
                      <BadgeImage key={b} markdown={b} />
                    ))}
                  </div>
                )}
                {settings.showBadges && socialBadges.length > 0 && (
                  <div className="preview-badges-row social-row">
                    {socialBadges.map((b) => (
                      <BadgeImage key={b} markdown={b} />
                    ))}
                  </div>
                )}

                {/* Ego Philosophy Quote Block */}
                {settings.showQuote && (
                  <div className="preview-quote-block">
                    <h4>⚽ EGO PROTOCOL // THE WINNING FORMULA</h4>
                    <p className="quote-text">
                      <em>
                        "In the realm of engineering, only the striker with clear vision and
                        relentless execution devours the opposition."
                      </em>
                    </p>
                    <p className="philosophy-text">
                      <b>PHILOSOPHY:</b> {quote.philosophy}
                    </p>
                    <div className="quote-meta">
                      <span>
                        ⚡ <b>WEAPON:</b> <code>{quote.weapon}</code>
                      </span>
                      <span>
                        🏆 <b>CLUB:</b> <code>{quote.club}</code> | <b>JERSEY:</b>{' '}
                        <code>{quote.jersey}</code> | <b>BID:</b> <code>{quote.bid}</code>
                      </span>
                    </div>
                  </div>
                )}

                {/* Rendered Selected Cards */}
                {!settings.selectedCards.length && (
                  <p className="empty-state" role="status">
                    Select cards in README settings to build your lineup.
                  </p>
                )}
                {sections.map((section) => {
                  const comp = COMPONENT_REGISTRY.find((c) => c.id === section.id)!;
                  return (
                    <section key={section.id} className="preview-readme-section">
                      <h3 className="card-item-tag">⚡ {section.title}</h3>
                      {section.pages.map(({ page, links }) => (
                        <div key={page} className="preview-card-item">
                          <div
                            className="card-image-wrap"
                            style={{ maxWidth: comp.baseSize?.[layout][0] }}
                          >
                            <img
                              src={svgDataUrl(comp.render(renderConfig, theme, { layout, page }))}
                              alt={`${comp.name} · page ${page + 1}`}
                              loading="lazy"
                              className="component-image"
                            />
                          </div>
                          {links.length > 0 && (
                            <div className="preview-card-links">
                              {links.map((link) => (
                                <a
                                  key={link.url}
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {link.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </section>
                  );
                })}

                {/* Profile Footer Note */}
                <div className="preview-footer-note">
                  <hr />
                  <p>
                    <sub>
                      Generated with ⚽ <b>Ego Striker Component Studio</b> — Blue Lock Inspired
                      GitHub Profile Kit.
                    </sub>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="markdown-raw-editor">
              <div className="markdown-editor-toolbar">
                <span>README.md — GFM (GitHub Flavored Markdown)</span>
                <button className="button small" onClick={handleCopyMarkdown}>
                  <Copy size={13} /> Copy Code
                </button>
              </div>
              <textarea
                className="markdown-textarea"
                aria-label="README Markdown"
                value={pathError ?? markdown}
                readOnly
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Right Side: Configuration Sidebar */}
        <div
          aria-busy={isExporting}
          className={`readme-config-sidebar ${mobilePanel === 'settings' ? 'mobile-active' : ''}`}
        >
          <fieldset disabled={isExporting} className="builder-settings-fields">
            {/* Template Selectors */}
            <div className="config-group">
              <h3>
                <Layers size={16} /> Formation Template
              </h3>
              <div className="template-cards-grid">
                {(Object.keys(TEMPLATE_DEFINITIONS) as ProfileReadmeSettings['template'][]).map(
                  (key) => {
                    const t = TEMPLATE_DEFINITIONS[key];
                    const active = settings.template === key;
                    return (
                      <button
                        key={key}
                        className={`template-button ${active ? 'active' : ''}`}
                        aria-pressed={active}
                        onClick={() => applyTemplate(key)}
                      >
                        <div className="template-btn-header">
                          <strong>{t.name}</strong>
                          {active && <Check size={14} className="check-icon" />}
                        </div>
                        <small>{t.tagline}</small>
                        <p>{t.description}</p>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Embed Mode */}
            <div className="config-group">
              <h3>
                <ExternalLink size={16} /> Asset Embed Mode
              </h3>
              <label className="field">
                <span>Image Asset Source</span>
                <select
                  aria-label="Image Asset Source"
                  value={settings.embedMode}
                  onChange={(e) =>
                    updateSettings({
                      embedMode: e.target.value as ProfileReadmeSettings['embedMode'],
                    })
                  }
                >
                  <option value="relative">
                    Relative path (assets/ego-striker/...) — Recommended
                  </option>
                  <option value="raw">
                    Raw GitHub (raw.githubusercontent.com/...) — Mobile-ready
                  </option>
                  <option value="jsdelivr">
                    jsDelivr CDN (cdn.jsdelivr.net/...) — Global speed
                  </option>
                </select>
              </label>
              {pathError && (
                <p className="field-hint error-text" role="alert">
                  {pathError}
                </p>
              )}
              <label className="field">
                <span>Content alignment</span>
                <select
                  aria-label="Content alignment"
                  value={settings.align}
                  onChange={(e) => updateSettings({ align: e.target.value as 'center' | 'left' })}
                >
                  <option value="center">Center</option>
                  <option value="left">Left</option>
                </select>
              </label>
              <p className="field-hint">
                Relative paths require committing `assets/ego-striker/` into the same repo root as
                your README.
              </p>
            </div>

            {/* Profile Identity & Repo Info */}
            <div className="config-group">
              <h3>
                <Shield size={16} /> Repository & Branch
              </h3>
              <label className="field">
                <span>GitHub Repo Path</span>
                <input
                  value={settings.repoPath}
                  placeholder="username/username"
                  onChange={(e) => updateSettings({ repoPath: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Branch</span>
                <input
                  value={settings.branch}
                  placeholder="main"
                  onChange={(e) => updateSettings({ branch: e.target.value })}
                />
              </label>
            </div>

            {/* Blue Lock Attributes */}
            <div className="config-group">
              <h3>
                <Sparkles size={16} /> Ego Weapon & NEL Spec
              </h3>
              <label className="field">
                <span>Core Weapon Formula</span>
                <input
                  value={settings.egoWeapon ?? ''}
                  placeholder="Metavision Spatial Awareness × Direct Volley Execution"
                  onChange={(e) => updateSettings({ egoWeapon: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Egoist NEL Rank</span>
                <input
                  value={settings.nelRank ?? ''}
                  placeholder="RANK #1 · S-TIER 98"
                  onChange={(e) => updateSettings({ nelRank: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Transfer Market Bid</span>
                <input
                  value={settings.currentBid ?? ''}
                  placeholder="¥300,000,000"
                  onChange={(e) => updateSettings({ currentBid: e.target.value })}
                />
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={settings.showBadges}
                  onChange={(e) => updateSettings({ showBadges: e.target.checked })}
                />
                Show Blue Lock & Social Badges
              </label>
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={settings.showQuote}
                  onChange={(e) => updateSettings({ showQuote: e.target.checked })}
                />
                Show Ego Philosophy & Weapon Quote
              </label>
            </div>

            {/* Card Lineup Ordering */}
            <div className="config-group">
              <h3>
                <Layers size={16} /> Card Lineup & Order
              </h3>
              <p className="field-hint">
                Select cards to include and order them to compose your README flow:
              </p>
              <div className="card-order-list">
                {[
                  ...settings.selectedCards,
                  ...COMPONENT_REGISTRY.map((c) => c.id).filter(
                    (id) => !settings.selectedCards.includes(id),
                  ),
                ]
                  .map((id) => COMPONENT_REGISTRY.find((c) => c.id === id)!)
                  .map((c) => {
                    const active = settings.selectedCards.includes(c.id);
                    const index = settings.selectedCards.indexOf(c.id);

                    return (
                      <div key={c.id} className={`card-order-row ${active ? 'is-active' : ''}`}>
                        <label className="card-check-label">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleCard(c.id)}
                          />
                          <span>
                            {active ? `${index + 1}. ` : ''}
                            {c.name}
                          </span>
                        </label>

                        {active && (
                          <div className="order-btn-group">
                            <button
                              className="icon-button micro"
                              disabled={index <= 0}
                              onClick={() => moveCard(index, 'up')}
                              title="Move up"
                              aria-label={`Move ${c.name} up`}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              className="icon-button micro"
                              disabled={index >= settings.selectedCards.length - 1}
                              onClick={() => moveCard(index, 'down')}
                              title="Move down"
                              aria-label={`Move ${c.name} down`}
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
