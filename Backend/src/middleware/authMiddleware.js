import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - Verify JWT Token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('+passwordChangedAt');
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      if (req.user.passwordChangedAt && decoded.iat * 1000 < req.user.passwordChangedAt.getTime()) {
        return res.status(401).json({ success: false, error: 'Password changed. Please sign in again.' });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

// Admin Guard - Ensure user has 'admin' role
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Access restricted to admin privileges only' });
  }
};