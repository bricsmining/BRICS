/**
 * API endpoint to check OxaPay payment status and activate mining cards
 * POST /api/oxapay/check-payment
 */

import { db, getServerAdminConfig } from '../../src/lib/serverFirebase.js';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';

const OXAPAY_API_KEY = 'UH27B3-MCP7GB-Q3WCXJ-D331S3';
const OXAPAY_BASE_URL = 'https://api.oxapay.com';

// Individual card configurations (should match frontend)
const INDIVIDUAL_CARDS = {
  1: {
    id: 1,
    name: 'Basic Miner Card',
    validityDays: 7
  },
  2: {
    id: 2,
    name: 'Advanced Miner Card',
    validityDays: 15
  },
  3: {
    id: 3,
    name: 'Pro Miner Card',
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
    const { trackId, userId } = req.body;

    if (!trackId) {
      return res.status(400).json({
        success: false,
        error: 'Track ID is required'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    console.log(`Checking payment status for track ID: ${trackId}, User: ${userId}`);

    // Check payment status with OxaPay
    const paymentStatus = await checkOxaPayStatus(trackId);
    
    if (!paymentStatus.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to check payment status: ${paymentStatus.error}`
      });
    }

    const paymentData = paymentStatus.data;
    console.log(`Payment status for ${trackId}:`, paymentData.status);

    // Find the payment record in our database
    const paymentRecord = await findPaymentRecord(trackId);
    
    if (!paymentRecord) {
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    const { paymentDoc, paymentRef, paymentInfo } = paymentRecord;

    // Update payment record with latest status
    await updateDoc(paymentRef, {
      oxapayStatus: paymentData.status,
      updatedAt: serverTimestamp(),
      'oxapayData.status': paymentData.status,
      'oxapayData.lastChecked': new Date().toISOString()
    });

    // Handle different payment statuses
    if (paymentData.status === 'paid' || paymentData.status === 'completed' || paymentData.status === 'confirmed') {
      // Payment successful - activate mining card if not already activated
      if (paymentInfo.status !== 'completed') {
        console.log(`Activating mining card for payment ${trackId}`);
        
        await activateMiningCard(paymentInfo.userId, paymentInfo.cardNumber, paymentDoc.id);
        
        // Update payment status to completed
        await updateDoc(paymentRef, {
          status: 'completed',
          completedAt: serverTimestamp()
        });

        // Send success notification
        await sendPaymentNotification(paymentInfo, 'success', paymentData.txs?.[0]?.tx_hash);
      }

      return res.status(200).json({
        success: true,
        status: 'completed',
        message: 'Payment completed and card activated',
        data: {
          trackId,
          status: paymentData.status,
          cardNumber: paymentInfo.cardNumber,
          cardName: INDIVIDUAL_CARDS[paymentInfo.cardNumber]?.name
        }
      });

    } else if (paymentData.status === 'failed' || paymentData.status === 'expired' || paymentData.status === 'cancelled') {
      // Payment failed
      await updateDoc(paymentRef, {
        status: 'failed',
        failedAt: serverTimestamp(),
        failureReason: paymentData.status
      });

      return res.status(200).json({
        success: false,
        status: paymentData.status,
        message: `Payment ${paymentData.status}`,
        data: {
          trackId,
          status: paymentData.status
        }
      });

    } else {
      // Payment still pending
      return res.status(200).json({
        success: true,
        status: 'pending',
        message: 'Payment is still processing',
        data: {
          trackId,
          status: paymentData.status
        }
      });
    }

  } catch (error) {
    console.error('Check payment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * Check payment status with OxaPay API
 */
async function checkOxaPayStatus(trackId) {
  try {
    const response = await fetch(`${OXAPAY_BASE_URL}/v1/payment/${trackId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'merchant_api_key': OXAPAY_API_KEY,
      },
    });

    const responseData = await response.json();

    console.log('OxaPay status response:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok || responseData.status !== 200) {
      throw new Error(`OxaPay API error: ${responseData.message || 'Unknown error'}`);
    }

    return {
      success: true,
      data: responseData.data
    };
  } catch (error) {
    console.error('OxaPay status check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find payment record in Firebase
 */
async function findPaymentRecord(trackId) {
  try {
    const paymentsRef = collection(db, 'payments');
    
    // First try: search by trackId field
    let querySnapshot = await getDocs(query(paymentsRef, where('trackId', '==', trackId)));
    
    // Second try: search by oxapayId (track_id)
    if (querySnapshot.empty) {
      querySnapshot = await getDocs(query(paymentsRef, where('oxapayId', '==', trackId)));
    }
    
    // Third try: search in oxapayData.track_id
    if (querySnapshot.empty) {
      querySnapshot = await getDocs(query(paymentsRef, where('oxapayData.track_id', '==', trackId)));
    }
    
    // Fourth try: search in oxapayData.id
    if (querySnapshot.empty) {
      querySnapshot = await getDocs(query(paymentsRef, where('oxapayData.id', '==', trackId)));
    }

    if (querySnapshot.empty) {
      console.error(`Payment record not found for track ID: ${trackId}`);
      return null;
    }

    const paymentDoc = querySnapshot.docs[0];
    const paymentInfo = paymentDoc.data();
    const paymentRef = doc(db, 'payments', paymentDoc.id);

    return { paymentDoc, paymentRef, paymentInfo };
  } catch (error) {
    console.error('Error finding payment record:', error);
    return null;
  }
}

/**
 * Activate mining card for user (Individual Card System)
 * If user already has the same card, extend its validity instead of creating new instance
 */
async function activateMiningCard(userId, cardNumber, paymentId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error(`User not found: ${userId}`);
    }

    const userData = userDoc.data();
    const currentCardData = userData.cardData || {};
    
    const cardConfig = INDIVIDUAL_CARDS[cardNumber];
    if (!cardConfig) {
      throw new Error(`Invalid card number: ${cardNumber}`);
    }
    
    // Look for existing card of the same type
    const existingCardKey = Object.keys(currentCardData)
      .find(key => key.startsWith(`${cardNumber}_`) && currentCardData[key].active);
    
    const now = new Date();
    let newExpirationDate;
    let cardKey;
    let updateData = {};
    
    if (existingCardKey && currentCardData[existingCardKey]) {
      // Extend existing card validity
      cardKey = existingCardKey;
      const existingCard = currentCardData[existingCardKey];
      const currentExpiration = existingCard.expirationDate.toDate ? 
        existingCard.expirationDate.toDate() : 
        new Date(existingCard.expirationDate);
      
      // Reset validity to full period from now (renewal gives full validity)
      newExpirationDate = new Date(now);
      newExpirationDate.setDate(newExpirationDate.getDate() + cardConfig.validityDays);
      
      // Update existing card with extended validity and increased quantity
      updateData[`cardData.${cardKey}`] = {
        ...existingCard,
        expirationDate: newExpirationDate,
        quantity: (existingCard.quantity || 1) + 1,
        lastRenewalDate: serverTimestamp(),
        renewalHistory: arrayUnion({
          renewedAt: serverTimestamp(),
          paymentId,
          validityReset: cardConfig.validityDays,
          newExpirationDate: newExpirationDate
        })
      };
      
      console.log(`Extended existing mining card ${cardNumber} for user ${userId}. New expiration: ${newExpirationDate}`);
    } else {
      // Create new card instance (first time purchase)
      const existingInstances = Object.keys(currentCardData)
        .filter(key => key.startsWith(`${cardNumber}_`))
        .length;
      
      cardKey = `${cardNumber}_${existingInstances + 1}`;
      newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + cardConfig.validityDays);
      
      // Create new card
      updateData[`cardData.${cardKey}`] = {
        cardId: cardNumber,
        purchaseDate: serverTimestamp(),
        expirationDate: newExpirationDate,
        validityDays: cardConfig.validityDays,
        quantity: 1,
        active: true,
        paymentId,
        method: 'oxapay',
        renewalHistory: []
      };
      
      console.log(`Created new mining card ${cardNumber} (instance ${cardKey}) for user ${userId}`);
    }
    
    // Add purchase history entry
    updateData.lastCardPurchase = serverTimestamp();
    updateData[`cardPurchaseHistory.${paymentId}`] = {
      purchasedAt: serverTimestamp(),
      paymentId,
      method: 'oxapay',
      cardNumber,
      cardKey,
      expiresAt: newExpirationDate,
      action: existingCardKey ? 'renewal' : 'new_purchase'
    };

    // Update user's card data
    await updateDoc(userRef, updateData);

    console.log(`Mining card ${cardNumber} activation completed for user ${userId}`);
  } catch (error) {
    console.error('Error activating mining card:', error);
    throw error;
  }
}

/**
 * Send payment notification to admin
 */
async function sendPaymentNotification(paymentData, type, txHash) {
  try {
    let message;
    
    if (type === 'success') {
      message = `✅ <b>Mining Card Payment Successful</b>\n` +
                `User: ${paymentData.username ? `@${paymentData.username}` : paymentData.userId}\n` +
                `Card: ${INDIVIDUAL_CARDS[paymentData.cardNumber]?.name}\n` +
                `Amount: ${paymentData.cryptoAmount} ${paymentData.currency}\n` +
                `TX Hash: ${txHash || 'N/A'}\n` +
                `Card Activated: Yes`;
    } else {
      message = `❌ <b>Mining Card Payment Failed</b>\n` +
                `User: ${paymentData.username ? `@${paymentData.username}` : paymentData.userId}\n` +
                `Card: ${INDIVIDUAL_CARDS[paymentData.cardNumber]?.name}\n` +
                `Amount: ${paymentData.cryptoAmount} ${paymentData.currency}`;
    }

    await fetch(`https://api.telegram.org/bot${process.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: (await getServerAdminConfig()).adminChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}
