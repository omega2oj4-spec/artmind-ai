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
