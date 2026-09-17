// server/utils/smartSearch.js

const STOP_WORDS = new Set([
  'show', 'find', 'me', 'with', 'the', 'a', 'an', 'in', 'of', 'on',
  'for', 'to', 'from', 'some', 'all', 'any', 'give', 'get', 'looking',
  'look', 'want', 'search', 'searching', 'picture', 'pictures', 'image',
  'images', 'art', 'artwork', 'artworks', 'painting', 'paintings',
  'theme', 'themes', 'type', 'types', 'please', 'can', 'you', 'that',
  'this', 'and', 'or', 'about', 'like', 'similar', 'related', 'using',
  'used', 'made', 'by', 'is', 'are', 'was', 'were', 'be', 'been',
  'which', 'where', 'what', 'how', 'some'
]);

const SYNONYMS = {
  flower: ['flower', 'flowers', 'floral', 'botanical', 'bloom', 'blooms', 'garden'],
  flowers: ['flower', 'flowers', 'floral', 'botanical', 'bloom', 'blooms', 'garden'],

  mountain: ['mountain', 'mountains', 'mount', 'alps', 'peak', 'peaks'],
  mountains: ['mountain', 'mountains', 'mount', 'alps', 'peak', 'peaks'],

  winter: ['winter', 'snow', 'snowy', 'ice', 'icy', 'frost', 'frozen'],
  snowy: ['snow', 'snowy', 'winter', 'frost', 'frozen'],

  rain: ['rain', 'rainy', 'rainfall', 'storm', 'wet'],
  rainy: ['rain', 'rainy', 'rainfall', 'storm', 'wet'],

  peaceful: ['peaceful', 'peace', 'calm', 'calming', 'serene', 'serenity', 'tranquil'],
  calm: ['calm', 'peaceful', 'serene', 'tranquil', 'quiet'],
  lonely: ['lonely', 'loneliness', 'solitary', 'isolation', 'isolated', 'alone'],

  nature: ['nature', 'natural', 'landscape', 'scenery', 'outdoors'],
  landscape: ['landscape', 'scenery', 'nature', 'view', 'vista'],

  flower: ['flower', 'floral', 'botanical', 'garden', 'bloom'],
  floral: ['flower', 'floral', 'botanical', 'garden', 'bloom'],

  japanese: ['japanese', 'japan', 'japanesque'],
  japan: ['japan', 'japanese', 'japanesque'],

  religious: ['religious', 'religion', 'christian', 'christ', 'saint', 'sacred', 'holy'],
  religion: ['religion', 'religious', 'christian', 'christ', 'saint', 'sacred', 'holy'],

  portrait: ['portrait', 'portraits', 'figure', 'figurative'],
  woman: ['woman', 'women', 'female', 'lady'],
  man: ['man', 'men', 'male'],
  city: ['city', 'cities', 'urban', 'town', 'street'],
  cities: ['city', 'cities', 'urban', 'town', 'street'],

  blue: ['blue', 'azure', 'cobalt', 'indigo', 'navy'],
  red: ['red', 'crimson', 'scarlet'],
  yellow: ['yellow', 'gold', 'golden'],
  green: ['green', 'emerald', 'olive'],
  purple: ['purple', 'violet', 'lavender'],
  orange: ['orange', 'amber'],
  black: ['black', 'dark'],
  white: ['white', 'ivory'],
  brown: ['brown', 'earth', 'earthy'],

  impressionism: ['impressionism', 'impressionist'],
  postimpressionism: ['post-impressionism', 'postimpressionism'],
  surrealism: ['surrealism', 'surrealist'],
  realism: ['realism', 'realist'],
  abstract: ['abstract', 'abstraction'],
  baroque: ['baroque'],
  romanticism: ['romanticism', 'romantic'],
  expressionism: ['expressionism', 'expressionist'],

  oil: ['oil', 'oil painting', 'oil on canvas'],
  watercolor: ['watercolor', 'watercolour'],
  acrylic: ['acrylic'],
  pastel: ['pastel'],
  ink: ['ink'],
  charcoal: ['charcoal'],
  canvas: ['canvas'],
  paper: ['paper']
};

