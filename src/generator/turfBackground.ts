import { TRANSFER_TURF_IMAGE } from '../artwork/transferTurf';

/** The supplied photograph sits only at the card's bottom; its white sky is clipped away. */
export function turfBackground(uid: string, width: number, height: number, y: number) {
  const sourceClip = `${uid}-turf-source`;
  const viewportClip = `${uid}-turf-viewport`;
  return `<g data-transfer-turf="true" data-turf-width="${width}" data-turf-height="${height}" data-turf-y="${y}" data-decoration="true" aria-hidden="true">
    <defs><clipPath id="${sourceClip}" clipPathUnits="userSpaceOnUse"><rect x="0" y="225" width="640" height="134"/><circle cx="194" cy="230" r="23"/></clipPath><clipPath id="${viewportClip}" clipPathUnits="userSpaceOnUse"><rect x="0" y="${y}" width="${width}" height="${height}"/></clipPath></defs>
    <g clip-path="url(#${viewportClip})"><g transform="translate(0 ${y}) scale(${width / 640}) translate(0 -205)">
      <image data-transfer-turf-image="true" width="640" height="359" href="${TRANSFER_TURF_IMAGE}" clip-path="url(#${sourceClip})"/>
    </g></g>
  </g>`;
}
