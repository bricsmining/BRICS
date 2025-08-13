# API Consolidation Cleanup

After confirming the consolidated APIs work correctly, delete these old individual API files to stay under Vercel's 12-function limit:

## Files to Delete:
- `api/notify-admin.js` → now `api/admin.js?action=notify`
- `api/broadcast.js` → now `api/admin.js?action=broadcast`
- `api/verifyAdmin.js` → now `api/admin.js?action=verify`
- `api/oxapay/create-payment.js` → now `api/oxapay.js?action=create-payment`
- `api/oxapay/check-payment.js` → now `api/oxapay.js?action=check-payment`
- `api/oxapay/webhook.js` → now `api/oxapay.js?action=webhook`
- `api/oxapay/payout.js` → now `api/oxapay.js?action=payout`
- `api/oxapay/payout-webhook.js` → now `api/oxapay.js?action=payout-webhook`
- `api/oxapay/status.js` → now `api/oxapay.js?action=status`
- `api/oxapay/create-withdrawal.js` → now `api/oxapay.js?action=create-withdrawal`

## Remaining Functions (Under 12 limit):
1. `api/admin.js` (consolidates 3 functions)
2. `api/oxapay.js` (consolidates 7 functions)  
3. `api/refer.js`
4. `api/verify-telegram-join.js`
5. `api/oxapay-callback.js` (if still needed)

**Total: 5 functions** (well under the 12 limit)

## Testing Steps:
1. Deploy with consolidated APIs
2. Test all functionality
3. Delete old individual files
4. Redeploy to confirm everything works
