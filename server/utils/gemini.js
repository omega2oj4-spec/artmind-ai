import { GoogleGenerativeAI } from '@google/generative-ai';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (err) {
    console.error('Failed to initialize GoogleGenerativeAI:', err.message);
    return null;
  }
}

/**
 * Generate ~70 word curator-style summary for a painting
 */
export async function generateCuratorSummary(painting) {
  const ai = getGeminiClient();
  if (!ai) {
    return `This masterpiece titled "${painting.title}" by ${painting.artist} (${painting.dateDisplay}) displays remarkable mastery in ${painting.medium}. Executed in a distinct ${painting.style} style, the artwork evokes deep emotion through its harmonious composition on ${painting.surface}. Featured in our ${painting.category} gallery, it reflects the artist's profound vision and enduring technique.`;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a world-class art curator. Write an insightful, elegant curator-style summary of approximately 70 words for the following artwork:
Title: ${painting.title}
Artist: ${painting.artist}
Date: ${painting.dateDisplay}
Medium: ${painting.medium}
Style: ${painting.style}
Category: ${painting.category}
Description: ${painting.description || 'N/A'}

Keep the response concise, evocative, and around 70 words. Output raw text only without quotes or headers.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text || `A captivating creation by ${painting.artist}, "${painting.title}" (${painting.dateDisplay}) showcases fine craftsmanship in ${painting.medium}.`;
  } catch (err) {
    console.warn('Gemini summary call failed/rate-limited:', err.message);
    return `This masterpiece titled "${painting.title}" by ${painting.artist} (${painting.dateDisplay}) displays remarkable mastery in ${painting.medium}. Executed in a distinct ${painting.style} style, the artwork evokes deep emotion through its harmonious composition on ${painting.surface}.`;
  }
}

/**
 * Parse natural language search into structured query parameters
 */
export async function parseNaturalLanguageSearch(userQuery) {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

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

    const result = await model.generateContent(prompt);
    const rawJson = result.response.text().trim();
    return JSON.parse(rawJson);
  } catch (err) {
    console.warn('Gemini search parser failed/rate-limited:', err.message);
    return null;
  }
}

/**
 * Chat with catalog context constraint
 */
const ART_STYLE_GUIDES = {
  abstract: 'Abstract art uses color, shape, line, and texture rather than realistic representation to create an idea, mood, or visual rhythm.',
  impressionism: 'Impressionism emphasizes changing light, visible brushstrokes, and an immediate sense of atmosphere rather than fine detail.',
  'post-impressionism': 'Post-Impressionism builds on Impressionism with stronger structure, expressive color, and more personal symbolism.',
  realism: 'Realism aims to depict everyday subjects and scenes with believable detail, observation, and natural light.',
  surrealism: 'Surrealism combines familiar images in unexpected, dreamlike ways to explore imagination and the subconscious.',
  expressionism: 'Expressionism intensifies color, brushwork, and form to communicate emotion over literal accuracy.',
  baroque: 'Baroque painting is known for dramatic light and shadow, movement, rich detail, and theatrical compositions.',
  renaissance: 'Renaissance art combines balanced composition, perspective, anatomy, and carefully observed naturalism.',
  watercolor: 'Watercolor is a transparent, water-based medium valued for luminous layers, soft edges, and expressive washes.',
  oil: 'Oil paint dries slowly, allowing artists to blend colors, build rich layers, and create detailed or textured surfaces.'
};

const CATEGORY_TERMS = ['abstract', 'landscape', 'flower', 'nature', 'figurative', 'religious'];
const STYLE_TERMS = ['impressionism', 'post-impressionism', 'surrealism', 'expressionism', 'romanticism', 'baroque', 'renaissance', 'realism', 'modern art'];
const MEDIUM_TERMS = ['oil', 'watercolor', 'acrylic', 'pastel', 'ink', 'tempera'];
const COLOR_TERMS = ['blue', 'red', 'yellow', 'green', 'purple', 'orange', 'pink', 'gold', 'black', 'white', 'brown', 'warm', 'cool', 'dark', 'light', 'neutral', 'earth'];

