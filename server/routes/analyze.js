import express from 'express';
import multer from 'multer';
import Painting from '../models/Painting.js';
import { analyzeImageWithVision } from '../utils/openai.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/**
 * Calculate how similar a catalog painting is
 * to the AI analysis of the target artwork.
 */
function calculateSimilarityScore(painting, analysis) {
  let score = 0;

  const targetCategory = String(analysis.category || '').toLowerCase();
  const targetStyle = String(analysis.style || '').toLowerCase();
  const targetMedium = String(
    analysis.mediumGuess || analysis.medium || ''
  ).toLowerCase();

  const targetColors = Array.isArray(analysis.dominantColors)
    ? analysis.dominantColors.map(color => String(color).toLowerCase())
    : [];

  const paintingCategory = String(painting.category || '').toLowerCase();
  const paintingStyle = String(painting.style || '').toLowerCase();
  const paintingMedium = String(
    painting.colorMedium || painting.medium || ''
  ).toLowerCase();

  const paintingColorTheme = String(
    painting.colorTheme || ''
  ).toLowerCase();

  const paintingTags = Array.isArray(painting.tags)
    ? painting.tags.map(tag => String(tag).toLowerCase())
    : [];

  // Category match
  if (
    targetCategory &&
    paintingCategory === targetCategory
  ) {
    score += 10;
  }

  // Style match
  if (
    targetStyle &&
    paintingStyle.includes(targetStyle)
  ) {
    score += 8;
  }

  // Medium match
  if (
    targetMedium &&
    (
      paintingMedium.includes(targetMedium) ||
      targetMedium.includes(paintingMedium)
    )
  ) {
    score += 5;
  }

  // Color matching
  for (const color of targetColors) {
    if (
      paintingColorTheme.includes(color) ||
      paintingTags.some(tag => tag.includes(color))
    ) {
      score += 3;
    }
  }

  // Tag matching
  const analysisText = [
    analysis.summary,
    analysis.style,
    analysis.category,
    analysis.mediumGuess,
    ...(analysis.dominantColors || []),
    ...(analysis.visualCharacteristics || [])
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const tag of paintingTags) {
    if (tag && analysisText.includes(tag)) {
      score += 1;
    }
  }

  // Small popularity bonus.
  // This should not overpower visual similarity.
  if (painting.popularity > 50) {
    score += 0.5;
  }

  return score;
}

/**
 * Find paintings similar to an AI analysis.
 */
async function findSimilarPaintings(analysis, excludeId = null) {
  const paintings = await Painting.find();

  const scored = paintings
    .filter(painting => {
      if (!excludeId) return true;

      return painting._id.toString() !== String(excludeId);
    })
    .map(painting => ({
      painting,
      score: calculateSimilarityScore(painting, analysis)
    }));

  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, 5)
    .map(item => item.painting);
}

/**
 * Analyze an uploaded artwork image.
 *
 * POST /api/analyze
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload an artwork image file'
      });
    }

    const mimeType = req.file.mimetype || 'image/jpeg';
    const imageBuffer = req.file.buffer;

    console.log('[Vision] Analyzing uploaded artwork...');

    // Analyze the actual image with Gemini Vision
    const analysis = await analyzeImageWithVision(
      imageBuffer,
      mimeType
    );

    console.log('[Vision] Analysis:', analysis);

    // Find the closest catalog paintings
    const similarPaintings = await findSimilarPaintings(
      analysis
    );

    console.log(
      `[Vision] Found ${similarPaintings.length} similar paintings`
    );

    return res.json({
      analysis,
      similarPaintings
    });

  } catch (err) {
    console.error(
      'Error during image analysis:',
      err
    );

    return res.status(500).json({
      error:
        'Server error processing artwork image analysis'
    });
  }
});

/**
 * Analyze an existing painting from the ArtMind catalog.
 *
 * POST /api/analyze/painting/:paintingId
 */
router.post('/painting/:paintingId', async (req, res) => {
  try {
    const { paintingId } = req.params;

    const painting = await Painting.findById(
      paintingId
    );

    if (!painting) {
      return res.status(404).json({
        error: 'Painting not found'
      });
    }

    if (!painting.imageUrl) {
      return res.status(400).json({
        error: 'This painting does not have an image URL'
      });
    }

    console.log(
      `[Vision] Analyzing catalog painting: ${painting.title}`
    );

    // Download the actual painting image
    const imageResponse = await fetch(
      painting.imageUrl
    );

    if (!imageResponse.ok) {
      throw new Error(
        `Could not download painting image: ${imageResponse.status}`
      );
    }

    const contentType =
      imageResponse.headers.get('content-type') ||
      'image/jpeg';

    const arrayBuffer =
      await imageResponse.arrayBuffer();

    const imageBuffer = Buffer.from(arrayBuffer);

    // Send the ACTUAL painting image to Gemini Vision
    const analysis = await analyzeImageWithVision(
      imageBuffer,
      contentType
    );

    console.log('[Vision] Catalog analysis:', analysis);

    // Find visually/catalog-wise related paintings
    const similarPaintings =
      await findSimilarPaintings(
        analysis,
        painting._id
      );

    return res.json({
      painting: {
        _id: painting._id,
        title: painting.title,
        artist: painting.artist,
        imageUrl: painting.imageUrl
      },
      analysis,
      similarPaintings
    });

  } catch (err) {
    console.error(
      'Error analyzing catalog painting:',
      err
    );

    return res.status(500).json({
      error:
        'Server error analyzing catalog painting'
    });
  }
});

export default router;