/**
 * Returns the image URL supplied by a catalogue record.
 *
 * Art Institute images are proxied by `proxyImageUrl` at render time where
 * needed; do not substitute unrelated static images, because each card must
 * represent the artwork returned by the source API.
 */
export function getArtworkImageUrl(painting) {
  return painting?.imageUrl || painting?.image_url || painting?.src || painting?.thumbnail || '';
}

/**
 * Category-keyed local fallback images (AI-generated, always available).
 * Used by PaintingCard when all remote image attempts fail.
 */
const CATEGORY_FALLBACKS = {
  Flower:     '/artworks/rec-floral-still-life.jpg',
  Nature:     '/artworks/rec-misty-mountains.jpg',
  Landscape:  '/artworks/rec-misty-mountains.jpg',
  Figurative: '/artworks/rec-baroque-portrait.jpg',
  Religious:  '/artworks/rec-baroque-portrait.jpg',
  Abstract:   '/artworks/rec-starry-abstract.jpg',
};

/**
 * Returns the best local fallback image for a painting based on its category.
 * Falls back to the generic artwork-fallback SVG if no category match.
 */
export function getLocalFallbackImage(painting) {
  return CATEGORY_FALLBACKS[painting?.category] || '/artwork-fallback.svg';
}
