// src/config/binance.js
import CryptoJS from 'crypto-js';

// Generate random string for Binance Nonce header
export const generateNonce = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate Binance HMAC SHA256 Signature
export const generateBinanceSignature = (timestamp, nonce, bodyString, secretKey) => {
  const payload = `${timestamp}\n${nonce}\n${bodyString}\n`;
  const signature = CryptoJS.HmacSHA256(payload, secretKey).toString(CryptoJS.enc.Hex).toUpperCase();
  return signature;
};