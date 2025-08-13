/**
 * API endpoint to create Oxapay withdrawal
 * POST /api/oxapay/create-withdrawal
 */

import { createWithdrawal, generateOrderId, convertStonToCrypto, validateCryptoAddress } from '../../src/services/oxapayService.js';
import { db, getServerAdminConfig } from '../../src/lib/serverFirebase.js';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';

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
      stonAmount,
      walletAddress,
      currency = 'TON',
      userEmail,
      username
    } = req.body;

    // Validate required fields
    if (!userId || !stonAmount || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, stonAmount, walletAddress'
      });
    }

    // Validate wallet address format
    const addressValidation = validateCryptoAddress(walletAddress, currency);
    if (!addressValidation.valid) {
      return res.status(400).json({
        success: false,
        error: addressValidation.error
      });
    }

    // Convert STON to crypto amount
    const conversionResult = await convertStonToCrypto(stonAmount, currency);
    if (!conversionResult.success) {
      return res.status(400).json({
        success: false,
        error: conversionResult.error
      });
    }

    const { cryptoAmount } = conversionResult.data;

    // Verify user has sufficient balance
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userData = userDoc.data();
    const userBalance = userData.balance || 0;

    if (userBalance < stonAmount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Required: ${stonAmount} STON, Available: ${userBalance} STON`
      });
    }

    // Generate unique order ID
    const orderId = generateOrderId('WD');

    // Create withdrawal with Oxapay
    const withdrawalResult = await createWithdrawal({
      amount: cryptoAmount,
      currency,
      address: walletAddress,
      orderId,
      description: `STON Withdrawal - ${stonAmount} STON to ${cryptoAmount} ${currency}`,
      callbackUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/oxapay/webhook`,
      userId,
      userEmail
    });

    if (!withdrawalResult.success) {
      return res.status(500).json({
        success: false,
        error: `Oxapay withdrawal creation failed: ${withdrawalResult.error}`
      });
    }

    const oxapayData = withdrawalResult.data;

    // Create withdrawal record in Firebase
    const withdrawalData = {
      userId: userId.toString(),
      username: username || null,
      amount: stonAmount,
      cryptoAmount,
      currency,
      walletAddress,
      userBalance,
      status: 'processing',
      oxapayId: oxapayData.id,
      oxapayStatus: oxapayData.status,
      orderId,
      createdAt: serverTimestamp(),
      oxapayData: {
        id: oxapayData.id,
        status: oxapayData.status,
        amount: oxapayData.amount,
        currency: oxapayData.currency,
        address: oxapayData.address,
        txHash: oxapayData.tx_hash || null,
        createdAt: oxapayData.created_at,
        updatedAt: oxapayData.updated_at
      }
    };

    // Save to Firebase
    const { addDoc, collection } = await import('firebase/firestore');
    const withdrawalsRef = collection(db, 'withdrawals');
    const docRef = await addDoc(withdrawalsRef, withdrawalData);

    // Deduct amount from user balance immediately (will be refunded if withdrawal fails)
    await updateDoc(userRef, {
      balance: userBalance - stonAmount,
      lastWithdrawalAt: serverTimestamp()
    });

    // Send notification to admin
    try {
      const adminNotification = {
        chat_id: (await getServerAdminConfig()).adminChatId,
        text: `🔄 <b>Oxapay Withdrawal Created</b>\n` +
              `User: ${username ? `@${username}` : userId}\n` +
              `Amount: ${stonAmount} STON → ${cryptoAmount} ${currency}\n` +
              `Address: ${walletAddress}\n` +
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

    return res.status(200).json({
      success: true,
      data: {
        withdrawalId: docRef.id,
        oxapayId: oxapayData.id,
        orderId,
        status: oxapayData.status,
        amount: {
          ston: stonAmount,
          crypto: cryptoAmount,
          currency
        },
        address: walletAddress,
        estimatedTime: '5-30 minutes',
        trackingUrl: oxapayData.tracking_url || null
      }
    });

  } catch (error) {
    console.error('Create withdrawal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
