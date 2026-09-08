import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
});

export async function chatWithOpenAI(
  message,
  history = [],
  catalogContext = []
) {
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
      .map(
        item =>
          `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.text}`
      )
      .join('\n');

    const response = await openai.responses.create({
      model: 'gemini-3.6-flash',

      instructions: `You are ArtMind, an AI art curator for the ArtMind AI Portal.

Help users explore paintings and learn about art.

You MUST only recommend paintings that exist in this catalog:

${catalogText}

When the user asks for painting recommendations, choose the most relevant paintings from the catalog.

Return ONLY valid JSON in exactly this format:

{
  "reply": "Your friendly response to the user",
  "paintingIds": ["ID1", "ID2"]
}

If the user is not asking for painting recommendations, return:

{
  "reply": "Your response",
  "paintingIds": []
}

IMPORTANT:
- Never invent painting IDs.
- Only use IDs that appear in the catalog.
- Keep the reply friendly and concise.`,

      input: `${formattedHistory}

User: ${message}`
    });

    const text = response.output_text.trim();

    console.log('[OpenAI] Raw response:', text);

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.error('[OpenAI] Invalid JSON:', text);

      return {
        reply: text,
        paintingIds: []
      };
    }

    console.log('[OpenAI] Painting IDs:', parsed.paintingIds);

    return {
      reply: parsed.reply || '',
      paintingIds: Array.isArray(parsed.paintingIds)
        ? parsed.paintingIds.map(String)
        : []
    };

  } catch (error) {
    console.error('[OpenAI] Chat error:', error.message);
    throw error;
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