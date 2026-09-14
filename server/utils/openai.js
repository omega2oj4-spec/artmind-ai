import OpenAI from 'openai';

// The chat service uses the OpenAI API directly. The previous Gemini endpoint
// was configured with a placeholder key, so every chat request failed before a
// response could be generated.
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';

const PORTAL_DESTINATIONS = [
  { path: '/gallery', label: 'Open Gallery', terms: ['gallery', 'browse', 'collection', 'artworks', 'paintings'] },
  { path: '/dashboard', label: 'Open Dashboard', terms: ['dashboard', 'activity', 'saved', 'favorites', 'profile'] },
  { path: '/ai-vision', label: 'Open AI Vision', terms: ['ai vision', 'analyse', 'analyze', 'upload', 'identify'] },
  { path: '/analytics', label: 'Open Analytics', terms: ['analytics', 'trending', 'insights', 'popular'] }
];

function findPortalDestination(message) {
  const query = String(message || '').toLowerCase();

  if (!/(open|go to|take me|navigate|where|find|show me)/.test(query)) {
    return null;
  }

  const destination = PORTAL_DESTINATIONS.find(({ terms }) =>
    terms.some(term => query.includes(term))
  );

  return destination
    ? { path: destination.path, label: destination.label }
    : null;
}

function normaliseNavigation(navigation) {
  if (!navigation || typeof navigation !== 'object') return null;

  const destination = PORTAL_DESTINATIONS.find(
    item => item.path === navigation.path
  );

  return destination
    ? { path: destination.path, label: destination.label }
    : null;
}

