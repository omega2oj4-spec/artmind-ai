/**
 * Metropolitan Museum of Art - public API integration.
 * No API key required. Docs: https://metmuseum.github.io/
 */

const MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1";

const CATEGORY_RULES = [
  ["Flower", /flower|floral|rose|lily|bloom|botanical|sunflower|garden/i],
  ["Landscape", /landscape|mountain|sea|river|sky|valley|view|sunset|forest|coast/i],
  ["Nature", /nature|tree|water|field|leaf|animal|bird|still.?life/i],
  ["Religious", /saint|christ|virgin|madonna|angel|church|cross|bible|holy|annunciation/i],
  ["Figurative", /portrait|figure|woman|man|girl|boy|lady|self.?portrait|child/i],
];

function deriveCategory(obj) {
  const text = [obj.title, obj.objectName, obj.classification, obj.medium, (obj.tags || []).map(t => t.term).join(" ")].join(" ");
  return CATEGORY_RULES.find(([, rule]) => rule.test(text))?.[0] || "Abstract";
}

function deriveSurface(medium = "") {
  if (/paper|watercolor/i.test(medium)) return "Paper";
  if (/wood|panel/i.test(medium)) return "Wood Panel";
  if (/board/i.test(medium)) return "Board";
  if (/canvas/i.test(medium)) return "Canvas";
  return "Other";
}

function deriveColorMedium(medium = "") {
  const match = String(medium).match(/oil|watercolor|acrylic|pastel|tempera|ink|gouache|charcoal/i);
  return match ? match[0].replace(/^./, (l) => l.toUpperCase()) : "Mixed Media";
}

function normalizeMetArtwork(obj) {
  if (!obj?.objectID || !obj.primaryImage || !obj.title) return null;
  if (!obj.isPublicDomain) return null;

  const medium = obj.medium || "Medium not recorded";
  const artist = obj.artistDisplayName || obj.artistDisplayBio || "Unknown Artist";
  const category = deriveCategory(obj);
  const style = obj.period || obj.dynasty || obj.classification || obj.objectName || "Unclassified";

  return {
    catalogId: `met-${obj.objectID}`,
    articId: null,
    title: obj.title.trim(),
    artist: artist.trim(),
    artistDetails: obj.artistDisplayBio || "",
    dateDisplay: obj.objectDate || "Undated",
    dateStart: obj.objectBeginDate ?? null,
    dateEnd: obj.objectEndDate ?? null,
    medium,
    description: obj.creditLine || "",
    imageUrl: obj.primaryImage,
    thumbnailUrl: obj.primaryImageSmall || obj.primaryImage,
    category,
    style,
    colorMedium: deriveColorMedium(medium),
    surface: deriveSurface(medium),
    tags: [category, style, deriveColorMedium(medium), deriveSurface(medium), ...((obj.tags || []).map(t => t.term))].filter(Boolean).slice(0, 20),
    sourceName: "The Metropolitan Museum of Art",
    sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
    department: obj.department || "",
    artworkType: obj.objectName || "",
    classification: obj.classification || "",
    placeOfOrigin: obj.country || obj.culture || "",
    dimensions: obj.dimensions || "",
    creditLine: obj.creditLine || "",
    isPublicDomain: true,
  };
}

/**
 * Fetch paintings from the Metropolitan Museum of Art.
 * Searches for the given query, then fetches full details for up to `limit` results.
 */
export async function fetchMetMuseumArtworks({ query = "painting", limit = 50 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const searchParams = new URLSearchParams({
      q: String(query || "painting").slice(0, 100),
      hasImages: "true",
      isPublicDomain: "true",
      type: "paintings",
    });

    const searchRes = await fetch(`${MET_BASE}/search?${searchParams}`, { signal: controller.signal });
    if (!searchRes.ok) throw new Error(`Met search returned ${searchRes.status}`);
    const searchBody = await searchRes.json();

    const objectIds = (searchBody.objectIDs || []).slice(0, limit);
    if (!objectIds.length) return [];

    const BATCH = 10;
    const results = [];

    for (let i = 0; i < objectIds.length; i += BATCH) {
      const batch = objectIds.slice(i, i + BATCH);
      const detailPromises = batch.map(async (id) => {
        try {
          const detailRes = await fetch(`${MET_BASE}/objects/${id}`, { signal: controller.signal });
          if (!detailRes.ok) return null;
          const obj = await detailRes.json();
          return normalizeMetArtwork(obj);
        } catch {
          return null;
        }
      });
      const batchResults = await Promise.all(detailPromises);
      results.push(...batchResults.filter(Boolean));
    }

    return results;
  } finally {
    clearTimeout(timeout);
  }
}