function normalize(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasTerm(text, term) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

function getRequestedTerms(message, history) {
  const recentUserContext = history
    .filter(item => item.role === 'user')
    .slice(-2)
    .map(item => item.text)
    .join(' ');
  const text = normalize(`${recentUserContext} ${message}`);
  const findTerms = terms => terms.filter(term => hasTerm(text, term) || (term === 'modern art' && hasTerm(text, 'modern')));

  return {
    text,
    categories: findTerms(CATEGORY_TERMS),
    styles: findTerms(STYLE_TERMS),
    mediums: findTerms(MEDIUM_TERMS),
    colors: findTerms(COLOR_TERMS)
  };
}

function catalogText(painting) {
  return normalize([
    painting.title, painting.artist, painting.category, painting.style, painting.medium,
    painting.colorMedium, painting.colorTheme, painting.surface, painting.description,
    ...(painting.tags || [])
  ].filter(Boolean).join(' '));
}

function preferenceValues(profile, field) {
  return [...(profile?.favorites || []), ...(profile?.recentlyViewed || [])]
    .map(item => normalize(item?.[field]))
    .filter(Boolean);
}

function buildCatalogResponse(message, history, catalogContext, userProfile) {
  const requested = getRequestedTerms(message, history);
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening)(\s|$)/.test(requested.text)
    || /\bwh(?:a)?t can (?:you|u) do\b/.test(requested.text);
  const isThanks = /\b(thanks|thank you|thx)\b/.test(requested.text);
  const asksAboutAssistant = /\b(who are you|your name|are you an ai|how are you)\b/.test(requested.text);

  if (isGreeting) {
    return {
      reply: 'Hello! I am ArtMind, your AI art curator. I can chat with you throughout this conversation, recommend artworks by style, subject, color, or medium, explain techniques, and help you use the portal. Try: “Show me modern abstract paintings with blue color themes.”',
      paintingIds: []
    };
  }

  if (isThanks) {
    return {
      reply: 'You’re welcome! Ask me anything else about an artist, painting style, color theme, or collection whenever you are ready.',
      paintingIds: []
    };
  }

  if (asksAboutAssistant) {
    return {
      reply: 'I’m ArtMind, the portal’s AI art curator. I keep the context of this open chat so you can ask follow-up questions such as “show me more like that” or “make them watercolor.”',
      paintingIds: []
    };
  }

  const isNavigationQuestion = /\b(where|navigate|open|go to|find)\b/.test(requested.text)
    && /\b(gallery|search|dashboard|vision|camera|upload|analytics|account|login)\b/.test(requested.text);

  if (isNavigationQuestion) {
    const destination = requested.text.includes('vision') || requested.text.includes('camera') || requested.text.includes('upload')
      ? 'Use the camera button above this chat to open AI Vision and upload a painting.'
      : requested.text.includes('dashboard') || requested.text.includes('account')
        ? 'Open Dashboard in the navigation bar to see your viewing history and personalized recommendations.'
        : requested.text.includes('analytics')
          ? 'Open Analytics in the navigation bar to explore popular works and category trends.'
          : requested.text.includes('search')
            ? 'Open Search in the navigation bar to use natural-language art search.'
            : 'Open Gallery in the navigation bar to browse, filter, and search the collection.';
    return { reply: destination, paintingIds: [] };
  }

  const guideKey = Object.keys(ART_STYLE_GUIDES).find(key => hasTerm(requested.text, key));
  const asksForExplanation = /\b(what is|what are|explain|tell me about|how does|technique|style)\b/.test(requested.text);
  const favoriteCategories = preferenceValues(userProfile, 'category');
  const favoriteStyles = preferenceValues(userProfile, 'style');
  const favoriteMediums = [...preferenceValues(userProfile, 'medium'), ...preferenceValues(userProfile, 'colorMedium')];

  const scored = catalogContext.map(painting => {
    const text = catalogText(painting);
    let score = Math.min(Number(painting.popularity || 0), 100) / 25 + Math.min(Number(painting.viewsCount || 0), 100) / 50;

    requested.categories.forEach(term => { if (hasTerm(text, term)) score += 10; });
    requested.styles.forEach(term => { if (hasTerm(text, term) || (term === 'modern art' && hasTerm(text, 'modern'))) score += 9; });
    requested.mediums.forEach(term => { if (hasTerm(text, term)) score += 8; });
    requested.colors.forEach(term => { if (hasTerm(text, term)) score += 7; });

    if (!requested.categories.length && favoriteCategories.includes(normalize(painting.category))) score += 4;
    if (!requested.styles.length && favoriteStyles.includes(normalize(painting.style))) score += 3;
    if (!requested.mediums.length && favoriteMediums.some(value => hasTerm(catalogText(painting), value))) score += 2;

    const significantWords = requested.text.split(' ').filter(word => word.length > 3 && !['show', 'find', 'paintings', 'painting', 'artwork', 'artworks', 'with', 'that', 'about', 'please'].includes(word));
    significantWords.forEach(word => { if (hasTerm(text, word)) score += 2; });
    return { painting, score };
  }).sort((a, b) => b.score - a.score);

  const recommendations = scored
    .filter(item => item.score > 0)
    .slice(0, 3)
    .map(item => item.painting);

  const criteria = [...requested.styles, ...requested.categories, ...requested.mediums, ...requested.colors];
  const explanation = asksForExplanation && guideKey ? `${ART_STYLE_GUIDES[guideKey]} ` : '';
  const preferenceNote = !criteria.length && userProfile && (favoriteCategories.length || favoriteStyles.length)
    ? 'I also considered the styles and categories you have explored before. '
    : '';

  if (!catalogContext.length) {
    return { reply: `${explanation}The catalog is not available yet. Please try again after artworks have been loaded.`, paintingIds: [] };
  }

  if (!recommendations.length) {
    const trending = [...catalogContext]
      .sort((a, b) => (b.popularity || 0) + (b.viewsCount || 0) - (a.popularity || 0) - (a.viewsCount || 0))
      .slice(0, 3);
    return {
      reply: `${explanation}I could not find an exact match, so here are popular works from the collection. Try adding a style, color, medium, or subject such as “blue abstract oil paintings.”`,
      paintingIds: trending.map(item => item._id.toString())
    };
  }

  const matchDescription = criteria.length ? `matching ${criteria.join(', ')}` : 'chosen for you';
  return {
    reply: `${explanation}${preferenceNote}I found ${recommendations.length} artwork${recommendations.length === 1 ? '' : 's'} ${matchDescription}. These suggestions prioritize related style, color, medium, and collection popularity.`,
    paintingIds: recommendations.map(item => item._id.toString())
  };
}

