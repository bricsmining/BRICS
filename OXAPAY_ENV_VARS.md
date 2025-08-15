# OxaPay Environment Variables Setup

## Required Environment Variables

Add these environment variables to your deployment (Vercel, etc.):

### For Payments (Invoice Generation)
```
VITE_OXAPAY_MERCHANT_API_KEY=your_merchant_api_key_here
```

### For Payouts (Withdrawals)
```
VITE_OXAPAY_PAYOUT_API_KEY=your_payout_api_key_here
```

## How to Get API Keys

1. **Register at OxaPay**: https://oxapay.com/
2. **Get Merchant API Key**: 
   - Go to Dashboard → API Settings
   - Copy your Merchant API Key
   - Set as `VITE_OXAPAY_MERCHANT_API_KEY`

3. **Get Payout API Key**:
   - Go to Dashboard → Payout Settings  
   - Copy your Payout API Key
   - Set as `VITE_OXAPAY_PAYOUT_API_KEY`

## Vercel Deployment

Add these variables in your Vercel project settings:
1. Go to Project Settings → Environment Variables
2. Add both API keys
3. Redeploy your application

## Local Development

Create a `.env.local` file:
```
VITE_OXAPAY_MERCHANT_API_KEY=your_merchant_api_key_here
VITE_OXAPAY_PAYOUT_API_KEY=your_payout_api_key_here
```

## API Endpoints Used

### Payments
- **Create Invoice**: `POST /v1/payment/invoice`
- **Check Payment**: `GET /v1/payment/{track_id}`

### Payouts  
- **Create Payout**: `POST /v1/payout`
- **Check Payout**: `GET /v1/payout/{track_id}`

## Testing

### Test Payment Creation:
```bash
curl -X POST https://your-app.vercel.app/api/oxapay?action=create-payment \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "cardNumber": 1,
    "currency": "TON"
  }'
```

### Test Payout Creation:
```bash
curl -X POST https://your-app.vercel.app/api/oxapay?action=payout \
  -H "Content-Type: application/json" \
  -d '{
    "address": "EQD...",
    "amount": 0.1,
    "currency": "TON",
    "description": "Test withdrawal"
  }'
```
