import express from 'express';
import Painting from '../models/Painting.js';
import { chatWithArtCatalog } from '../utils/gemini.js';

const router = express.Router();

/**
 * POST /api/chat
 * AI Chatbot bounded to gallery catalog context
 */
router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Retrieve catalog sample (up to 20 artworks)
    const catalogContext = await Painting.find().select('_id title artist category style medium').limit(20);

    const botResponse = await chatWithArtCatalog(message, history || [], catalogContext);

    // Fetch full painting documents for any recommended painting IDs
    let recommendedPaintings = [];
    if (botResponse.paintingIds && botResponse.paintingIds.length > 0) {
      recommendedPaintings = await Painting.find({ _id: { $in: botResponse.paintingIds } });
    }

    return res.json({
      reply: botResponse.reply,
      paintings: recommendedPaintings
    });
  } catch (err) {
    console.error('Error in chat bot endpoint:', err);
    return res.status(500).json({ error: 'Server error in AI Chatbot' });
  }
});

export default router;
