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
export async function chatWithArtCatalog(message, history = [], catalogContext = []) {
  const ai = getGeminiClient();
  const contextSummary = catalogContext.map(p => `- ID: "${p._id}", Title: "${p.title}", Artist: "${p.artist}", Category: "${p.category}", Style: "${p.style}", Medium: "${p.medium}"`).join('\n');

  if (!ai) {
    // Fallback bot response
    const matched = catalogContext.slice(0, 3);
    return {
      reply: `Hello! I am ArtMind. Based on our collection, here are some artworks matching your inquiry. Explore these masterpieces below!`,
      paintingIds: matched.map(m => m._id.toString())
    };
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const systemPrompt = `You are ArtMind, an AI Art Assistant for the ArtMind AI Portal.
Your task is to help users explore fine art. You MUST only recommend paintings that exist in our catalog context provided below.

Catalog Context:
${contextSummary}

Instructions:
1. Answer the user's message gracefully and knowledgeably.
2. If recommending paintings, include their exact IDs in a JSON block at the very end of your response in this format:
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

    if (paintingIds.length === 0) {
      // Pick up to 2 context items as relevant fallback recommendations if text mentions them
      paintingIds = catalogContext.filter(p => reply.toLowerCase().includes(p.title.toLowerCase()) || reply.toLowerCase().includes(p.artist.toLowerCase())).map(p => p._id.toString()).slice(0, 3);
    }

    return { reply, paintingIds };
  } catch (err) {
    console.warn('Gemini chat failed/rate-limited:', err.message);
    const matched = catalogContext.slice(0, 3);
    return {
      reply: `I am currently operating in offline mode, but I can recommend these fine works from our gallery catalog!`,
      paintingIds: matched.map(m => m._id.toString())
    };
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
