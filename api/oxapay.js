/**
 * Consolidated OxaPay API handler
 * Handles all OxaPay-related operations in one endpoint
 */

import { createPayment, getPaymentStatus, generateOrderId } from '../src/services/oxapayService.js';
import { db } from '../src/lib/serverFirebase.js';
import { doc, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { notifyAdminDirect } from './telegram-bot.js';

export default async function handler(req, res) {
  // Extract the action from query parameter or body
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'create-payment':
        return await handleCreatePayment(req, res);
      
      case 'check-payment':
        return await handleCheckPayment(req, res);
      
      case 'webhook':
        return await handleWebhook(req, res);
      
      case 'status':
        return await handleStatus(req, res);
      
      case 'callback':
        return await handleCallback(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: [
            'create-payment', 
            'check-payment', 
            'webhook', 
            'status',
            'callback'
          ]
        });
    }
  } catch (error) {
    console.error('Error in consolidated OxaPay handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      action: action || 'unknown'
    });
  }
}

// Create payment handler
async function handleCreatePayment(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, username, cardNumber, currency = 'TON' } = req.body;

    if (!userId || !cardNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, cardNumber' 
      });
    }

    // Get admin config to get card prices
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    if (!adminConfigSnap.exists()) {
      return res.status(500).json({ error: 'Admin config not found' });
    }

    const adminConfig = adminConfigSnap.data();
    
    // Get card price from admin config
    const cardPriceField = `card${cardNumber}CryptoPrice`;
    const cryptoAmount = adminConfig[cardPriceField] || (cardNumber === 1 ? 0.1 : cardNumber === 2 ? 0.25 : 0.5);

    // Generate order ID
    const orderId = generateOrderId('card');
    
    // Create payment request
    const paymentResult = await createPayment({
      amount: cryptoAmount,
      currency: currency,
      orderId: orderId,
      description: `Card ${cardNumber} Purchase`,
      callbackUrl: `${req.headers.origin || 'https://skyton.vercel.app'}/api/oxapay?action=webhook`,
      returnUrl: `${req.headers.origin || 'https://skyton.vercel.app'}/mining?payment=return`,
      userId: userId,
      userEmail: `user${userId}@skyton.app`
    });

    if (!paymentResult.success) {
      console.error('Failed to create payment:', paymentResult.error);
      return res.status(500).json({ 
        error: 'Failed to create payment',
        details: paymentResult.error 
      });
    }

    // Store purchase record in Firebase
    const purchaseRef = doc(db, 'purchases', orderId);
    await setDoc(purchaseRef, {
      orderId: orderId,
      userId: userId,
      username: username || '',
      cardNumber: cardNumber,
      cardType: `card${cardNumber}`,
      amount: cryptoAmount,
      currency: currency,
      status: 'pending',
      paymentId: paymentResult.data.payment_id,
      paymentUrl: paymentResult.data.payment_url,
      createdAt: serverTimestamp(),
      expiresAt: paymentResult.data.expires_at ? new Date(paymentResult.data.expires_at) : null
    });

    // Notify admin of new payment request
    await notifyAdminDirect('payment_created', {
      userId: userId,
      username: username || 'Unknown',
      cardNumber: cardNumber,
      cardType: `Card ${cardNumber}`,
      amount: cryptoAmount,
      currency: currency,
      orderId: orderId,
      paymentId: paymentResult.data.payment_id,
      paymentUrl: paymentResult.data.payment_url
    });

    return res.status(200).json({
      success: true,
      data: {
        payment_url: paymentResult.data.payment_url,
        payment_id: paymentResult.data.payment_id,
        order_id: orderId,
        amount: cryptoAmount,
        currency: currency,
        expires_at: paymentResult.data.expires_at
      }
    });

  } catch (error) {
    console.error('Error in handleCreatePayment:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Check payment status handler
async function handleCheckPayment(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, orderId } = req.method === 'GET' ? req.query : req.body;

    if (!paymentId && !orderId) {
      return res.status(400).json({ 
        error: 'Missing required field: paymentId or orderId' 
      });
    }

    let purchaseDoc;
    
    if (orderId) {
      // Find by order ID
      const purchaseRef = doc(db, 'purchases', orderId);
      purchaseDoc = await getDoc(purchaseRef);
    } else {
      // Find by payment ID (would need a query - simplified for now)
      return res.status(400).json({ 
        error: 'Please provide orderId for status check' 
      });
    }

    if (!purchaseDoc.exists()) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const purchase = purchaseDoc.data();
    
    // Check status with OxaPay if still pending
    if (purchase.status === 'pending' && purchase.paymentId) {
      const statusResult = await getPaymentStatus(purchase.paymentId);
      
      if (statusResult.success) {
        // Update local status if changed
        const newStatus = statusResult.data.status;
        if (newStatus !== purchase.status) {
          await updateDoc(purchaseDoc.ref, {
            status: newStatus,
            updatedAt: serverTimestamp()
          });
          purchase.status = newStatus;
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        order_id: purchase.orderId,
        payment_id: purchase.paymentId,
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
        created_at: purchase.createdAt,
        updated_at: purchase.updatedAt
      }
    });

  } catch (error) {
    console.error('Error in handleCheckPayment:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Simple webhook handler
async function handleWebhook(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, payment_id, order_id, amount, currency } = req.body;

    console.log('Received OxaPay webhook:', {
      status, payment_id, order_id, amount, currency
    });

    // Update purchase status and notify admin
    if (order_id) {
      const purchaseRef = doc(db, 'purchases', order_id);
      const purchaseDoc = await getDoc(purchaseRef);

      if (purchaseDoc.exists()) {
        const purchase = purchaseDoc.data();
        
        // Update purchase status
        await updateDoc(purchaseRef, {
          status: status,
          finalAmount: amount,
          finalCurrency: currency,
          completedAt: status === 'completed' ? serverTimestamp() : null,
          updatedAt: serverTimestamp()
        });

        // Notify admin based on payment status
        switch (status) {
          case 'completed':
          case 'confirmed':
            // Add mining card to user
            const userRef = doc(db, 'users', purchase.userId);
            await updateDoc(userRef, {
              [`cards.card${purchase.cardNumber}`]: increment(1),
              lastPurchase: serverTimestamp()
            });

            // Notify admin of successful payment
            await notifyAdminDirect('payment_completed', {
              userId: purchase.userId,
              username: purchase.username || 'Unknown',
              cardNumber: purchase.cardNumber,
              cardType: `Card ${purchase.cardNumber}`,
              amount: amount,
              currency: currency,
              orderId: order_id,
              paymentId: payment_id
            });
            break;

          case 'failed':
          case 'cancelled':
          case 'expired':
            // Notify admin of failed payment
            await notifyAdminDirect('payment_failed', {
              userId: purchase.userId,
              username: purchase.username || 'Unknown',
              cardNumber: purchase.cardNumber,
              cardType: `Card ${purchase.cardNumber}`,
              amount: amount,
              currency: currency,
              orderId: order_id,
              paymentId: payment_id,
              reason: status
            });
            break;

          case 'pending':
          case 'waiting':
            // Notify admin of payment in progress
            await notifyAdminDirect('payment_pending', {
              userId: purchase.userId,
              username: purchase.username || 'Unknown',
              cardNumber: purchase.cardNumber,
              cardType: `Card ${purchase.cardNumber}`,
              amount: amount,
              currency: currency,
              orderId: order_id,
              paymentId: payment_id,
              status: status
            });
            break;

          default:
            // Notify admin of other status updates
            await notifyAdminDirect('payment_status_update', {
              userId: purchase.userId,
              username: purchase.username || 'Unknown',
              cardNumber: purchase.cardNumber,
              cardType: `Card ${purchase.cardNumber}`,
              amount: amount,
              currency: currency,
              orderId: order_id,
              paymentId: payment_id,
              status: status
            });
        }
      } else {
        // Notify admin of webhook for unknown purchase
        await notifyAdminDirect('payment_webhook_unknown', {
          orderId: order_id,
          paymentId: payment_id,
          amount: amount,
          currency: currency,
          status: status
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in handleWebhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Status handler
async function handleStatus(req, res) {
  return res.status(200).json({ 
    status: 'OK',
    service: 'OxaPay API Handler',
    timestamp: new Date().toISOString()
  });
}

// Callback handler - redirects to webhook handler for simplicity
async function handleCallback(req, res) {
  return await handleWebhook(req, res);
}
