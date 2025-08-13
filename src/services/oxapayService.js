/**
 * Oxapay API Service
 * Handles all interactions with Oxapay API for payments and withdrawals
 */

const OXAPAY_API_KEY = 'UH27B3-MCP7GB-Q3WCXJ-D331S3';
const OXAPAY_MERCHANT_ID = 'UH27B3-MCP7GB-Q3WCXJ-D331S3'; // Usually same as API key or provided separately
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
const makeOxapayRequest = async (endpoint, method = 'GET', data = null) => {
  const url = `${OXAPAY_BASE_URL}${endpoint}`;
  
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'merchant_api_key': OXAPAY_API_KEY,
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
 * Create a payment request for mining card purchases
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

  const requestData = {
    amount: parseFloat(amount), // Use the actual crypto amount (0.1 TON, 0.25 TON, etc.)
    currency: currency.toUpperCase(), // Payment currency (TON, USDT, etc.)
    lifetime: 60, // Payment lifetime in minutes (increased for testing)
    fee_paid_by_payer: 1, // Payer pays the fee
    under_paid_coverage: 2.5, // Under payment coverage percentage
    auto_withdrawal: false,
    mixed_payment: false, // Don't use mixed payment
    callback_url: callbackUrl,
    return_url: returnUrl,
    email: userEmail || `user${userId}@example.com`,
    order_id: orderId,
    thanks_message: `Thank you for your ${currency} payment! Your mining card will be activated shortly.`,
    description: description || `Mining Card Purchase - Order ${orderId}`,
    sandbox: false // Production mode
  };



  // Remove any undefined values that might cause validation issues
  Object.keys(requestData).forEach(key => {
    if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
      delete requestData[key];
    }
  });

  return await makeOxapayRequest('/v1/payment/invoice', 'POST', requestData);
};

/**
 * Create a withdrawal request
 */
export const createWithdrawal = async (withdrawalData) => {
  const {
    amount,
    currency = 'USDT',
    address,
    orderId,
    description,
    callbackUrl,
    userId,
    userEmail
  } = withdrawalData;

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

  const requestData = {
    merchant_id: OXAPAY_MERCHANT_ID,
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    address: address,
    order_id: orderId,
    description: description || `STON Withdrawal - Order ${orderId}`,
    callback_url: callbackUrl,
    customer_email: userEmail,
    customer_id: userId?.toString()
  };

  return await makeOxapayRequest('/withdrawals', 'POST', requestData);
};

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

  return await makeOxapayRequest(`/v1/payment/${trackId}`, 'GET');
};

/**
 * Get withdrawal status
 */
export const getWithdrawalStatus = async (withdrawalId) => {
  return await makeOxapayRequest(`/withdrawals/${withdrawalId}`, 'GET');
};

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
  createWithdrawal,
  getPaymentStatus,
  getWithdrawalStatus,
  getSupportedCurrencies,
  verifyWebhookSignature,
  convertStonToCrypto,
  convertCryptoToSton,
  generateOrderId,
  validateCryptoAddress,
  SUPPORTED_CRYPTOS
};
