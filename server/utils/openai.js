import OpenAI from 'openai';

// The chat service uses the OpenAI API directly. The previous Gemini endpoint
// was configured with a placeholder key, so every chat request failed before a
// response could be generated.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

const PORTAL_DESTINATIONS = [
  { path: '/gallery', label: 'Open Gallery', terms: ['gallery', 'browse collection'] },
  { path: '/search', label: 'Open Search', terms: ['search'] },
  { path: '/dashboard', label: 'Open Dashboard', terms: ['dashboard', 'saved', 'favorites', 'profile'] },
  { path: '/ai-vision', label: 'Open AI Vision', terms: ['ai vision', 'analyse', 'analyze', 'upload painting', 'identify artwork'] },
  { path: '/analytics', label: 'Open Analytics', terms: ['analytics', 'trending', 'insights'] }
];

const CHAT_STOP_WORDS = new Set([
  'about', 'please', 'would', 'could', 'show', 'with', 'that', 'this', 'what',
  'have', 'like', 'some', 'paintings', 'painting', 'artwork', 'artworks', 'color',
  'colours', 'colors', 'themes', 'theme', 'related', 'suitable', 'collection',
  'collections', 'help', 'tell', 'explain', 'want', 'looking', 'need', 'from'
]);

const CHAT_SYNONYMS = {
  blue: ['blue', 'azure', 'navy', 'indigo', 'cobalt'],
  abstract: ['abstract'],
  modern: ['modern', 'contemporary'],
  impressionism: ['impressionism', 'impressionist'],
  landscape: ['landscape', 'nature'],
  flower: ['flower', 'floral', 'flowers'],
  portrait: ['portrait', 'figurative']
};

const COLOR_TERMS = new Set([
  'blue', 'azure', 'navy', 'indigo', 'cobalt', 'red', 'yellow', 'green',
  'purple', 'orange', 'pink', 'gold', 'black', 'white', 'brown'
]);

export function findPortalDestination(message) {
  const query = String(message || '').toLowerCase();

  const wantsNavigation = /(open|go to|take me|navigate|where is|how do i (get|open|find)|take me to)/.test(query);

  if (!wantsNavigation) {
    return null;
  }

  const destination = PORTAL_DESTINATIONS.find(({ terms }) =>
    terms.some(term => query.includes(term))
  );

  return destination
    ? { path: destination.path, label: destination.label }
    : null;
}

export function findCatalogMatches(message, catalogContext, limit = 4) {
  const rawTerms = String(message || '')
    .toLowerCase()
    .match(/[a-z]{3,}/g) || [];

  const terms = [...new Set(
    rawTerms.flatMap(term => {
      if (CHAT_STOP_WORDS.has(term)) return [];
      return CHAT_SYNONYMS[term] || [term];
    })
  )];

  if (!terms.length) return [];

  return catalogContext
    .map((painting) => {
      const searchable = [
        painting.title,
        painting.artist,
        painting.category,
        painting.style,
        painting.medium,
        painting.colorMedium,
        painting.colorTheme,
        ...(painting.tags || [])
      ].join(' ').toLowerCase();

      let score = terms.reduce((total, term) => {
        if (!searchable.includes(term)) return total;
        let points = 1;
        if (String(painting.category || '').toLowerCase().includes(term)) points += 2;
        if (String(painting.style || '').toLowerCase().includes(term)) points += 2;
        if (String(painting.colorTheme || '').toLowerCase().includes(term)) points += 2;
        if (String(painting.title || '').toLowerCase().includes(term)) points += 2;
        if ((painting.tags || []).some(tag => String(tag).toLowerCase().includes(term))) points += 1;
        return total + points;
      }, 0);

      const askedColors = terms.filter(term => COLOR_TERMS.has(term));
      if (askedColors.length) {
        const hasAskedColor = askedColors.some(color => searchable.includes(color));
        score = hasAskedColor ? score + 6 : Math.max(0, score - 4);
      }

      return { painting, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ painting }) => painting);
}

