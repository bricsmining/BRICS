/**
 * Oxapay API Service
 * Handles all interactions with Oxapay API for payments and withdrawals
 */

// Get API keys from environment variables (client-side only - server uses api/oxapay.js)
const OXAPAY_MERCHANT_API_KEY = import.meta.env.VITE_OXAPAY_MERCHANT_API_KEY;
const OXAPAY_PAYOUT_API_KEY = import.meta.env.VITE_OXAPAY_PAYOUT_API_KEY;
const OXAPAY_BASE_URL = 'https://api.oxapay.com';

// Supported cryptocurrencies for payments
export const SUPPORTED_CRYPTOS = {
  TON: {
    symbol: 'TON',
    name: 'Toncoin',
    network: 'TON',
    decimals: 9,
    minAmount: 0.1, // Basic Miner Card: 0.1 TON
    maxAmount: 10   // Pro Miner Card: 0.5 TON (with some buffer)
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    network: 'TON',
    decimals: 6,
    minAmount: 1,
    maxAmount: 50000
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'BTC',
    decimals: 8,
    minAmount: 0.0001,
    maxAmount: 10
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ETH',
    decimals: 18,
    minAmount: 0.001,
    maxAmount: 100
  }
};

/**
 * Base API request function with error handling
 */
const makeOxapayRequest = async (endpoint, method = 'GET', data = null, usePayoutKey = false) => {
  const url = `${OXAPAY_BASE_URL}${endpoint}`;
  
  // Use appropriate API key based on endpoint
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
    console.log(`Making Oxapay ${method} request to:`, url);
    console.log('Request headers:', config.headers);
    console.log('Request data:', JSON.stringify(data, null, 2));

    const response = await fetch(url, config);
    const responseData = await response.json();

    console.log('Oxapay response status:', response.status);
    console.log('Oxapay response data:', JSON.stringify(responseData, null, 2));

    if (!response.ok || responseData.status !== 200) {
      // OxaPay v1 API uses status: 200 = success
      const errorMessage = responseData.message || 'Unknown error';
      const statusCode = responseData.status || response.status;
      
      console.error('OxaPay API Error Details:', {
        httpStatus: response.status,
        apiStatus: responseData.status,
        message: responseData.message,
        error: responseData.error,
        fullResponse: responseData
      });
      
      throw new Error(`Oxapay API error: ${statusCode} - ${errorMessage}`);
    }

    // Handle OxaPay v1 invoice response format
    const processedData = {
      ...responseData.data, // Extract data object
      // Map OxaPay v1 response fields
      payment_url: responseData.data?.payment_url,
      payment_id: responseData.data?.track_id,
      payLink: responseData.data?.payment_url, // For backward compatibility
      trackId: responseData.data?.track_id, // For backward compatibility
      expires_at: responseData.data?.expired_at
    };



    return {
      success: true,
      data: processedData,
      status: response.status
    };
  } catch (error) {
    console.error('Oxapay API request failed:', error);
    return {
      success: false,
      error: error.message,
      status: error.status || 500
    };
  }
};

/**
 * Create a payment invoice for mining card purchases
 * Following OxaPay v1 API specification
 */
export const createPayment = async (paymentData) => {
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

  // Validate amount against currency limits
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

  // Prepare request data according to OxaPay v1 API specification
  const requestData = {
    amount: parseFloat(amount), // Required: The amount for the payment
    currency: currency.toUpperCase(), // Currency symbol (TON, USDT, etc.)
    lifetime: 60, // Payment lifetime in minutes (15-2880)
    fee_paid_by_payer: 1, // Payer pays the fee (1 = yes, 0 = no)
    under_paid_coverage: 2.5, // Acceptable inaccuracy in payment (0-60%)
    auto_withdrawal: false, // Don't auto-withdraw to address
    mixed_payment: false, // Don't allow mixed payment
    callback_url: callbackUrl, // URL for payment status notifications
    return_url: returnUrl, // URL for redirect after successful payment
    email: userEmail || `user${userId}@skyton.app`, // Payer's email
    order_id: orderId, // Unique order ID for reference
    thanks_message: `Thank you for your ${currency} payment! Your mining card will be activated shortly.`,
    description: description || `Mining Card Purchase - Order ${orderId}`,
    sandbox: false // Production mode (true for testing)
  };

  // Remove any undefined values to avoid validation issues
  Object.keys(requestData).forEach(key => {
    if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
      delete requestData[key];
    }
  });

  return await makeOxapayRequest('/v1/payment/invoice', 'POST', requestData, false);
};

/**
 * Create a payout request for withdrawals
 * Following OxaPay v1 Payout API specification
 */
export const createPayout = async (payoutData) => {
  const {
    amount,
    currency = 'USDT',
    address,
    network,
    description,
    callbackUrl,
    memo
  } = payoutData;

  // Validate amount against currency limits
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

  // Prepare request data according to OxaPay v1 Payout API specification
  const requestData = {
    address: address, // Required: Recipient's cryptocurrency address
    currency: currency.toUpperCase(), // Required: Cryptocurrency symbol
    amount: parseFloat(amount), // Required: Amount to be sent
    network: network || cryptoConfig.network, // Blockchain network
    callback_url: callbackUrl, // URL for status updates
    description: description || `STON Withdrawal Payout`,
  };

  // Add memo if provided (for networks that support it like TON)
  if (memo) {
    requestData.memo = memo;
  }

  // Remove any undefined values to avoid validation issues
  Object.keys(requestData).forEach(key => {
    if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
      delete requestData[key];
    }
  });

  return await makeOxapayRequest('/v1/payout', 'POST', requestData, true);
};

