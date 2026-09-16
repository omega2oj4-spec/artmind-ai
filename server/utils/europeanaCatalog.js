/**
 * Europeana API integration - European museum collections.
 * Free tier: 100 req/s, no auth needed for basic searches.
 * Docs: https://api.europeana.eu/
 *
 * Uses the public wskey "apidemo" which has liberal rate limits for demo use,
 * or EUROPEANA_API_KEY environment variable if provided.
 */

const EUROPEANA_BASE = "https://api.europeana.eu/record/v2/search.json";
const API_KEY = process.env.EUROPEANA_API_KEY || "apidemo";

const CATEGORY_RULES = [
  ["Flower", /flower|floral|rose|lily|bloom|botanical|sunflower|garden/i],
  ["Landscape", /landscape|mountain|sea|river|sky|valley|view|sunset|forest|coast/i],
  ["Nature", /nature|tree|water|field|leaf|animal|bird|still.?life/i],
  ["Religious", /saint|christ|virgin|madonna|angel|church|cross|bible|holy|annunciation/i],
  ["Figurative", /portrait|figure|woman|man|girl|boy|lady|self.?portrait|child/i],
];

function deriveCategory(item) {
  const text = [item.title?.[0], item.dcSubject?.join(" "), item.dcType?.join(" "), item.dcDescription?.join(" ")].filter(Boolean).join(" ");
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

function normalizeEuropeanaItem(item) {
  const title = item.title?.[0] || item.dcTitleLangAware?.en?.[0] || "";
  const imageUrl = item.edmIsShownBy?.[0] || item.edmPreview?.[0] || "";
  const thumbnailUrl = item.edmPreview?.[0] || imageUrl;

  if (!title || !imageUrl) return null;

  const artist = item.dcCreator?.[0] || item.edmAgentLabelLangAware?.en?.[0] || "Unknown Artist";
  const medium = item.dcMedium?.[0] || item.dcFormat?.[0] || "";
  const category = deriveCategory(item);
  const style = item.edmConceptLabelLangAware?.en?.[0] || item.dcType?.[0] || "Unclassified";
  const dateDisplay = item.year?.[0] || item.dcDate?.[0] || "Undated";
  const year = parseInt(dateDisplay, 10);

  return {
    catalogId: `europeana-${item.id?.replace(/\//g, "-").replace(/^-/, "")}`,
    articId: null,
    title: title.trim(),
    artist: String(artist).trim(),
    artistDetails: "",
    dateDisplay,
    dateStart: Number.isFinite(year) ? year : null,
    dateEnd: Number.isFinite(year) ? year : null,
    medium: medium || "Medium not recorded",
    description: item.dcDescription?.[0] || item.dcSubject?.join(", ") || "",
    imageUrl,
    thumbnailUrl,
    category,
    style,
    colorMedium: deriveColorMedium(medium),
    surface: deriveSurface(medium),
    tags: [
      category, style,
      deriveColorMedium(medium),
      ...(item.dcSubject || []),
      ...(item.dcType || [])
    ].filter(Boolean).slice(0, 20),
    sourceName: item.dataProvider?.[0] || "Europeana",
    sourceUrl: item.edmIsShownAt?.[0] || `https://www.europeana.eu/item${item.id}`,
    department: item.edmDatasetName?.[0] || "",
    artworkType: item.type || "IMAGE",
    classification: item.dcType?.[0] || "",
    placeOfOrigin: item.country?.[0] || "",
    dimensions: "",
    creditLine: item.edmRights?.[0] || "",
    isPublicDomain: true,
  };
}

/**
 * Fetch paintings from Europeana.
 * @param {{ query?: string, limit?: number }} options
 */
export async function fetchEuropeanaArtworks({ query = "painting", limit = 50 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const params = new URLSearchParams({
      wskey: API_KEY,
      query: `(${String(query || "painting").slice(0, 100)}) AND TYPE:IMAGE`,
      qf: "IMAGE_SIZE:LARGE",
      reusability: "open",
      media: "true",
      rows: String(Math.min(100, limit)),
      profile: "rich",
      sort: "score desc",
    });

    const res = await fetch(`${EUROPEANA_BASE}?${params}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Europeana API returned ${res.status}`);
    const body = await res.json();

    return (body.items || []).map(normalizeEuropeanaItem).filter(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}