function buildCatalogFallback(message, catalogContext) {
  const query = String(message || '').trim().toLowerCase();
  const matches = findCatalogMatches(query, catalogContext);
  const navigation = findPortalDestination(query);
  const greeting = /^(hi|hello|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(query);

  if (navigation) {
    return {
      reply: `I can take you to that part of ArtMind. Select “${navigation.label}” below.`,
      paintingIds: [],
      navigation
    };
  }

  if (greeting) {
    return {
      reply: 'Hello! I’m ArtMind, your art-curator assistant. I can talk through artists, styles, techniques, colour palettes, and help you find artworks in this collection.',
      paintingIds: [],
      navigation: null
    };
  }

  if (matches.length) {
    const names = matches
      .slice(0, 2)
      .map(painting => `“${painting.title}” by ${painting.artist}`)
      .join(' and ');

    let intro = `Here are catalog matches for that request, including ${names}.`;

    if (/impressionism/.test(query)) {
      intro = 'Impressionism focuses on fleeting light, visible brushwork, and atmosphere rather than fine detail. ' + intro;
    } else if (/abstract/.test(query)) {
      intro = 'Abstract and modern works use colour, shape, and composition instead of a literal scene. ' + intro;
    }

    return {
      reply: intro,
      paintingIds: matches.map(painting => String(painting._id || painting.id)),
      navigation: null
    };
  }

  if (/impressionism/.test(query)) {
    return {
      reply: 'Impressionism focuses on fleeting light, visible brushwork, and the atmosphere of a moment rather than fine detail. Artists often used broken colour and outdoor scenes to create a lively, immediate feeling.',
      paintingIds: [],
      navigation: null
    };
  }

  if (/abstract/.test(query)) {
    return {
      reply: 'Abstract art uses colour, shape, texture, and composition to express an idea or feeling instead of depicting a scene literally. Try noticing which colours, rhythms, or forms draw your eye first.',
      paintingIds: [],
      navigation: null
    };
  }

  return {
    reply: 'I can help with art questions in a conversational way—ask about an artist, a movement such as Impressionism or Abstract art, a colour mood, or the kind of artwork you would like to discover.',
    paintingIds: [],
    navigation: null
  };
}

function compactCatalog(catalogContext) {
  return catalogContext.slice(0, 8).map(painting => ({
    title: painting.title,
    artist: painting.artist,
    category: painting.category,
    style: painting.style,
    colors: painting.colorTheme,
    medium: painting.medium || painting.colorMedium
  }));
}

export async function streamChatReply({
  message,
  history = [],
  catalogMatches = [],
  signal,
  onDelta
}) {
  const fallback = buildCatalogFallback(message, catalogMatches);

  if (!openai) {
    console.warn('[Chat] OPENAI_API_KEY is not configured; using catalog fallback.');
    await onDelta(fallback.reply);
    return;
  }

  const catalogHint = compactCatalog(catalogMatches);
  const recentHistory = history
    .filter(item => item?.text)
    .slice(-6)
    .map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: String(item.text).slice(0, 500)
    }));

  try {
    const stream = await openai.chat.completions.create({
      model: CHAT_MODEL,
      stream: true,
      max_tokens: 180,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: `You are ArtMind, a fast art-curator assistant for the ArtMind portal.
Answer questions about paintings, artists, styles, and techniques in 2-4 short sentences.
If matching catalog artworks are provided, mention one or two by title. Never invent artworks.
Help users navigate Gallery, Search, Dashboard, AI Vision, and Analytics when asked.
Keep replies concise.`
        },
        ...recentHistory,
        {
          role: 'user',
          content: catalogHint.length
            ? `${message}\n\nMatching catalog artworks:\n${JSON.stringify(catalogHint)}`
            : message
        }
      ]
    }, signal ? { signal } : undefined);

    let streamed = false;

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      streamed = true;
      await onDelta(delta);
    }

    if (!streamed) {
      await onDelta(fallback.reply);
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    console.error('[OpenAI] Chat error:', error.message);
    await onDelta(fallback.reply);
  }
}

export async function chatWithOpenAI(message, history = [], catalogContext = []) {
  let reply = '';
  await streamChatReply({
    message,
    history,
    catalogMatches: findCatalogMatches(message, catalogContext),
    onDelta: (delta) => {
      reply += delta;
    }
  });

  const fallback = buildCatalogFallback(message, catalogContext);
  return {
    reply: reply || fallback.reply,
    paintingIds: fallback.paintingIds,
    navigation: fallback.navigation
  };
}