const FIELD_WEIGHTS = {
  title: 14,
  artist: 12,
  category: 10,
  style: 9,
  medium: 8,
  colorTheme: 8,
  colorMedium: 7,
  surface: 5,
  tags: 9,
  description: 5,
  paintingType: 6,
  placeOfOrigin: 5
};

export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fieldToText(value) {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map(item => normalizeText(item))
      .join(' ');
  }

  return normalizeText(value || '');
}

export function tokenizeQuery(query = '') {
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => word.length >= 2);
}

export function expandTerms(terms = []) {
  const expanded = new Set();

  for (const rawTerm of terms) {
    const term = normalizeText(rawTerm);

    if (!term || STOP_WORDS.has(term)) {
      continue;
    }

    expanded.add(term);

    const synonyms = SYNONYMS[term];

    if (synonyms) {
      for (const synonym of synonyms) {
        expanded.add(normalizeText(synonym));
      }
    }

    // Simple singular/plural support.
    if (term.endsWith('ies') && term.length > 4) {
      expanded.add(`${term.slice(0, -3)}y`);
    }

    if (term.endsWith('s') && term.length > 3) {
      expanded.add(term.slice(0, -1));
    }
  }

  return [...expanded].filter(Boolean);
}

export function getSearchTerms(query, parsed = null) {
  const queryTerms = tokenizeQuery(query);

  const parsedTerms = [
    ...(Array.isArray(parsed?.keywords) ? parsed.keywords : []),
    ...(Array.isArray(parsed?.styles) ? parsed.styles : []),
    ...(Array.isArray(parsed?.colors) ? parsed.colors : []),
    parsed?.category,
    parsed?.medium,
    parsed?.surface
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(/\s+/))
    .map(normalizeText)
    .filter(Boolean);

  return expandTerms([
    ...queryTerms,
    ...parsedTerms
  ]);
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSmartSearchFilter(query, parsed = null) {
  const terms = getSearchTerms(query, parsed);

  if (!terms.length) {
    return {};
  }

  const regexes = terms.map(
    term => new RegExp(escapeRegex(term), 'i')
  );

  return {
    $or: [
      { title: { $in: regexes } },
      { artist: { $in: regexes } },
      { category: { $in: regexes } },
      { style: { $in: regexes } },
      { medium: { $in: regexes } },
      { colorTheme: { $in: regexes } },
      { colorMedium: { $in: regexes } },
      { surface: { $in: regexes } },
      { paintingType: { $in: regexes } },
      { tags: { $in: regexes } },
      { description: { $in: regexes } },
      { placeOfOrigin: { $in: regexes } }
    ]
  };
}

function scoreField(fieldValue, term, weight) {
  const text = fieldToText(fieldValue);
  const normalizedTerm = normalizeText(term);

  if (!text || !normalizedTerm) {
    return 0;
  }

  let score = 0;

  if (text === normalizedTerm) {
    score += weight * 3;
  }

  if (text.includes(normalizedTerm)) {
    score += weight * 1.5;
  }

  const words = text.split(/\s+/);

  if (words.includes(normalizedTerm)) {
    score += weight;
  }

  if (
    normalizedTerm.length >= 4 &&
    words.some(
      word =>
        word.startsWith(normalizedTerm) ||
        normalizedTerm.startsWith(word)
    )
  ) {
    score += weight * 0.6;
  }

  return score;
}

export function calculateRelevanceScore(
  painting,
  query,
  parsed = null
) {
  const terms = getSearchTerms(query, parsed);

  let score = 0;

  for (const term of terms) {
    score += scoreField(
      painting.title,
      term,
      FIELD_WEIGHTS.title
    );

    score += scoreField(
      painting.artist,
      term,
      FIELD_WEIGHTS.artist
    );

    score += scoreField(
      painting.category,
      term,
      FIELD_WEIGHTS.category
    );

    score += scoreField(
      painting.style,
      term,
      FIELD_WEIGHTS.style
    );

    score += scoreField(
      painting.medium,
      term,
      FIELD_WEIGHTS.medium
    );

    score += scoreField(
      painting.colorTheme,
      term,
      FIELD_WEIGHTS.colorTheme
    );

    score += scoreField(
      painting.colorMedium,
      term,
      FIELD_WEIGHTS.colorMedium
    );

    score += scoreField(
      painting.surface,
      term,
      FIELD_WEIGHTS.surface
    );

    score += scoreField(
      painting.tags,
      term,
      FIELD_WEIGHTS.tags
    );

    score += scoreField(
      painting.description,
      term,
      FIELD_WEIGHTS.description
    );

    score += scoreField(
      painting.paintingType,
      term,
      FIELD_WEIGHTS.paintingType
    );

    score += scoreField(
      painting.placeOfOrigin,
      term,
      FIELD_WEIGHTS.placeOfOrigin
    );
  }

  // Reward exact phrase matches.
  const normalizedQuery = normalizeText(query);

  if (normalizedQuery.length >= 3) {
    const searchableFields = [
      painting.title,
      painting.artist,
      painting.category,
      painting.style,
      painting.medium,
      painting.colorTheme,
      painting.colorMedium,
      painting.surface,
      painting.paintingType,
      painting.placeOfOrigin,
      ...(Array.isArray(painting.tags)
        ? painting.tags
        : []),
      painting.description
    ]
      .filter(Boolean)
      .map(fieldToText);

    for (const field of searchableFields) {
      if (field.includes(normalizedQuery)) {
        score += 25;
      }
    }
  }

  // Parsed AI criteria receive additional weight when available.
  if (parsed) {
    if (
      parsed.category &&
      fieldToText(painting.category).includes(
        normalizeText(parsed.category)
      )
    ) {
      score += 25;
    }

    if (
      parsed.medium &&
      fieldToText(painting.medium).includes(
        normalizeText(parsed.medium)
      )
    ) {
      score += 20;
    }

    if (
      parsed.surface &&
      fieldToText(painting.surface).includes(
        normalizeText(parsed.surface)
      )
    ) {
      score += 15;
    }

    if (
      Array.isArray(parsed.styles) &&
      parsed.styles.some(style =>
        fieldToText(painting.style).includes(
          normalizeText(style)
        )
      )
    ) {
      score += 20;
    }

    if (
      Array.isArray(parsed.colors) &&
      parsed.colors.some(color =>
        fieldToText(
          `${painting.colorTheme || ''} ${painting.colorMedium || ''}`
        ).includes(normalizeText(color))
      )
    ) {
      score += 20;
    }
  }

  // Popular artworks get only a small tie-break bonus.
  const popularity = Number(
    painting.popularity || 0
  );

  if (popularity > 0) {
    score += Math.min(popularity / 100, 10);
  }

  return score;
}

export function rankPaintings(
  paintings = [],
  query = '',
  parsed = null,
  limit = 100
) {
  return paintings
    .map(painting => ({
      painting,
      relevanceScore: calculateRelevanceScore(
        painting,
        query,
        parsed
      )
    }))
    .filter(item => item.relevanceScore > 0)
    .sort((a, b) => {
      if (
        b.relevanceScore !==
        a.relevanceScore
      ) {
        return (
          b.relevanceScore -
          a.relevanceScore
        );
      }

      return (
        Number(b.painting.popularity || 0) -
        Number(a.painting.popularity || 0)
      );
    })
    .slice(0, limit)
    .map(item => {
      const painting =
        item.painting?.toObject
          ? item.painting.toObject()
          : item.painting;

      return {
        ...painting,
        relevanceScore:
          Math.round(
            item.relevanceScore * 100
          ) / 100
      };
    });
}

export async function smartSearch({
  Painting,
  query,
  parsed = null,
  limit = 100
}) {
  if (!Painting) {
    throw new Error(
      'smartSearch requires the Painting model.'
    );
  }

  const trimmedQuery = String(
    query || ''
  ).trim();

  if (!trimmedQuery) {
    return [];
  }

  const filter = buildSmartSearchFilter(
    trimmedQuery,
    parsed
  );

  let candidates = [];

  if (Object.keys(filter).length > 0) {
    candidates = await Painting.find(filter)
      .limit(500);
  }

  return rankPaintings(
    candidates,
    trimmedQuery,
    parsed,
    limit
  );
}