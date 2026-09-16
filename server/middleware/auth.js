import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function getToken(req) {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7);
  }
  return req.headers.cookie
    ?.split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('artmind_token='))
    ?.slice('artmind_token='.length);
}

export async function protect(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authorized, token failed' });
  }
}

export function optionalAuth(req, res, next) {
  const token = getToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    User.findById(decoded.id).select('-password').then(user => {
      req.user = user;
      next();
    }).catch(() => {
      req.user = null;
      next();
    });
  } catch (err) {
    req.user = null;
    next();
  }
}
