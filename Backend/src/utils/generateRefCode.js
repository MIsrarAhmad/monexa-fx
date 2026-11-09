// src/utils/generateRefCode.js
import crypto from 'crypto';

export const generateRefCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // Example: "A3F9B2"
};