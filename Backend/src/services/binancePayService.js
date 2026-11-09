// src/services/binancePayService.js
import axios from 'axios';
import { generateNonce, generateBinanceSignature } from '../config/binance.js';

export const createBinanceOrder = async ({ merchantTradeNo, totalFee, currency = 'USDT', productDetail }) => {
  try {
    const apiKey = process.env.BINANCE_PAY_API_KEY;
    const secretKey = process.env.BINANCE_PAY_SECRET_KEY;
    const baseURL = process.env.BINANCE_PAY_BASE_URL || 'https://bpay.binanceapi.com';

    const timestamp = Date.now().toString();
    const nonce = generateNonce();

    const body = {
      env: {
        terminalType: 'WEB',
      },
      merchantTradeNo,
      orderAmount: totalFee,
      currency,
      goods: {
        goodsType: '02', // Virtual goods / digital service
        goodsCategory: '7000',
        referenceGoodsId: merchantTradeNo,
        goodsName: 'Account Capital Top-Up',
        goodsDetail: productDetail || 'Deposit to TradeYield Managed Portal',
      },
    };

    const bodyString = JSON.stringify(body);
    const signature = generateBinanceSignature(timestamp, nonce, bodyString, secretKey);

    const response = await axios.post(`${baseURL}/binancepay/openapi/v2/order`, body, {
      headers: {
        'Content-Type': 'application/json',
        'BinancePay-Timestamp': timestamp,
        'BinancePay-Nonce': nonce,
        'BinancePay-Certificate-SN': apiKey,
        'BinancePay-Signature': signature,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Binance Pay Order Creation Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errorMessage || 'Binance Pay gateway connection failed');
  }
};