const AIC_API = 'https://api.artic.edu/api/v1/artworks/search';
const AIC_FIELDS = [
  'id', 'title', 'artist_title', 'artist_display', 'artist_id', 'date_display',
  'date_start', 'date_end', 'medium_display', 'description', 'image_id',
  'style_title', 'artwork_type_title', 'department_title', 'classification_title',
  'place_of_origin', 'dimensions', 'credit_line', 'is_public_domain', 'api_link',
  'thumbnail', 'term_titles'
].join(',');

const CATEGORY_RULES = [
  ['Flower', /flower|floral|rose|lily|bloom|botanical|sunflower|garden/i],
  ['Landscape', /landscape|mountain|sea|river|sky|valley|view|sunset|forest|coast/i],
  ['Nature', /nature|tree|water|field|leaf|animal|bird|still life/i],
  ['Religious', /saint|christ|virgin|madonna|angel|church|cross|bible|holy|annunciation/i],
  ['Figurative', /portrait|figure|woman|man|girl|boy|lady|self-portrait|child/i]
];

function stripHtml(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function deriveCategory(item) {
  const text = [item.title, item.style_title, item.medium_display, item.description, item.artwork_type_title, ...(item.term_titles || [])].join(' ');
  return CATEGORY_RULES.find(([, rule]) => rule.test(text))?.[0] || 'Abstract';
}

function deriveSurface(medium = '') {
  if (/paper|watercolor/i.test(medium)) return 'Paper';
  if (/wood|panel/i.test(medium)) return 'Wood Panel';
  if (/board/i.test(medium)) return 'Board';
  if (/canvas/i.test(medium)) return 'Canvas';
  return 'Other';
}

function deriveColorMedium(medium = '') {
  const match = String(medium).match(/oil|watercolor|acrylic|pastel|tempera|ink|gouache|charcoal/i);
  return match ? match[0].replace(/^./, (letter) => letter.toUpperCase()) : 'Mixed Media';
}

export function normalizeArtInstituteArtwork(item) {
  if (!item?.id || !item.image_id || !item.title) return null;
  const medium = stripHtml(item.medium_display) || 'Medium not recorded';
  const description = stripHtml(item.description);
  const artist = item.artist_title || String(item.artist_display || 'Unknown Artist').split('\n')[0].trim() || 'Unknown Artist';
  const category = deriveCategory(item);
  const style = item.style_title || item.classification_title || 'Unclassified';

  return {
    catalogId: `aic-${item.id}`,
    articId: item.id,
    title: item.title.trim(),
    artist,
    artistDetails: item.artist_display || '',
    dateDisplay: item.date_display || 'Undated',
    dateStart: item.date_start ?? null,
    dateEnd: item.date_end ?? null,
    medium,
    description,
    imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/1280,/0/default.jpg`,
    thumbnailUrl: item.thumbnail?.lqip || `https://www.artic.edu/iiif/2/${item.image_id}/full/400,/0/default.jpg`,
    category,
    style,
    colorMedium: deriveColorMedium(medium),
    surface: deriveSurface(medium),
    tags: [...new Set([category, style, deriveColorMedium(medium), deriveSurface(medium), ...(item.term_titles || [])].filter(Boolean))].slice(0, 20),
    sourceName: 'Art Institute of Chicago',
    sourceUrl: item.api_link || `https://www.artic.edu/artworks/${item.id}`,
    department: item.department_title || '',
    artworkType: item.artwork_type_title || '',
    classification: item.classification_title || '',
    placeOfOrigin: item.place_of_origin || '',
    dimensions: item.dimensions || '',
    creditLine: item.credit_line || '',
    isPublicDomain: Boolean(item.is_public_domain)
  };
}

/** Fetch a bounded page from AIC. No credentials are needed for its public API. */
export async function fetchArtInstituteArtworks({ query = 'painting', page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({
    q: String(query || 'painting').slice(0, 100),
    page: String(Math.max(1, Number(page) || 1)),
    limit: String(Math.min(100, Math.max(1, Number(limit) || 50))),
    fields: AIC_FIELDS
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${AIC_API}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Art Institute API returned ${response.status}`);
    const body = await response.json();
    return (body.data || []).map(normalizeArtInstituteArtwork).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Supplies compact source thumbnails for older catalog rows that were saved
 * before thumbnail metadata was added. This is intentionally batched so a
 * dashboard response remains one Art Institute request, not one per card.
 */
export async function hydrateArtInstituteThumbnails(paintings = []) {
  const sourcePaintings = paintings.filter((painting) => painting?.articId);
  if (!sourcePaintings.length) return paintings;

  const ids = [...new Set(sourcePaintings.map((painting) => painting.articId))].slice(0, 25);
  const params = new URLSearchParams({ ids: ids.join(','), fields: 'id,thumbnail,image_id' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.artic.edu/api/v1/artworks?${params}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Art Institute thumbnail request returned ${response.status}`);
    const body = await response.json();
    const sourceImages = new Map((body.data || []).map((item) => [Number(item.id), item]));
    const savePromises = [];
    for (const painting of sourcePaintings) {
      const sourceArtwork = sourceImages.get(Number(painting.articId));
      if (!sourceArtwork) continue;
      let changed = false;
      // Artwork IDs are stable while image identifiers can change. Always use
      // the current identifier returned by the authoritative artwork endpoint.
      if (sourceArtwork.image_id) {
        const freshUrl = `https://www.artic.edu/iiif/2/${sourceArtwork.image_id}/full/1280,/0/default.jpg`;
        if (painting.imageUrl !== freshUrl) {
          painting.imageUrl = freshUrl;
          changed = true;
        }
      }
      if (!painting.thumbnailUrl) {
        const thumbnailUrl = sourceArtwork.thumbnail?.lqip
          || (sourceArtwork.image_id ? `https://www.artic.edu/iiif/2/${sourceArtwork.image_id}/full/400,/0/default.jpg` : '');
        if (thumbnailUrl) {
          painting.thumbnailUrl = thumbnailUrl;
          changed = true;
        }
      }
      // Persist corrected URLs so stale image_ids in the DB are healed
      if (changed && typeof painting.save === 'function') {
        savePromises.push(painting.save().catch((err) => console.warn('[AICHydrate] save failed:', err.message)));
      }
    }
    await Promise.all(savePromises);
  } finally {
    clearTimeout(timeout);
  }
  return paintings;
}