/**
 * Generate ~70 word curator-style summary for a painting
 */
export async function generateCuratorSummary(painting) {
  const fallback = `This masterpiece titled "${painting.title}" by ${painting.artist} (${painting.dateDisplay}) displays remarkable mastery in ${painting.medium}. Executed in a distinct ${painting.style} style, the artwork evokes deep emotion through its harmonious composition on ${painting.surface}. Featured in our ${painting.category} gallery, it reflects the artist's profound vision and enduring technique.`;

  if (!openai) {
    return fallback;
  }

  try {
    const prompt = `You are a world-class art curator. Write an insightful, elegant curator-style summary of approximately 70 words for the following artwork:
Title: ${painting.title}
Artist: ${painting.artist}
Artist details: ${painting.artistDetails || 'N/A'}
Date: ${painting.dateDisplay}
Medium: ${painting.medium}
Color medium: ${painting.colorMedium || 'N/A'}
Style: ${painting.style}
Category: ${painting.category}
Surface: ${painting.surface || 'N/A'}
Description: ${painting.description || 'N/A'}

Keep the response concise, evocative, and around 70 words. Output raw text only without quotes or headers.`;

    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || fallback;
  } catch (err) {
    console.error('[OpenAI] Curator summary call failed:', err.message);
    return fallback;
  }
}

/**
 * Multimodal vision analysis for uploaded art image
 */
export async function analyzeImageWithVision(imageBuffer, mimeType = 'image/jpeg') {
  const fallback = {
    style: 'Post-Impressionism',
    category: 'Landscape',
    dominantColors: ['Blue', 'Gold', 'Earth Tones'],
    mediumGuess: 'Oil on Canvas',
    summary: 'A vivid artistic composition featuring expressive brushwork, strong tonal contrast, and emotional depth.'
  };

  try {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const prompt = `Analyze this artwork image and return ONLY a valid JSON object matching this exact format:
{
  "style": string, // e.g. Impressionism, Surrealism, Realism, Expressionism, Abstract Expressionism, Baroque
  "category": string, // MUST be strictly one of: "Abstract", "Landscape", "Flower", "Nature", "Figurative", "Religious"
  "dominantColors": string[], // e.g. ["Blue", "Gold", "Warm Earth Tones"]
  "mediumGuess": string, // e.g. "Oil on Canvas", "Watercolor", "Pastel"
  "summary": string // ~50 word artistic analysis of style, light, composition, and emotional tone
}`;

    const response = await openai.chat.completions.create({
      model: 'gemini-3.6-flash',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ]
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (!rawContent) {
      throw new Error('Empty response from OpenAI Vision API');
    }

    const parsed = JSON.parse(rawContent);
    return parsed;
  } catch (err) {
    console.error('[OpenAI Vision] Vision analysis failed:', err.message);
    return fallback;
  }
}

/**
 * Parse natural language search into structured query parameters
 */
export async function parseNaturalLanguageSearch(userQuery) {
  try {
    const prompt = `Analyze the following user search query for art: "${userQuery}".
Return ONLY a valid JSON object matching this exact schema:
{
  "styles": string[], // e.g. ["Impressionism", "Surrealism", "Realism", "Baroque", "Expressionism", "Abstract"]
  "colors": string[], // e.g. ["Warm", "Cool", "Yellow", "Blue", "Green", "Red", "Dark"]
  "medium": string, // e.g. "Oil on Canvas", "Watercolor", "Pastel"
  "surface": string, // e.g. "Canvas", "Paper", "Wood"
  "category": string, // One of: "Abstract", "Landscape", "Flower", "Nature", "Figurative", "Religious" or ""
  "keywords": string[] // Clean search keywords extracted from query
}`;

    const response = await openai.chat.completions.create({
      model: 'gemini-3.6-flash',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'user', content: prompt }
      ]
    });

    const rawContent = response.choices[0]?.message?.content?.trim();
    if (!rawContent) return null;

    const parsed = JSON.parse(rawContent);
    return parsed;
  } catch (err) {
    console.error('[OpenAI Search] Natural language search parsing failed:', err.message);
    return null;
  }
}