function findCatalogMatches(message, catalogContext) {
  const terms = String(message || '')
    .toLowerCase()
    .match(/[a-z]{3,}/g)
    ?.filter(term => !['about', 'please', 'would', 'could', 'show', 'with', 'that', 'this', 'what', 'have', 'like', 'some', 'paintings', 'painting', 'artwork', 'artworks'].includes(term)) || [];

  return catalogContext
    .map((painting) => {
      const searchable = [
        painting.title,
        painting.artist,
        painting.category,
        painting.style,
        painting.medium,
        painting.colorTheme,
        ...(painting.tags || [])
      ].join(' ').toLowerCase();

      return {
        painting,
        score: terms.reduce(
          (total, term) => total + (searchable.includes(term) ? 1 : 0),
          0
        )
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
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

  if (/impressionism/.test(query)) {
    return {
      reply: 'Impressionism focuses on fleeting light, visible brushwork, and the atmosphere of a moment rather than fine detail. Artists often used broken colour and outdoor scenes to create a lively, immediate feeling.',
      paintingIds: matches.map(painting => String(painting._id)),
      navigation: null
    };
  }

  if (/abstract/.test(query)) {
    return {
      reply: 'Abstract art uses colour, shape, texture, and composition to express an idea or feeling instead of depicting a scene literally. Try noticing which colours, rhythms, or forms draw your eye first.',
      paintingIds: matches.map(painting => String(painting._id)),
      navigation: null
    };
  }

  if (matches.length) {
    const names = matches
      .slice(0, 2)
      .map(painting => `“${painting.title}”`)
      .join(' and ');

    return {
      reply: `I found ${names} in the collection. They are a good match for what you described—open either artwork to explore its artist, style, and visual details.`,
      paintingIds: matches.map(painting => String(painting._id)),
      navigation: null
    };
  }

  return {
    reply: 'I can help with art questions in a conversational way—ask about an artist, a movement such as Impressionism or Abstract art, a colour mood, or the kind of artwork you would like to discover.',
    paintingIds: [],
    navigation: null
  };
}

function parseChatResponse(text) {
  const cleanText = String(text || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');

  return JSON.parse(cleanText);
}

export async function chatWithOpenAI(
  message,
  history = [],
  catalogContext = []
) {
  const fallback = buildCatalogFallback(message, catalogContext);

  if (!openai) {
    console.warn('[Chat] OPENAI_API_KEY is not configured; using catalog fallback.');
    return fallback;
  }

  try {
    const catalogText = catalogContext
      .map(
        painting =>
          `ID: ${painting._id}
Title: ${painting.title}
Artist: ${painting.artist}
Category: ${painting.category}
Style: ${painting.style}
Medium: ${painting.medium}
Colors: ${painting.colorTheme}`
      )
      .join('\n\n');

    const formattedHistory = history
      .slice(-12)
      .map(
        item =>
          `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`
      )
      .join('\n');

    const response = await openai.responses.create({
      model: CHAT_MODEL,
      max_output_tokens: 450,
      text: {
        format: {
          type: 'json_schema',
          name: 'artmind_chat_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['reply', 'paintingIds', 'navigation'],
            properties: {
              reply: { type: 'string' },
              paintingIds: {
                type: 'array',
                items: { type: 'string' }
              },
              navigation: {
                anyOf: [
                  { type: 'null' },
                  {
                    type: 'object',
                    additionalProperties: false,
                    required: ['label', 'path'],
                    properties: {
                      label: { type: 'string' },
                      path: {
                        type: 'string',
                        enum: PORTAL_DESTINATIONS.map(item => item.path)
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      instructions: `You are ArtMind, an AI art curator for the ArtMind AI Portal.

Have a natural, helpful conversation about art. Answer questions about artists,
styles, techniques, colours, and art appreciation clearly, even when the user
is not explicitly asking for recommendations.

You can help users navigate these pages in the ArtMind portal:
- Gallery: /gallery
- Dashboard: /dashboard
- AI Vision: /ai-vision
- Analytics: /analytics
When a user asks to open, go to, find, or navigate to one of these areas, set
the navigation object with its exact path. Otherwise, set navigation to null.

You may only recommend specific artworks that exist in this catalog:

${catalogText}

When the user asks for painting recommendations, choose the most relevant paintings from the catalog.

Return ONLY valid JSON in exactly this format:

{
  "reply": "Your friendly response to the user",
  "paintingIds": ["ID1", "ID2"],
  "navigation": null
}

If the user is not asking for painting recommendations, return:

{
  "reply": "Your response",
  "paintingIds": [],
  "navigation": null
}

IMPORTANT:
- Never invent painting IDs.
- Only use IDs that appear in the catalog.
- Keep the reply friendly, accurate, and concise.
- Preserve context from the recent conversation.`,

      input: `${formattedHistory}

User: ${message}`
    });

    const text = response.output_text.trim();

    console.log('[OpenAI] Raw response:', text);

    let parsed;

    try {
      parsed = parseChatResponse(text);
    } catch (parseError) {
      console.error('[OpenAI] Invalid JSON:', text);

      return { ...fallback, reply: text || fallback.reply };
    }

    console.log('[OpenAI] Painting IDs:', parsed.paintingIds);

    return {
      reply: parsed.reply || '',
      paintingIds: Array.isArray(parsed.paintingIds)
        ? parsed.paintingIds.map(String)
        : [],
      navigation: normaliseNavigation(parsed.navigation)
    };

  } catch (error) {
    console.error('[OpenAI] Chat error:', error.message);
    return fallback;
  }
}

/**
 * Generate ~70 word curator-style summary for a painting
 */
export async function generateCuratorSummary(painting) {
  const fallback = `This masterpiece titled "${painting.title}" by ${painting.artist} (${painting.dateDisplay}) displays remarkable mastery in ${painting.medium}. Executed in a distinct ${painting.style} style, the artwork evokes deep emotion through its harmonious composition on ${painting.surface}. Featured in our ${painting.category} gallery, it reflects the artist's profound vision and enduring technique.`;

  try {
    const prompt = `You are a world-class art curator. Write an insightful, elegant curator-style summary of approximately 70 words for the following artwork:
Title: ${painting.title}
Artist: ${painting.artist}
Date: ${painting.dateDisplay}
Medium: ${painting.medium}
Style: ${painting.style}
Category: ${painting.category}
Surface: ${painting.surface || 'N/A'}
Description: ${painting.description || 'N/A'}

Keep the response concise, evocative, and around 70 words. Output raw text only without quotes or headers.`;

    const response = await openai.chat.completions.create({
      model: 'gemini-3.6-flash',
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
