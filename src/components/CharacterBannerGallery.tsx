import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTER_IDS, CHARACTER_THEMES } from '../characters/themes';
import { characterColorway, COLORWAY_LABELS } from '../characters/colorways';
import { COMPONENT_REGISTRY, svgDataUrl } from '../generator/svgGenerators';
import { cardSize, getCardTemplate } from '../templates/registry';
import { CharacterId, LayoutMode, ProfileConfig, ThemeMode } from '../types';
interface Props {
  config: ProfileConfig;
  theme: ThemeMode;
  layout: LayoutMode;
  onSelect: (character: CharacterId) => void;
}
function Banner({ config, theme, layout, onSelect, id }: Props & { id: CharacterId }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const lastSource = useRef<string | undefined>(undefined);
  const template = getCardTemplate('hero', config.cardTemplates?.hero);
  const [width, height] = cardSize('hero', layout, template.id, config);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '120px',
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const source = useMemo(() => {
    if (!visible) return lastSource.current;
    const preview = {
      ...config,
      animationLevel: 'none' as const,
      characterOverrides: { ...config.characterOverrides, hero: id },
    };
    lastSource.current = svgDataUrl(
      COMPONENT_REGISTRY.find((c) => c.id === 'hero')!.render(preview, theme, {
        layout,
        template: template.id,
      }),
    );
    return lastSource.current;
  }, [config, id, layout, theme, template.id, visible]);
  const active = (config.characterOverrides?.hero ?? config.character) === id,
    name = CHARACTER_THEMES[id].name;
  return (
    <button
      ref={ref}
      type="button"
      className={`character-banner-card${active ? ' is-selected' : ''}`}
      aria-label={`Use ${name} banner theme`}
      aria-pressed={active}
      onClick={() => onSelect(id)}
    >
      <span className="character-banner-label">
        <strong>
          {name}
          {id === 'isagi' && characterColorway(config, id) !== 'default'
            ? ` · ${COLORWAY_LABELS[characterColorway(config, id)]}`
            : ''}
        </strong>
        <span>{active ? 'Selected' : 'Use theme'}</span>
      </span>
      <img
        width={width}
        height={height}
        src={source}
        alt={`${name} ${template.name} banner preview`}
        loading="lazy"
        style={{ aspectRatio: `${width} / ${height}` }}
      />
    </button>
  );
}
export function CharacterBannerGallery(props: Props) {
  const config = useDeferredValue(props.config);
  return (
    <section className="character-banner-gallery" aria-labelledby="character-banner-heading">
      <div className="character-banner-heading">
        <p className="eyebrow">ALL CHARACTER THEMES</p>
        <h2 id="character-banner-heading">
          Character banners <span>{CHARACTER_IDS.length}</span>
        </h2>
        <p className="panel-description">
          Static previews of your current content in every character theme. Edits update visible
          banners automatically.
        </p>
      </div>
      <div className="character-banner-grid">
        {CHARACTER_IDS.map((id) => (
          <Banner key={id} {...props} config={config} id={id} />
        ))}
      </div>
    </section>
  );
}
