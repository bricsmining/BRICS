// Secure API utility that doesn't expose API keys
// Replaces direct API key usage in client-side code

// SECURITY: Generate request signature without exposing secrets
function generateRequestSignature(timestamp, userId, action) {
  // Simple signature that doesn't require secret keys on client
  return Buffer.from(`${timestamp}:${userId}:${action}`).toString('base64');
}

// SECURITY: Send notification without exposing API keys
export async function sendSecureNotification(userId, type, data) {
  const timestamp = Date.now().toString();
  const signature = generateRequestSignature(timestamp, userId || 'admin', 'send_notification');
  
  try {
    const response = await fetch('/api/secure-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'send_notification',
        userId,
        type,
        data,
        timestamp,
        signature
      })
    });
    
    if (!response.ok) {
      throw new Error('Notification failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Secure notification error:', error);
    throw error;
  }
}

// SECURITY: Update balance without exposing API keys
export async function updateBalanceSecurely(userId, amount, type, reason) {
  const timestamp = Date.now().toString();
  const signature = generateRequestSignature(timestamp, userId, 'update_balance');
  
  try {
    const response = await fetch('/api/secure-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'update_balance',
        userId,
        amount,
        type,
        reason,
        timestamp,
        signature
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Balance update failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Secure balance update error:', error);
    throw error;
  }
}

// SECURITY: Log activity without exposing API keys
export async function logActivitySecurely(userId, activity, details) {
  const timestamp = Date.now().toString();
  const signature = generateRequestSignature(timestamp, userId, 'log_activity');
  
  try {
    const response = await fetch('/api/secure-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'log_activity',
        userId,
        activity,
        details,
        timestamp,
        signature
      })
    });
    
    if (!response.ok) {
      throw new Error('Activity logging failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Secure activity logging error:', error);
    // Don't throw for logging errors, just log them
    return { success: false, error: error.message };
  }
}

// SECURITY: Fallback notification function (removes API key dependency)
export async function sendNotificationFallback(type, data, userId = null) {
  // For critical notifications, we can still use the original endpoint
  // but we should migrate to secure-actions
  console.warn('Using fallback notification - consider migrating to sendSecureNotification');
  
  try {
    return await sendSecureNotification(userId, type, data);
  } catch (error) {
    console.error('Fallback notification failed:', error);
    // In production, you might want to queue this for retry
    return { success: false, error: error.message };
  }
}
