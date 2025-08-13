/**
 * OxaPay Payout API endpoint
 * Handles cryptocurrency payouts for approved withdrawals
 */
const OXAPAY_PAYOUT_URL = 'https://api.oxapay.com/v1/payout';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Get API key from environment variables
    const OXAPAY_PAYOUT_API_KEY = process.env.VITE_OXAPAY_PAYOUT_API_KEY;
    
    if (!OXAPAY_PAYOUT_API_KEY) {
      console.error('OXAPAY_PAYOUT_API_KEY not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Payment service not configured' 
      });
    }

    const { 
      address, 
      amount, 
      description = 'SkyTON withdrawal payout',
      withdrawalId,
      userId 
    } = req.body;

    // Validate required fields
    if (!address || !amount || !withdrawalId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: address, amount, withdrawalId, userId'
      });
    }

    // Validate address format (basic TON address validation)
    if (!address.match(/^[A-Za-z0-9_-]{48}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TON wallet address format'
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be a positive number.'
      });
    }

    console.log('Creating OxaPay payout:', {
      address,
      amount: parsedAmount,
      withdrawalId,
      userId,
      description
    });

    // Prepare payout request data
    const payoutData = {
      address: address,
      currency: 'TON',
      amount: parsedAmount,
      network: 'TON',
      description: description,
      callback_url: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/oxapay/payout-webhook`
    };

    // Make request to OxaPay payout API
    const response = await fetch(OXAPAY_PAYOUT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payout_api_key': OXAPAY_PAYOUT_API_KEY
      },
      body: JSON.stringify(payoutData)
    });

    const responseData = await response.json();

    console.log('OxaPay payout response:', {
      status: response.status,
      data: responseData
    });

    if (!response.ok) {
      console.error('OxaPay payout failed:', responseData);
      return res.status(400).json({
        success: false,
        error: responseData.message || responseData.error?.message || 'Payout request failed',
        details: responseData
      });
    }

    // Check if the response indicates success
    if (responseData.status !== 200 || !responseData.data) {
      console.error('OxaPay payout unsuccessful:', responseData);
      return res.status(400).json({
        success: false,
        error: responseData.message || 'Payout request was not successful',
        details: responseData
      });
    }

    // Extract track_id from response
    const trackId = responseData.data.track_id;
    const status = responseData.data.status;

    console.log('OxaPay payout created successfully:', {
      trackId,
      status,
      withdrawalId,
      userId
    });

    // Return success response with payout details
    return res.status(200).json({
      success: true,
      data: {
        trackId: trackId,
        status: status,
        withdrawalId: withdrawalId,
        userId: userId,
        amount: parsedAmount,
        address: address,
        message: 'Payout request created successfully'
      }
    });

  } catch (error) {
    console.error('Error in OxaPay payout API:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