export async function chatWithArtCatalog(message, history = [], catalogContext = [], userProfile = null) {
  const ai = getGeminiClient();
  const localResponse = buildCatalogResponse(message, history, catalogContext, userProfile);
  const recommendedSet = new Set(localResponse.paintingIds);
  const contextSummary = catalogContext
    .filter(p => recommendedSet.has(p._id.toString()))
    .map(p => `- ID: "${p._id}", Title: "${p.title}", Artist: "${p.artist}", Category: "${p.category}", Style: "${p.style}", Medium: "${p.medium}", Color theme: "${p.colorTheme}"`)
    .join('\n');

  if (!ai) {
    return localResponse;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const systemPrompt = `You are ArtMind, an AI Art Assistant for the ArtMind AI Portal.
Your task is to help users explore fine art. You MUST only recommend paintings that exist in the curated catalog context provided below.

Catalog Context:
${contextSummary}

Instructions:
1. Answer the user's message gracefully and knowledgeably in no more than 90 words.
2. If recommending paintings, include only the exact IDs already selected below in a JSON block at the very end of your response in this format:
RECOMMENDED_IDS: ["id1", "id2"]
3. Keep response helpful, concise, and focused on art.`;

    const formattedHistory = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\n${formattedHistory ? formattedHistory + '\n' : ''}User: ${message}\nAssistant:`;

    const result = await model.generateContent(fullPrompt);
    const output = result.response.text().trim();

    let reply = output;
    let paintingIds = [];

    const match = output.match(/RECOMMENDED_IDS:\s*(\[[^\]]*\])/);
    if (match) {
      try {
        paintingIds = JSON.parse(match[1]);
        reply = output.replace(/RECOMMENDED_IDS:\s*\[[^\]]*\]/, '').trim();
      } catch (e) {
        console.warn('Failed to parse RECOMMENDED_IDS JSON:', e.message);
      }
    }

    if (paintingIds.length === 0) paintingIds = localResponse.paintingIds;

    return { reply, paintingIds };
  } catch (err) {
    console.warn('Gemini chat failed/rate-limited:', err.message);
    return localResponse;
  }
}

/**
 * Multimodal vision analysis for uploaded art image
 */
export async function analyzeImageWithVision(imageBuffer, mimeType = 'image/jpeg') {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      style: 'Impressionism',
      category: 'Abstract',
      dominantColors: ['Warm', 'Gold', 'Earth Tones'],
      mediumGuess: 'Oil on Canvas',
      summary: 'An evocative artwork displaying rich textual layering, dynamic balance, and harmonious color composition.'
    };
  }

  try {
    const model = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: mimeType
      }
    };

    const prompt = `Analyze this artwork image and return ONLY a valid JSON object matching this exact format:
{
  "style": string, // e.g. Impressionism, Surrealism, Realism, Expressionism, Abstract Expressionism, Baroque
  "category": string, // MUST be strictly one of: "Abstract", "Landscape", "Flower", "Nature", "Figurative", "Religious"
  "dominantColors": string[], // e.g. ["Blue", "Gold", "Warm Earth Tones"]
  "mediumGuess": string, // e.g. "Oil on Canvas", "Watercolor", "Pastel"
  "summary": string // ~50 word artistic analysis of style, light, composition, and emotional tone
}`;

    const result = await model.generateContent([prompt, imagePart]);
    const rawJson = result.response.text().trim();
    return JSON.parse(rawJson);
  } catch (err) {
    console.warn('Gemini vision analysis failed/rate-limited:', err.message);
    return {
      style: 'Post-Impressionism',
      category: 'Landscape',
      dominantColors: ['Blue', 'Gold', 'Earth Tones'],
      mediumGuess: 'Oil on Canvas',
      summary: 'A vivid artistic composition featuring expressive brushwork, strong tonal contrast, and emotional depth.'
    };
  }
}