/**
 * Legacy function name for backward compatibility
 */
export const createWithdrawal = createPayout;

/**
 * Get payment status using OxaPay v1 API
 */
export const getPaymentStatus = async (trackId) => {
  if (!trackId) {
    return {
      success: false,
      error: 'Track ID is required'
    };
  }

  return await makeOxapayRequest(`/v1/payment/${trackId}`, 'GET', null, false);
};

/**
 * Get payout status using OxaPay v1 API
 */
export const getPayoutStatus = async (trackId) => {
  if (!trackId) {
    return {
      success: false,
      error: 'Track ID is required'
    };
  }

  return await makeOxapayRequest(`/v1/payout/${trackId}`, 'GET', null, true);
};

/**
 * Legacy function name for backward compatibility
 */
export const getWithdrawalStatus = getPayoutStatus;

/**
 * Get supported currencies and their current rates
 */
export const getSupportedCurrencies = async () => {
  const response = await makeOxapayRequest('/currencies', 'GET');
  
  if (response.success) {
    // Filter to only supported currencies
    const supportedCurrencies = response.data.filter(currency => 
      SUPPORTED_CRYPTOS[currency.symbol]
    );
    
    return {
      success: true,
      data: supportedCurrencies
    };
  }
  
  return response;
};

/**
 * Verify webhook signature (for security)
 */
export const verifyWebhookSignature = (payload, signature, secret) => {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expectedSignature;
};

/**
 * Convert STON to crypto amount based on current rates
 */
export const convertStonToCrypto = async (stonAmount, targetCurrency = 'TON') => {
  // For now, using fixed conversion rate
  // In production, you'd fetch real-time rates from Oxapay or external API
  const STON_TO_TON_RATE = 10000000; // 10M STON = 1 TON
  
  const conversionRates = {
    TON: stonAmount / STON_TO_TON_RATE,
    USDT: (stonAmount / STON_TO_TON_RATE) * 2.5, // Assuming 1 TON = 2.5 USDT
    BTC: (stonAmount / STON_TO_TON_RATE) * 0.000045, // Assuming 1 TON = 0.000045 BTC
    ETH: (stonAmount / STON_TO_TON_RATE) * 0.0007 // Assuming 1 TON = 0.0007 ETH
  };

  const cryptoAmount = conversionRates[targetCurrency];
  
  if (!cryptoAmount) {
    return {
      success: false,
      error: `Unsupported currency: ${targetCurrency}`
    };
  }

  const cryptoConfig = SUPPORTED_CRYPTOS[targetCurrency];
  
  return {
    success: true,
    data: {
      stonAmount,
      cryptoAmount: parseFloat(cryptoAmount.toFixed(cryptoConfig.decimals)),
      currency: targetCurrency,
      rate: conversionRates[targetCurrency] / stonAmount,
      minAmount: cryptoConfig.minAmount,
      maxAmount: cryptoConfig.maxAmount
    }
  };
};

/**
 * Convert crypto amount to STON
 */
export const convertCryptoToSton = async (cryptoAmount, sourceCurrency = 'TON') => {
  const STON_TO_TON_RATE = 10000000; // 10M STON = 1 TON
  
  const conversionRates = {
    TON: cryptoAmount * STON_TO_TON_RATE,
    USDT: (cryptoAmount / 2.5) * STON_TO_TON_RATE,
    BTC: (cryptoAmount / 0.000045) * STON_TO_TON_RATE,
    ETH: (cryptoAmount / 0.0007) * STON_TO_TON_RATE
  };

  const stonAmount = conversionRates[sourceCurrency];
  
  if (!stonAmount) {
    return {
      success: false,
      error: `Unsupported currency: ${sourceCurrency}`
    };
  }

  return {
    success: true,
    data: {
      cryptoAmount,
      stonAmount: Math.floor(stonAmount),
      currency: sourceCurrency,
      rate: stonAmount / cryptoAmount
    }
  };
};

/**
 * Generate unique order ID
 */
export const generateOrderId = (prefix = 'ORD') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Validate crypto address format
 */
export const validateCryptoAddress = (address, currency) => {
  const patterns = {
    TON: /^[EU][Qf][A-Za-z0-9_-]{46}$/,
    BTC: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
    ETH: /^0x[a-fA-F0-9]{40}$/,
    USDT: /^[EU][Qf][A-Za-z0-9_-]{46}$/ // TON-based USDT
  };

  const pattern = patterns[currency];
  if (!pattern) {
    return {
      valid: false,
      error: `Unsupported currency: ${currency}`
    };
  }

  const isValid = pattern.test(address);
  return {
    valid: isValid,
    error: isValid ? null : `Invalid ${currency} address format`
  };
};

export default {
  createPayment,
  createPayout,
  createWithdrawal, // Legacy alias
  getPaymentStatus,
  getPayoutStatus,
  getWithdrawalStatus, // Legacy alias
  getSupportedCurrencies,
  verifyWebhookSignature,
  convertStonToCrypto,
  convertCryptoToSton,
  generateOrderId,
  validateCryptoAddress,
  SUPPORTED_CRYPTOS
};
