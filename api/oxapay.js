/**
 * Consolidated OxaPay API handler
 * Handles all OxaPay-related operations in one endpoint
 */

// Note: Import replaced with inline functions to avoid server/client compatibility issues
import { db } from '../src/lib/serverFirebase.js';
import { doc, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { notifyAdminDirect } from './telegram-bot.js';

// OxaPay API configuration
const OXAPAY_MERCHANT_API_KEY = process.env.VITE_OXAPAY_MERCHANT_API_KEY;
const OXAPAY_PAYOUT_API_KEY = process.env.VITE_OXAPAY_PAYOUT_API_KEY;
const OXAPAY_BASE_URL = 'https://api.oxapay.com';

// Validate API keys on load
if (!OXAPAY_MERCHANT_API_KEY) {
  console.error('Missing VITE_OXAPAY_MERCHANT_API_KEY environment variable');
}
if (!OXAPAY_PAYOUT_API_KEY) {
  console.error('Missing VITE_OXAPAY_PAYOUT_API_KEY environment variable');
}

// Supported cryptocurrencies
const SUPPORTED_CRYPTOS = {
  TON: {
    symbol: 'TON',
    name: 'Toncoin',
    network: 'TON',
    decimals: 9,
    minAmount: 0.1,
    maxAmount: 10
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'TON',
    decimals: 6,
    minAmount: 1,
    maxAmount: 50000
  }
};

// Base OxaPay API request function
const makeOxapayRequest = async (endpoint, method = 'GET', data = null, usePayoutKey = false) => {
  const url = `${OXAPAY_BASE_URL}${endpoint}`;
  
  const apiKey = usePayoutKey ? OXAPAY_PAYOUT_API_KEY : OXAPAY_MERCHANT_API_KEY;
  const apiKeyHeader = usePayoutKey ? 'payout_api_key' : 'merchant_api_key';
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      [apiKeyHeader]: apiKey,
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    console.log(`Making OxaPay ${method} request to:`, url);
    console.log('Request data:', JSON.stringify(data, null, 2));

    const response = await fetch(url, config);
    const responseData = await response.json();

    console.log('OxaPay response status:', response.status);
    console.log('OxaPay response data:', JSON.stringify(responseData, null, 2));

    if (!response.ok || responseData.status !== 200) {
      const errorMessage = responseData.message || 'Unknown error';
      const statusCode = responseData.status || response.status;
      
      console.error('OxaPay API Error Details:', {
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message,
        error: responseData.error,
        fullResponse: responseData
      });
      
      throw new Error(`OxaPay API error: ${statusCode} - ${errorMessage}`);
    }

    return {
      success: true,
      data: responseData.data,
      status: response.status
    };
  } catch (error) {
    console.error('OxaPay API request failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.status || 500
    };
  }
};

// Generate unique order ID
const generateOrderId = (prefix = 'ORD') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

// Create payment invoice
const createPayment = async (paymentData) => {
  const {
    amount,
    currency = 'TON',
    orderId,
    description,
    callbackUrl,
    returnUrl,
    userEmail,
    userId
  } = paymentData;

  const cryptoConfig = SUPPORTED_CRYPTOS[currency];
  if (!cryptoConfig) {
    return {
      success: false,
      error: `Unsupported currency: ${currency}`
    };
  }

  if (amount < cryptoConfig.minAmount || amount > cryptoConfig.maxAmount) {
    return {
      success: false,
      error: `Amount must be between ${cryptoConfig.minAmount} and ${cryptoConfig.maxAmount} ${currency}`
    };
  }

  const requestData = {
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    lifetime: 60,
    fee_paid_by_payer: 1,
    under_paid_coverage: 2.5,
    auto_withdrawal: false,
    mixed_payment: false,
    callback_url: callbackUrl,
    return_url: returnUrl,
    email: userEmail || `user${userId}@skyton.app`,
    order_id: orderId,
    thanks_message: `Thank you for your ${currency} payment! Your mining card will be activated shortly.`,
    description: description || `Mining Card Purchase - Order ${orderId}`,
    sandbox: false
  };

  // Remove undefined values
  Object.keys(requestData).forEach(key => {
    if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
      delete requestData[key];
    }
  });

  return await makeOxapayRequest('/v1/payment/invoice', 'POST', requestData, false);
};

