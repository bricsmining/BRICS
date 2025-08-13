/**
 * API endpoint to check Oxapay payment/withdrawal status
 * GET /api/oxapay/status?id=<oxapay_id>&type=<payment|withdrawal>
 */

import { getPaymentStatus, getWithdrawalStatus } from '../../src/services/oxapayService.js';
import { db } from '../../src/lib/serverFirebase.js';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { id: oxapayId, type, userId } = req.query;

    // Validate required parameters
    if (!oxapayId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: id, type'
      });
    }

    if (!['payment', 'withdrawal'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "payment" or "withdrawal"'
      });
    }

    let oxapayResult;
    let localRecord = null;

    // Get status from Oxapay
    if (type === 'payment') {
      oxapayResult = await getPaymentStatus(oxapayId);
      
      // Also get local record
      const paymentsRef = collection(db, 'payments');
      const q = query(paymentsRef, where('oxapayId', '==', oxapayId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        localRecord = {
          id: doc.id,
          ...doc.data()
        };
      }
    } else {
      oxapayResult = await getWithdrawalStatus(oxapayId);
      
      // Also get local record
      const withdrawalsRef = collection(db, 'withdrawals');
      const q = query(withdrawalsRef, where('oxapayId', '==', oxapayId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        localRecord = {
          id: doc.id,
          ...doc.data()
        };
      }
    }

    if (!oxapayResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to get ${type} status from Oxapay: ${oxapayResult.error}`
      });
    }

    const oxapayData = oxapayResult.data;

    // Update local record if status changed
    if (localRecord && localRecord.oxapayStatus !== oxapayData.status) {
      const collectionName = type === 'payment' ? 'payments' : 'withdrawals';
      const docRef = doc(db, collectionName, localRecord.id);
      
      const updateData = {
        oxapayStatus: oxapayData.status,
        updatedAt: serverTimestamp(),
        'oxapayData.status': oxapayData.status,
        'oxapayData.updatedAt': new Date().toISOString()
      };

      if (oxapayData.tx_hash) {
        updateData['oxapayData.txHash'] = oxapayData.tx_hash;
        updateData.txHash = oxapayData.tx_hash;
      }

      await updateDoc(docRef, updateData);
      
      console.log(`Updated local ${type} record ${localRecord.id} with new status: ${oxapayData.status}`);
    }

    // Prepare response data
    const responseData = {
      oxapayId: oxapayData.id,
      status: oxapayData.status,
      amount: oxapayData.amount,
      currency: oxapayData.currency,
      createdAt: oxapayData.created_at,
      updatedAt: oxapayData.updated_at,
      txHash: oxapayData.tx_hash || null
    };

    // Add type-specific data
    if (type === 'payment') {
      responseData.paymentUrl = oxapayData.payment_url;
      responseData.qrCode = oxapayData.qr_code;
      responseData.address = oxapayData.address;
      responseData.expiresAt = oxapayData.expires_at;
      
      if (localRecord) {
        responseData.cardNumber = localRecord.cardNumber;
        responseData.stonPrice = localRecord.stonPrice;
        responseData.localStatus = localRecord.status;
      }
    } else {
      responseData.address = oxapayData.address;
      responseData.networkFee = oxapayData.network_fee;
      
      if (localRecord) {
        responseData.stonAmount = localRecord.amount;
        responseData.walletAddress = localRecord.walletAddress;
        responseData.localStatus = localRecord.status;
      }
    }

    // Add tracking information
    if (oxapayData.tracking_url) {
      responseData.trackingUrl = oxapayData.tracking_url;
    }

    // Add estimated completion time based on status
    if (oxapayData.status === 'pending') {
      responseData.estimatedTime = type === 'payment' ? '5-15 minutes' : '5-30 minutes';
    } else if (oxapayData.status === 'processing') {
      responseData.estimatedTime = type === 'payment' ? '1-5 minutes' : '5-15 minutes';
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
