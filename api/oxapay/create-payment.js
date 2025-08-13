/**
 * API endpoint to create Oxapay payment for mining card purchases
 * POST /api/oxapay/create-payment
 */

import { createPayment, generateOrderId, convertCryptoToSton } from '../../src/services/oxapayService.js';
import { db, getServerAdminConfig } from '../../src/lib/serverFirebase.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Individual card prices in STON (should match MiningSection.jsx)
const INDIVIDUAL_CARDS = {
  1: {
    id: 1,
    name: 'Basic Miner Card',
    price: 15000000,     // 15M STON
    cryptoPrice: 0.1,    // 0.1 TON
    validityDays: 7
  },
  2: {
    id: 2,
    name: 'Advanced Miner Card',
    price: 25000000,     // 25M STON  
    cryptoPrice: 0.25,   // 0.25 TON
    validityDays: 15
  },
  3: {
    id: 3,
    name: 'Pro Miner Card',
    price: 50000000,     // 50M STON
    cryptoPrice: 0.5,    // 0.5 TON
    validityDays: 30
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const {
      userId,
      cardNumber,
      currency = 'TON',
      userEmail,
      username
    } = req.body;

    // Validate required fields
    if (!userId || !cardNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, cardNumber'
      });
    }

    // Validate card number
    if (![1, 2, 3].includes(cardNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card number. Must be 1, 2, or 3'
      });
    }

    // Get user data to verify current cards
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userDoc.data();

    // Get card configuration
    const cardConfig = INDIVIDUAL_CARDS[cardNumber];
    if (!cardConfig) {
      return res.status(400).json({
        success: false,
        error: `Invalid card number: ${cardNumber}`
      });
    }

    // Get card price in STON
    const stonPrice = cardConfig.price;
    
    // Use predefined crypto price for TON, calculate others based on exchange rates
    let cryptoAmount;

    switch (currency) {
      case 'TON':
        cryptoAmount = cardConfig.cryptoPrice; // Use predefined price
        break;
      case 'USDT':
        cryptoAmount = cardConfig.cryptoPrice * 2.5; // 1 TON = 2.5 USDT
        break;
      case 'BTC':
        cryptoAmount = cardConfig.cryptoPrice * 0.000045; // 1 TON = 0.000045 BTC
        break;
      case 'ETH':
        cryptoAmount = cardConfig.cryptoPrice * 0.0007; // 1 TON = 0.0007 ETH
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported currency: ${currency}`
        });
    }

    // Round to appropriate decimal places
    const decimals = {
      TON: 6,
      USDT: 2,
      BTC: 8,
      ETH: 6
    };
    cryptoAmount = parseFloat(cryptoAmount.toFixed(decimals[currency]));

    // Generate unique order ID
    const orderId = generateOrderId('MC');

    // Create payment with Oxapay
    const paymentResult = await createPayment({
      amount: cryptoAmount,
      currency,
      orderId,
      description: `${cardConfig.name} Purchase - ${stonPrice.toLocaleString()} STON`,
      callbackUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/oxapay/webhook`,
      returnUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/mining?payment=return`,
      userEmail,
      userId
    });

    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        error: `Oxapay payment creation failed: ${paymentResult.error}`
      });
    }

    const oxapayData = paymentResult.data;
    const trackId = oxapayData.track_id || oxapayData.id;

    // Create payment record in Firebase
    const paymentData = {
      userId: userId.toString(),
      username: username || null,
      cardNumber,
      stonPrice,
      cryptoAmount,
      currency,
      status: 'pending',
      oxapayId: trackId,
      oxapayStatus: oxapayData.status,
      orderId,
      trackId: trackId, // Store track_id separately for easier lookup
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      oxapayData: {
        track_id: trackId,
        id: oxapayData.id,
        status: oxapayData.status,
        amount: oxapayData.amount,
        currency: oxapayData.currency,
        paymentUrl: oxapayData.payment_url,
        qrCode: oxapayData.qr_code,
        address: oxapayData.address,
        createdAt: oxapayData.created_at,
        expiresAt: oxapayData.expires_at
      }
    };

    // Save to Firebase
    const paymentsRef = collection(db, 'payments');
    const docRef = await addDoc(paymentsRef, paymentData);

    // Send notification to admin
    try {
      const adminNotification = {
        chat_id: (await getServerAdminConfig()).adminChatId,
        text: `💳 <b>Mining Card Payment Created</b>\n` +
              `User: ${username ? `@${username}` : userId}\n` +
              `Card: ${cardConfig.name} (${stonPrice.toLocaleString()} STON)\n` +
              `Amount: ${cryptoAmount} ${currency}\n` +
              `Oxapay ID: ${oxapayData.id}\n` +
              `Status: ${oxapayData.status}`,
        parse_mode: 'HTML'
      };

      await fetch(`https://api.telegram.org/bot${process.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminNotification)
      });
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
    }

    // Build the payment URL with track_id parameter for better return handling
    const paymentUrl = oxapayData.payment_url;
    const enhancedReturnUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/mining?purchase=success&track_id=${trackId}`;

    return res.status(200).json({
      success: true,
      data: {
        paymentId: docRef.id,
        oxapayId: trackId,
        trackId: trackId,
        orderId,
        status: oxapayData.status,
        paymentUrl: paymentUrl,
        enhancedReturnUrl: enhancedReturnUrl,
        qrCode: oxapayData.qr_code,
        address: oxapayData.address,
        amount: {
          ston: stonPrice,
          crypto: cryptoAmount,
          currency
        },
        cardNumber,
        expiresAt: oxapayData.expires_at,
        estimatedTime: '5-15 minutes'
      }
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
