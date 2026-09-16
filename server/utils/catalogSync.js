import Painting from '../models/Painting.js';
import { getHomeArtworkById } from '../../src/data/homeArtworks.js';
import { isMongoId } from './paintingLookup.js';

const CATEGORIES = ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

export function sanitizeCatalogPayload(artwork) {
  const category = CATEGORIES.includes(artwork.category) ? artwork.category : 'Abstract';

  return {
    catalogId: artwork.catalogId || artwork.id,
    title: artwork.title || 'Untitled Artwork',
    artist: artwork.artist || 'Unknown Artist',
    artistDetails: artwork.artistDetails || '',
    dateDisplay: artwork.dateDisplay || 'Undated',
    dateStart: artwork.dateStart ?? null,
    dateEnd: artwork.dateEnd ?? null,
    medium: artwork.medium || `${artwork.colorMedium || 'Mixed media'} on ${artwork.surface || 'Canvas'}`,
    description: artwork.description || '',
    imageUrl: artwork.imageUrl || artwork.src || '',
    thumbnailUrl: artwork.thumbnailUrl || '',
    category,
    style: artwork.style || 'Modern Art',
    colorMedium: artwork.colorMedium || 'Oil',
    surface: artwork.surface || 'Canvas',
    popularity: Number(artwork.popularity) || 0,
    colorTheme: artwork.colorTheme || 'Neutral',
    tags: Array.isArray(artwork.tags) ? artwork.tags : [],
    sourceName: artwork.sourceName || '',
    sourceUrl: artwork.sourceUrl || '',
    articId: artwork.articId,
    department: artwork.department || '',
    artworkType: artwork.artworkType || '',
    classification: artwork.classification || '',
    placeOfOrigin: artwork.placeOfOrigin || '',
    dimensions: artwork.dimensions || '',
    creditLine: artwork.creditLine || '',
    isPublicDomain: Boolean(artwork.isPublicDomain),
    lastSyncedAt: new Date()
  };
}

export async function upsertCatalogPainting(artwork) {
  const payload = sanitizeCatalogPayload(artwork);
  if (!payload.catalogId || !payload.imageUrl) {
    return null;
  }

  const existing = await Painting.findOne({ catalogId: payload.catalogId });
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }

  return Painting.create(payload);
}

export async function findPaintingByAnyId(id) {
  if (!id) return null;

  if (isMongoId(id)) {
    const byId = await Painting.findById(id);
    if (byId) return byId;
  }

  const byCatalog = await Painting.findOne({ catalogId: id });
  if (byCatalog) return byCatalog;

  const local = getHomeArtworkById(id);
  if (!local) return null;

  return upsertCatalogPainting(local);
}

export async function findSimilarPaintings(painting, limit = 6) {
  if (!painting?._id) return [];

  return Painting.find({
    _id: { $ne: painting._id },
    $or: [
      { category: painting.category },
      { style: painting.style },
      { colorMedium: painting.colorMedium },
      { surface: painting.surface },
      { tags: { $in: painting.tags || [] } }
    ]
  }).limit(limit);
}

export async function resolveFavoritePaintings(favoriteIds = []) {
  const ids = (favoriteIds || []).map((id) => String(id)).filter(Boolean);
  if (!ids.length) return [];

  const objectIds = ids.filter(isMongoId);
  const paintings = await Painting.find({
    $or: [
      { _id: { $in: objectIds } },
      { catalogId: { $in: ids } }
    ]
  });

  const foundKeys = new Set(
    paintings.flatMap((painting) => [
      String(painting._id),
      painting.catalogId
    ].filter(Boolean))
  );

  for (const id of ids) {
    if (foundKeys.has(id) || isMongoId(id)) continue;
    const created = await findPaintingByAnyId(id);
    if (created) {
      paintings.push(created);
      foundKeys.add(String(created._id));
      if (created.catalogId) foundKeys.add(created.catalogId);
    }
  }

  return paintings;
}

export function canonicalFavoriteId(painting) {
  return painting.catalogId || String(painting._id);
}
