# 🛠️ Referral System Fix Guide

## 🐛 **Issues Found:**

### **1. Missing Environment Variable**
- ❌ **`VITE_ADMIN_API_KEY`** not set in Vercel
- This prevents Mini App referral processing

### **2. Race Condition Issue**  
- User created by client → API tries to create same user → **409 error**
- Fixed API to handle existing users properly

## ✅ **Solutions Applied:**

### **1. Fixed API Logic**
Updated `api/utils.js` to handle existing users:
```javascript
// Before: Failed if user exists
if (newUserSnap.exists) {
  return res.status(409).json({ success: false, message: 'User already joined.' });
}

// After: Handle existing users properly
if (newUserSnap.exists) {
  const existingUserData = newUserSnap.data();
  
  // If user doesn't have a referrer yet, update with referral info
  if (!existingUserData.invitedBy) {
    await newUserRef.update({ invitedBy: referredById });
  }
} else {
  // Create new user with referral metadata
  await newUserRef.set(defaultFirestoreUser(newUserId, null, null, null, referredById));
}
```

### **2. Environment Variable Setup**
Add this to your Vercel environment variables:

```bash
VITE_ADMIN_API_KEY=adminsumon7891
```

## 🔧 **How to Fix:**

### **Step 1: Add Environment Variable**
1. Go to **Vercel Dashboard**
2. Open your **SkyTON project**
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `VITE_ADMIN_API_KEY`
   - **Value**: `adminsumon7891`
   - **Environment**: All (Production, Preview, Development)

### **Step 2: Redeploy**
1. After adding the environment variable
2. Go to **Deployments** tab
3. Click **Redeploy** on latest deployment
4. Or push any new commit to trigger redeploy

### **Step 3: Test Referral Flow**
1. **Generate referral link**: `https://t.me/xSkyTON_Bot/app?start=refID{yourID}`
2. **Share with test user**
3. **Test user clicks link** → Web app opens
4. **Check console logs** for referral processing
5. **Verify you get STON + free spin**

## 🧪 **Testing Commands:**

### **Test Environment Variables:**
```bash
# In Vercel, check environment variables are set:
VITE_ADMIN_API_KEY=adminsumon7891
ADMIN_API_KEY=adminsumon7891
TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo
```

### **Test API Endpoint:**
```bash
# Test referral API manually:
curl "https://skyton.vercel.app/api/utils?action=refer&api=adminsumon7891&new=TEST123&referreby=456789"
```

### **Test Mini App URL:**
```bash
# Test Mini App referral link:
https://t.me/xSkyTON_Bot/app?start=refID456789
```

## 📊 **Referral Flow Diagram:**

```
1. User clicks: https://t.me/xSkyTON_Bot/app?start=refID123456
   ↓
2. Mini App opens with URL parameter: ?start=refID123456
   ↓
3. App detects referral parameter and extracts referrer ID: 123456
   ↓
4. App creates/gets user via getOrCreateUser(userData, referrerId)
   ↓
5. If new user, calls: processMiniAppReferral(newUserId, referrerId)
   ↓
6. API call: /api/utils?action=refer&api=KEY&new=USER&referreby=REFERRER
   ↓
7. API updates referrer: +STON tokens, +free spin, +referral count
   ↓
8. Welcome message shows with referral bonus confirmation
```

## 🚨 **Common Error Messages:**

### **"Admin API key not configured"**
- **Issue**: `VITE_ADMIN_API_KEY` missing
- **Fix**: Add environment variable in Vercel

### **"Invalid API key"**  
- **Issue**: Wrong API key value
- **Fix**: Use correct value: `adminsumon7891`

### **"User already joined"**
- **Issue**: Old API logic
- **Fix**: Updated API to handle existing users

### **"Mini App referral processing failed"**
- **Issue**: API error or network issue
- **Fix**: Check browser console and Vercel function logs

## 🎯 **Expected Results:**

### **For New User (via referral link):**
1. ✅ Web app opens instantly
2. ✅ User gets created with referrer ID  
3. ✅ API processes referral successfully
4. ✅ Referrer gets STON tokens + free spin
5. ✅ Welcome message shows bonus confirmation

### **For Existing User:**
1. ✅ Web app opens normally
2. ✅ No duplicate referral processing
3. ✅ No error messages
4. ✅ Seamless experience

### **Console Logs (Success):**
```
Mini App referral detected: {startParam: "refID123456", urlReferrerId: "123456"}
Processing Mini App referral: {userId: "789012", referrerId: "123456"}
Mini App referral processed successfully: Referral successful. 100 STON and 1 free spin rewarded to referrer.
```

## 🔍 **Debug Checklist:**

- [ ] `VITE_ADMIN_API_KEY` set in Vercel
- [ ] Project redeployed after adding env var
- [ ] URL format: `/app?start=refID{userID}`
- [ ] No self-referral (different user IDs)
- [ ] Browser console shows success logs
- [ ] Referrer gets rewards in app
- [ ] No 409 or 403 API errors

## 📞 **Support:**

If issues persist:
1. **Check Vercel Function Logs** for API errors
2. **Check Browser Console** for client errors  
3. **Verify Environment Variables** are properly set
4. **Test with fresh user** (not existing user)

Your referral system should now work perfectly! 🚀
