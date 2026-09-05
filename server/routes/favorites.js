import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Painting from '../models/Painting.js';

const router = express.Router();

/**
 * GET /api/favorites
 * Returns populated favorites for logged-in user
 */
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    return res.json(user ? user.favorites : []);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    return res.status(500).json({ error: 'Server error retrieving favorites' });
  }
});

/**
 * POST /api/favorites/:paintingId
 * Saves painting as favorite
 */
router.post('/:paintingId', protect, async (req, res) => {
  try {
    const painting = await Painting.findById(req.params.paintingId);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user.favorites.includes(painting._id)) {
      user.favorites.push(painting._id);
      await user.save();

      // Increment popularity
      painting.popularity += 2;
      await painting.save();
    }

    return res.json({ message: 'Added to favorites', favorites: user.favorites });
  } catch (err) {
    console.error('Error adding favorite:', err);
    return res.status(500).json({ error: 'Server error adding favorite' });
  }
});

/**
 * DELETE /api/favorites/:paintingId
 * Removes painting from favorites
 */
router.delete('/:paintingId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter(id => id.toString() !== req.params.paintingId);
    await user.save();

    return res.json({ message: 'Removed from favorites', favorites: user.favorites });
  } catch (err) {
    console.error('Error removing favorite:', err);
    return res.status(500).json({ error: 'Server error removing favorite' });
  }
});

export default router;