// Create payout
const createPayout = async (payoutData) => {
  const {
    address,
    amount,
    currency = 'TON',
    network,
    description,
    callbackUrl,
    memo
  } = payoutData;

  // Validate required fields
  if (!address || !amount || !currency) {
    return {
      success: false,
      error: 'Missing required fields: address, amount, and currency are required'
    };
  }

  const cryptoConfig = SUPPORTED_CRYPTOS[currency];
  if (!cryptoConfig) {
    return {
      success: false,
      error: `Unsupported currency: ${currency}`
    };
  }

  // Validate amount format and range
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      success: false,
      error: 'Amount must be a positive number'
    };
  }

  if (numericAmount < cryptoConfig.minAmount || numericAmount > cryptoConfig.maxAmount) {
    return {
      success: false,
      error: `Amount must be between ${cryptoConfig.minAmount} and ${cryptoConfig.maxAmount} ${currency}`
    };
  }

  // Prepare request data according to OxaPay Payout API specification
  const requestData = {
    address: address.trim(),
    currency: currency.toUpperCase(),
    amount: numericAmount,
  };

  // Add network field - required for TON and other multi-network currencies
  if (network) {
    requestData.network = network;
  } else if (currency.toUpperCase() === 'TON') {
    // TON requires network parameter
    requestData.network = 'TON';
  }

  if (description) {
    requestData.description = description;
  }

  if (callbackUrl) {
    requestData.callback_url = callbackUrl;
  }

  if (memo) {
    requestData.memo = memo;
  }

  // Check if payout API key is configured
  if (!OXAPAY_PAYOUT_API_KEY) {
    return {
      success: false,
      error: 'Payout API key not configured. Please set VITE_OXAPAY_PAYOUT_API_KEY environment variable.'
    };
  }

  console.log('Creating payout with data:', JSON.stringify(requestData, null, 2));

  return await makeOxapayRequest('/v1/payout', 'POST', requestData, true);
};

// Get payment status
const getPaymentStatus = async (trackId) => {
  if (!trackId) {
    return {
      success: false,
      error: 'Track ID is required'
    };
  }

  return await makeOxapayRequest(`/v1/payment/${trackId}`, 'GET', null, false);
};

