# API Consolidation Summary

## Problem
Vercel Hobby plan has a limit of 12 serverless functions, but the project had more than that, causing deployment failures.

## Solution
Consolidated multiple individual API endpoints into 3 main endpoints using action-based routing.

## Final API Structure

### 1. `/api/admin.js` - Admin Operations
- **`?action=notify`** - Send notifications to admin (was `/api/notify-admin.js`)
- **`?action=broadcast`** - Broadcast messages to all users (was `/api/broadcast.js`)
- **`?action=verify`** - Verify admin credentials (was `/api/verifyAdmin.js`)

### 2. `/api/oxapay.js` - Payment Operations
- **`?action=create-payment`** - Create new payment (was `/api/oxapay/create-payment.js`)
- **`?action=check-payment`** - Check payment status (was `/api/oxapay/check-payment.js`)
- **`?action=webhook`** - Handle payment webhooks (was `/api/oxapay/webhook.js`)
- **`?action=payout`** - Process payouts (was `/api/oxapay/payout.js`)
- **`?action=payout-webhook`** - Handle payout webhooks (was `/api/oxapay/payout-webhook.js`)
- **`?action=status`** - Get payment status (was `/api/oxapay/status.js`)
- **`?action=create-withdrawal`** - Create withdrawal (was `/api/oxapay/create-withdrawal.js`)
- **`?action=callback`** - Handle payment callbacks (was `/api/oxapay-callback.js`)

### 3. `/api/utils.js` - Utility Operations
- **`?action=refer`** - Handle referrals (was `/api/refer.js`)
- **`?action=verify-telegram`** - Verify Telegram membership (was `/api/verify-telegram-join.js`)

## Files Removed
- `api/broadcast.js`
- `api/notify-admin.js`
- `api/verifyAdmin.js`
- `api/refer.js`
- `api/verify-telegram-join.js`
- `api/oxapay-callback.js`
- `api/oxapay/` (entire directory with 7 files)
- `api/admin/` (empty directory)
- `src/pages/api/refer.js`

## Files Updated
- `src/components/dashboard/TasksSection.jsx` - Updated to use new endpoint: `/api/utils?action=verify-telegram`

## Result
- **Before**: 15+ individual API functions (over the 12 limit)
- **After**: 3 consolidated API functions (well under the 12 limit)
- **Status**: ✅ Build successful, ready for deployment

## Usage Examples

### Admin Operations
```javascript
// Notify admin
fetch('/api/admin?action=notify', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello admin' })
})

// Broadcast to users
fetch('/api/admin?action=broadcast', {
  method: 'POST',
  body: JSON.stringify({ message: 'Hello users', adminEmail: 'admin@example.com' })
})

// Verify admin
fetch('/api/admin?action=verify', {
  method: 'POST',
  body: JSON.stringify({ password: 'admin_password' })
})
```

### Payment Operations
```javascript
// Create payment
fetch('/api/oxapay?action=create-payment', {
  method: 'POST',
  body: JSON.stringify({ amount: 100, currency: 'USD' })
})

// Check payment
fetch('/api/oxapay?action=check-payment', {
  method: 'POST',
  body: JSON.stringify({ paymentId: 'payment_123' })
})
```

### Utility Operations
```javascript
// Handle referral (GET request with query parameters)
fetch('/api/utils?action=refer&api=API_KEY&new=USER123&referreby=USER456')

// Verify Telegram membership
fetch('/api/utils?action=verify-telegram', {
  method: 'POST',
  body: JSON.stringify({ userId: '123', channelUsername: 'mychannel' })
})
```
