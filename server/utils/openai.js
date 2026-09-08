import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
      model: 'gpt-5.6-luna',

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