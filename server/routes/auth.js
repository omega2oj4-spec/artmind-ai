import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

const authLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10
});

/**
 * Create the authentication cookie.
 */
function setSessionCookie(res, token) {
  res.cookie('artmind_token', token, {
    httpOnly: true,

    secure: process.env.NODE_ENV === 'production',

    sameSite:
      process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',

    maxAge: 30 * 24 * 60 * 60 * 1000,

    path: '/'
  });
}

/**
 * Generate JWT token.
 */
function generateToken(id) {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d'
    }
  );
}

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  authLimit,
  async (req, res) => {
    try {
      const {
        name,
        email,
        password
      } = req.body;

      // Name validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          error: 'Please enter your full name.'
        });
      }

      // Email validation
      if (!email || !email.trim()) {
        return res.status(400).json({
          error: 'Please enter your email address.'
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      if (
        !/^\S+@\S+\.\S+$/.test(
          normalizedEmail
        )
      ) {
        return res.status(400).json({
          error: 'Please enter a valid email address.'
        });
      }

      // Password validation
      if (!password) {
        return res.status(400).json({
          error: 'Please enter a password.'
        });
      }

      if (password.length < 10) {
        return res.status(400).json({
          error:
            'Password must be at least 10 characters long.'
        });
      }

      // Check if account already exists
      const existingUser =
        await User.findOne({
          email: normalizedEmail
        });

      if (existingUser) {
        return res.status(400).json({
          error:
            'Account already exists with this email address.'
        });
      }

      // Hash password
      const salt =
        await bcrypt.genSalt(10);

      const hashedPassword =
        await bcrypt.hash(
          password,
          salt
        );

      // Create user
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword
      });

      // Generate login token
      const token =
        generateToken(user._id);

      // Store token in cookie
      setSessionCookie(
        res,
        token
      );

      return res.status(201).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          favorites: user.favorites
        }
      });

    } catch (err) {
      console.error(
        'Error during registration:',
        err
      );

      return res.status(500).json({
        error:
          'Registration failed. Please try again.'
      });
    }
  }
);

/**
 * POST /api/auth/login
 */
router.post(
  '/login',
  authLimit,
  async (req, res) => {
    try {
      const {
        email,
        password
      } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error:
            'Email and password are required.'
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const user =
        await User.findOne({
          email: normalizedEmail
        });

      if (!user) {
        return res.status(401).json({
          error:
            'Invalid email or password.'
        });
      }

      const isMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!isMatch) {
        return res.status(401).json({
          error:
            'Invalid email or password.'
        });
      }

      const token =
        generateToken(user._id);

      setSessionCookie(
        res,
        token
      );

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          favorites: user.favorites
        }
      });

    } catch (err) {
      console.error(
        'Error during login:',
        err
      );

      return res.status(500).json({
        error:
          'Login failed. Please try again.'
      });
    }
  }
);

/**
 * POST /api/auth/logout
 */
router.post(
  '/logout',
  (req, res) => {
    res.clearCookie(
      'artmind_token',
      {
        path: '/'
      }
    );

    return res.status(204).end();
  }
);

/**
 * GET /api/auth/me
 */
router.get(
  '/me',
  protect,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user._id
        ).select('-password');

      if (!user) {
        return res.status(404).json({
          error: 'User not found.'
        });
      }

      return res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          favorites: user.favorites
        }
      });

    } catch (err) {
      console.error(
        'Error getting user profile:',
        err
      );

      return res.status(500).json({
        error:
          'Failed to retrieve profile.'
      });
    }
  }
);

export default router;