// Get payout status
const getPayoutStatus = async (trackId) => {
  if (!trackId) {
    return {
      success: false,
      error: 'Track ID is required'
    };
  }

  return await makeOxapayRequest(`/v1/payout/${trackId}`, 'GET', null, true);
};

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
      
      case 'payout':
        return await handleCreatePayout(req, res);
      
      case 'check-payout':
        return await handleCheckPayout(req, res);
      
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
            'payout',
            'check-payout',
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

    // Debug: Log the actual payment result structure
    console.log('Payment result structure:', JSON.stringify(paymentResult, null, 2));
    console.log('Payment result data:', JSON.stringify(paymentResult.data, null, 2));

    // Extract payment data with fallback checks
    const paymentData = paymentResult.data || {};
    const paymentId = paymentData.payment_id || paymentData.track_id || paymentData.id;
    const paymentUrl = paymentData.payment_url || paymentData.link || paymentData.url;
    const expiresAt = paymentData.expires_at || paymentData.expire_at;

    // Store purchase record in Firebase
    const purchaseRef = doc(db, 'purchases', orderId);
    const purchaseData = {
      orderId: orderId,
      userId: userId,
      username: username || '',
      cardNumber: cardNumber,
      cardType: `card${cardNumber}`,
      amount: cryptoAmount,
      currency: currency,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    // Only add optional fields if they exist
    if (paymentId) {
      purchaseData.paymentId = paymentId;
    }
    if (paymentUrl) {
      purchaseData.paymentUrl = paymentUrl;
    }
    if (expiresAt) {
      purchaseData.expiresAt = new Date(expiresAt);
    }

    await setDoc(purchaseRef, purchaseData);

    // Notify admin of new payment request
    const notificationData = {
      userId: userId,
      username: username || 'Unknown',
      cardNumber: cardNumber,
      cardType: `Card ${cardNumber}`,
      amount: cryptoAmount,
      currency: currency,
      orderId: orderId
    };

    if (paymentId) {
      notificationData.paymentId = paymentId;
    }
    if (paymentUrl) {
      notificationData.paymentUrl = paymentUrl;
    }

    await notifyAdminDirect('payment_created', notificationData);

    // Prepare response data
    const responseData = {
      order_id: orderId,
      amount: cryptoAmount,
      currency: currency
    };

    if (paymentUrl) {
      responseData.payment_url = paymentUrl;
    }
    if (paymentId) {
      responseData.payment_id = paymentId;
    }
    if (expiresAt) {
      responseData.expires_at = expiresAt;
    }

    return res.status(200).json({
      success: true,
      data: responseData
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
    const { paymentId, orderId, trackId } = req.method === 'GET' ? req.query : req.body;

    if (!paymentId && !orderId && !trackId) {
      return res.status(400).json({ 
        error: 'Missing required field: paymentId, orderId, or trackId' 
      });
    }

    let purchaseDoc;
    
    if (orderId) {
      // Find by order ID
      const purchaseRef = doc(db, 'purchases', orderId);
      purchaseDoc = await getDoc(purchaseRef);
    } else if (trackId) {
      // trackId is usually same as orderId or we need to find by paymentId
      const purchaseRef = doc(db, 'purchases', trackId);
      purchaseDoc = await getDoc(purchaseRef);
      
      // If not found by trackId as document ID, we might need to query by paymentId field
      if (!purchaseDoc.exists()) {
        // For now, return error - could implement query by paymentId field if needed
        return res.status(404).json({ 
          error: 'Purchase not found by trackId. Please provide orderId instead.' 
        });
      }
    } else {
      // Find by payment ID (would need a query - simplified for now)
      return res.status(400).json({ 
        error: 'Please provide orderId or trackId for status check' 
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
      status: purchase.status,
      data: {
        order_id: purchase.orderId,
        payment_id: purchase.paymentId,
        status: purchase.status,
        amount: purchase.amount,
        currency: purchase.currency,
        created_at: purchase.createdAt,
        updated_at: purchase.updatedAt,
        cardNumber: purchase.cardNumber,
        cardName: `Card ${purchase.cardNumber}`
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

// Create payout handler for withdrawals
async function handleCreatePayout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, amount, currency = 'TON', network, description, withdrawalId, userId } = req.body;

    if (!address || !amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: address, amount' 
      });
    }

    // Create payout request using OxaPay v1 API
    const payoutResult = await createPayout({
      address: address,
      amount: parseFloat(amount),
      currency: currency,
      network: network,
      description: description || `SkyTON withdrawal payout`,
      callbackUrl: `${req.headers.origin || 'https://skyton.vercel.app'}/api/oxapay?action=webhook`,
    });

    if (!payoutResult.success) {
      console.error('Failed to create payout:', payoutResult.error);
      return res.status(500).json({ 
        error: 'Failed to create payout',
        details: payoutResult.error 
      });
    }

    // Store payout record in Firebase if withdrawalId is provided
    if (withdrawalId) {
      const payoutRef = doc(db, 'payouts', payoutResult.data.track_id);
      await setDoc(payoutRef, {
        trackId: payoutResult.data.track_id,
        withdrawalId: withdrawalId,
        userId: userId,
        address: address,
        amount: amount,
        currency: currency,
        network: network,
        status: payoutResult.data.status || 'pending',
        description: description,
        createdAt: serverTimestamp()
      });

      // Notify admin of payout creation
      await notifyAdminDirect('payout_created', {
        userId: userId,
        withdrawalId: withdrawalId,
        trackId: payoutResult.data.track_id,
        address: address,
        amount: amount,
        currency: currency,
        status: payoutResult.data.status || 'pending'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        track_id: payoutResult.data.track_id,
        status: payoutResult.data.status,
        address: address,
        amount: amount,
        currency: currency
      }
    });

  } catch (error) {
    console.error('Error in handleCreatePayout:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Check payout status handler
async function handleCheckPayout(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackId } = req.method === 'GET' ? req.query : req.body;

    if (!trackId) {
      return res.status(400).json({ 
        error: 'Missing required field: trackId' 
      });
    }

    // Check status with OxaPay
    const statusResult = await getPayoutStatus(trackId);

    if (!statusResult.success) {
      return res.status(500).json({ 
        error: 'Failed to check payout status',
        details: statusResult.error 
      });
    }

    return res.status(200).json({
      success: true,
      data: statusResult.data
    });

  } catch (error) {
    console.error('Error in handleCheckPayout:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
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
