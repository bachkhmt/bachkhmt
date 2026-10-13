import { useState } from 'react';

/** Use the exact generated badge and link, with a readable network-error fallback. */
export function BadgeImage({ markdown }: { markdown: string }) {
  const [failed, setFailed] = useState(false);
  const image = markdown.match(/!\[([^\]]*)\]\((https:\/\/img\.shields\.io\/[^)]+)\)/);
  if (!image) return null;
  const link = markdown.match(/\]\((?:<)?((?:https?:|mailto:)[^)>]+)(?:>)?\)$/)?.[1];
  const content = failed ? (
    <span className="badge-fallback">{image[1]} unavailable</span>
  ) : (
    <img src={image[2]} alt={image[1]} loading="lazy" onError={() => setFailed(true)} />
  );
  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
}
