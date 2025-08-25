/**
 * Consolidated OxaPay API handler
 * Handles all OxaPay-related operations in one endpoint
 */

// Note: Import replaced with inline functions to avoid server/client compatibility issues
import { db } from '../src/lib/serverFirebase.js';
import { doc, updateDoc, getDoc, setDoc, increment, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
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
      
      const detailedError = new Error(`OxaPay API error: ${statusCode} - ${errorMessage}`);
      detailedError.oxapayDetails = {
        httpStatus: statusCode,
        apiStatus: responseData.status,
        message: responseData.message,
        error: responseData.error,
        fullResponse: responseData
      };
      throw detailedError;
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
      status: error.status || 500,
      oxapayDetails: error.oxapayDetails || null
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
    const { 
      userId, 
      userEmail, 
      cardNumber, 
      cardPrice,
      validityDays,
      currency = 'TON',
      amount,
      orderId,
      description,
      callbackUrl,
      returnUrl,
      username
    } = req.body;

    if (!userId || !cardNumber || !amount || !orderId) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, cardNumber, amount, orderId' 
      });
    }

    // Get admin config for card details (fallback)
    let adminConfig = {};
    try {
      const adminConfigRef = doc(db, 'admin', 'config');
      const adminConfigSnap = await getDoc(adminConfigRef);
      if (adminConfigSnap.exists()) {
        adminConfig = adminConfigSnap.data();
      }
    } catch (error) {
      console.warn('Could not load admin config:', error.message);
    }

    // Use provided amount or fallback to admin config
    const cryptoAmount = amount || adminConfig[`card${cardNumber}CryptoPrice`] || (cardNumber === 1 ? 0.1 : cardNumber === 2 ? 0.25 : 0.5);
    
    // Create payment request with proper callback/return URLs
    const paymentResult = await createPayment({
      amount: cryptoAmount,
      currency: currency,
      orderId: orderId,
      description: description || `Mining Card ${cardNumber} Purchase`,
      // IMPORTANT: Proper URL usage
      callbackUrl: callbackUrl, // Backend webhook for reliable payment confirmation
      returnUrl: returnUrl,     // User return URL for UI convenience
      userId: userId,
      userEmail: userEmail || `user${userId}@skyton.app`
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
      userEmail: userEmail || `user${userId}@skyton.app`,
      cardNumber: cardNumber,
      cardPrice: cardPrice,
      validityDays: validityDays,
      cardType: `card${cardNumber}`,
      amount: cryptoAmount,
      currency: currency,
      status: 'pending',
      type: 'mining_card',
      createdAt: serverTimestamp(),
      oxapayResponse: paymentData
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

    // Notify user about invoice creation
    if (paymentUrl) {
      try {
        await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=user&userId=${userId}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': process.env.ADMIN_API_KEY
          },
          body: JSON.stringify({
            type: 'payment_invoice_created',
            data: {
              userId: userId,
              userName: username || 'User',
              cardName: `Card ${cardNumber}`,
              amount: cryptoAmount,
              currency: currency,
              paymentUrl: paymentUrl,
              orderId: orderId,
              expiresAt: expiresAt ? new Date(expiresAt).toLocaleString() : null
            }
          })
        });
      } catch (error) {
        console.error('Failed to send invoice notification to user:', error);
      }
    }

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
      console.log(`[CHECK-PAYMENT] Searching for trackId: ${trackId}`);
      
      // trackId might be the same as orderId, or we need to query by paymentId/trackId field
      // First try trackId as document ID
      let purchaseRef = doc(db, 'purchases', trackId);
      purchaseDoc = await getDoc(purchaseRef);
      console.log(`[CHECK-PAYMENT] Direct trackId lookup exists: ${purchaseDoc.exists()}`);
      
      // If not found by trackId as document ID, query by paymentId field
      if (!purchaseDoc.exists()) {
        console.log(`[CHECK-PAYMENT] Querying by paymentId field...`);
        
        // Query purchases collection for a document with paymentId matching trackId
        const purchasesCollection = collection(db, 'purchases');
        const purchaseQuery = query(purchasesCollection, where('paymentId', '==', trackId));
        const querySnapshot = await getDocs(purchaseQuery);
        
        console.log(`[CHECK-PAYMENT] PaymentId query results: ${querySnapshot.size} documents`);
        
        if (!querySnapshot.empty) {
          purchaseDoc = querySnapshot.docs[0];
          console.log(`[CHECK-PAYMENT] Found by paymentId: ${purchaseDoc.id}`);
        } else {
          // Alternative: try to find by track_id in oxapayResponse
          console.log(`[CHECK-PAYMENT] Querying by oxapayResponse.track_id field...`);
          const trackIdQuery = query(purchasesCollection, where('oxapayResponse.data.track_id', '==', trackId));
          const trackIdSnapshot = await getDocs(trackIdQuery);
          
          console.log(`[CHECK-PAYMENT] Track_id query results: ${trackIdSnapshot.size} documents`);
          
          if (!trackIdSnapshot.empty) {
            purchaseDoc = trackIdSnapshot.docs[0];
            console.log(`[CHECK-PAYMENT] Found by oxapayResponse.data.track_id: ${purchaseDoc.id}`);
          } else {
            console.log(`[CHECK-PAYMENT] No purchase found for trackId: ${trackId}`);
            return res.status(404).json({ 
              error: `Purchase not found by trackId: ${trackId}. Checked direct lookup, paymentId field, and oxapayResponse.data.track_id.` 
            });
          }
        }
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
    // Try different field names that OxaPay might use
    const { 
      status, 
      payment_id, 
      paymentId, 
      track_id,
      trackId,
      order_id, 
      orderId,
      amount, 
      currency,
      type,
      tx_hash,
      address
    } = req.body;

    // Use the first available payment ID field
    const finalPaymentId = payment_id || paymentId || track_id || trackId;
    const finalOrderId = order_id || orderId;
    const webhookType = type || 'payment'; // 'payment' or 'payout'

    console.log('Received OxaPay webhook:', {
      status, 
      payment_id: finalPaymentId, 
      order_id: finalOrderId, 
      amount, 
      currency,
      type: webhookType,
      tx_hash,
      address,
      originalBody: req.body
    });

    // Handle different webhook types
    if (webhookType === 'payout' && finalPaymentId) {
      // Handle payout webhook - find withdrawal by trackId
      try {
        const withdrawalsCollection = collection(db, 'withdrawals');
        const withdrawalQuery = query(withdrawalsCollection, where('trackId', '==', finalPaymentId));
        const querySnapshot = await getDocs(withdrawalQuery);
        
        if (!querySnapshot.empty) {
          const withdrawalDoc = querySnapshot.docs[0];
          const withdrawal = withdrawalDoc.data();
          
          // Update withdrawal status
          await updateDoc(withdrawalDoc.ref, {
            status: status.toLowerCase(),
            txHash: tx_hash,
            completedAt: status === 'Confirmed' ? serverTimestamp() : null,
            updatedAt: serverTimestamp()
          });

          // Send payout completion notification
          if (status === 'Confirmed') {
            try {
              await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.ADMIN_API_KEY
                },
                body: JSON.stringify({
                  type: 'payout_success',
                  data: {
                    userId: withdrawal.userId,
                    userName: withdrawal.username || 'Unknown',
                    amount: withdrawal.amount,
                    tonAmount: withdrawal.tonAmount,
                    address: withdrawal.address || address,
                    trackId: finalPaymentId,
                    withdrawalId: withdrawal.id || withdrawalDoc.id,
                    status: status,
                    txHash: tx_hash
                  }
                })
              });
            } catch (error) {
              console.error('Failed to send payout success notification:', error);
            }
          }
        } else {
          console.warn('Withdrawal not found for trackId:', finalPaymentId);
        }
      } catch (error) {
        console.error('Error handling payout webhook:', error);
      }
    } else if (finalOrderId) {
      // Handle payment webhook - existing logic
      const purchaseRef = doc(db, 'purchases', finalOrderId);
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
            // Add individual mining card instance to user
            const userRef = doc(db, 'users', purchase.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              
              // Find next available instance number for this card type
              const existingInstances = Object.keys(userData?.cardData || {})
                .filter(key => key.startsWith(`${purchase.cardNumber}_`))
                .length;
              
              const newCardKey = `${purchase.cardNumber}_${existingInstances + 1}`;
              const now = new Date();
              const expirationDate = new Date(now);
              expirationDate.setDate(expirationDate.getDate() + (purchase.validityDays || 7));
              
              const cardDataUpdate = {
                [`cardData.${newCardKey}`]: {
                  cardId: purchase.cardNumber,
                  purchaseDate: serverTimestamp(),
                  expirationDate: expirationDate,
                  validityDays: purchase.validityDays || 7,
                  active: true,
                  method: 'crypto',
                  instanceNumber: existingInstances + 1,
                  orderId: order_id,
                  paymentId: payment_id
                }
              };

              // Initialize mining data if not exists
              const miningDataUpdate = {
                miningData: {
                  ...userData?.miningData,
                  lastClaimTime: userData?.miningData?.lastClaimTime || serverTimestamp(),
                  totalMined: userData?.miningData?.totalMined || 0,
                  isActive: true,
                },
                lastPurchase: serverTimestamp()
              };

              await updateDoc(userRef, { ...cardDataUpdate, ...miningDataUpdate });
            }

            // Notify admin and channels of successful payment
            try {
              await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.ADMIN_API_KEY
                },
                body: JSON.stringify({
                  type: 'payment_completed',
                  data: {
                    userId: purchase.userId,
                    userName: purchase.username || 'Unknown',
                    cardNumber: purchase.cardNumber,
                    cardType: `Card ${purchase.cardNumber}`,
                    amount: amount,
                    currency: currency,
                    orderId: finalOrderId,
                    paymentId: finalPaymentId
                  }
                })
              });
            } catch (error) {
              console.error('Failed to send payment success notification:', error);
            }
            break;

          case 'failed':
          case 'cancelled':
          case 'expired':
            // Notify admin and channels of failed payment
            try {
              await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.ADMIN_API_KEY
                },
                body: JSON.stringify({
                  type: 'payment_failed',
                  data: {
                    userId: purchase.userId,
                    userName: purchase.username || 'Unknown',
                    cardNumber: purchase.cardNumber,
                    cardType: `Card ${purchase.cardNumber}`,
                    amount: amount,
                    currency: currency,
                    orderId: finalOrderId,
                    paymentId: finalPaymentId,
                    reason: status
                  }
                })
              });
            } catch (error) {
              console.error('Failed to send payment failed notification:', error);
            }
            break;

          case 'pending':
          case 'waiting':
            // Notify admin and channels of payment in progress
            try {
              await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.ADMIN_API_KEY
                },
                body: JSON.stringify({
                  type: 'payment_pending',
                  data: {
                    userId: purchase.userId,
                    userName: purchase.username || 'Unknown',
                    cardNumber: purchase.cardNumber,
                    cardType: `Card ${purchase.cardNumber}`,
                    amount: amount,
                    currency: currency,
                    orderId: finalOrderId,
                    paymentId: finalPaymentId,
                    status: status
                  }
                })
              });
            } catch (error) {
              console.error('Failed to send payment pending notification:', error);
            }
            break;

          default:
            // Notify admin and channels of other status updates
            try {
              await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-api-key': process.env.ADMIN_API_KEY
                },
                body: JSON.stringify({
                  type: 'payment_status_update',
                  data: {
                    userId: purchase.userId,
                    userName: purchase.username || 'Unknown',
                    cardNumber: purchase.cardNumber,
                    cardType: `Card ${purchase.cardNumber}`,
                    amount: amount,
                    currency: currency,
                    orderId: finalOrderId,
                    paymentId: finalPaymentId,
                    status: status
                  }
                })
              });
            } catch (error) {
              console.error('Failed to send payment status update notification:', error);
            }
        }
      } else {
        // Notify admin and channels of webhook for unknown purchase
        try {
          await fetch(`${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=admin`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': process.env.ADMIN_API_KEY
            },
            body: JSON.stringify({
              type: 'payment_webhook_unknown',
              data: {
                orderId: finalOrderId,
                paymentId: finalPaymentId,
                amount: amount,
                currency: currency,
                status: status
              }
            })
          });
        } catch (error) {
          console.error('Failed to send unknown payment webhook notification:', error);
        }
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
      callbackUrl: `${req.headers.origin || process.env.VITE_WEB_APP_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://skyton.vercel.app')}/api/oxapay?action=webhook`,
    });

    if (!payoutResult.success) {
      console.error('Failed to create payout:', payoutResult.error);
      return res.status(500).json({ 
        error: 'Failed to create payout',
        details: payoutResult.error,
        oxapayDetails: payoutResult.oxapayDetails || null
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
