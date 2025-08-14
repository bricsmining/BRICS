# 🚀 Mini App Referral System

## 📱 **New Referral URL Format**

Your referral links now use the **Telegram Mini App format** for direct web app launching:

```
https://t.me/xSkyTON_Bot/app?start=refID{userID}
```

### **Example:**
```
https://t.me/xSkyTON_Bot/app?start=refID6647338433
```

## 🎯 **How It Works**

### **1. Direct Web App Launch**
- ✅ **Clicking the link opens the web app directly** (no bot commands)
- ✅ **Instant access** to SkyTON mining interface
- ✅ **Seamless user experience** - no intermediate steps

### **2. Automatic Referral Processing**
- ✅ **Detects referral automatically** when web app opens
- ✅ **Processes referral bonus** in the background
- ✅ **Shows welcome message** with referral confirmation
- ✅ **Prevents duplicate processing** for returning users

### **3. Referral Rewards**
- 🪙 **STON tokens** added to referrer's balance
- 🎰 **Free spin** added to referrer's account
- 📊 **Referral count** updated in stats
- 🎉 **Welcome bonus** shown to new user

## 🔧 **Technical Implementation**

### **URL Parameter Detection**
```javascript
// Mini App URL: https://t.me/xSkyTON_Bot/app?start=refID6647338433
const startParam = urlParams.get('start'); // "refID6647338433"
const referrerId = startParam.replace('refID', ''); // "6647338433"
```

### **Referral Processing Flow**
1. **User clicks Mini App referral link**
2. **Web app opens with `?start=refID{userID}` parameter**
3. **App detects referral parameter automatically**
4. **New user is created with referrer ID**
5. **Referral API is called to process bonus**
6. **Welcome message shows with referral confirmation**
7. **Referrer gets STON tokens + free spin**

### **Duplicate Prevention**
```javascript
// User-specific tracking prevents duplicate welcomes
const referralKey = `referralInfo_${userId}`;
const existingReferral = sessionStorage.getItem(referralKey);

if (!existingReferral || isFirstTime) {
  // Process referral and show welcome
} else {
  // Skip duplicate processing
}
```

## 🚫 **Fixed Issues**

### **1. Self-Referral Prevention**
```javascript
// Multiple checks prevent users from referring themselves
if (!referrerId || 
    referrerId === userId.toString() || 
    referrerId === String(userId) ||
    parseInt(referrerId) === parseInt(userId)) {
  // Treat as regular user, no referral bonus
}
```

### **2. Consistent Referral Format**
- ✅ **Old format**: `User_123456` → **New format**: `refID123456`
- ✅ **Backward compatibility** with old links
- ✅ **Standardized across** bot and web app

### **3. Direct Web App Launch**
- ✅ **No bot commands** - direct web app opening
- ✅ **Automatic referral processing** in background
- ✅ **Instant access** to mining interface

### **4. Duplicate Welcome Prevention**
- ✅ **User-specific tracking** prevents multiple popups
- ✅ **Session-based storage** remembers shown messages
- ✅ **First-time detection** for genuine new users

## 📊 **Referral Link Examples**

### **Your Bot Username: `xSkyTON_Bot`**

| User ID | Referral Link | Description |
|---------|---------------|-------------|
| `123456` | `https://t.me/xSkyTON_Bot/app?start=refID123456` | Standard referral |
| `6647338433` | `https://t.me/xSkyTON_Bot/app?start=refID6647338433` | Your example |
| `7891234567` | `https://t.me/xSkyTON_Bot/app?start=refID7891234567` | Another user |

## 🎯 **User Experience**

### **For New Users (Clicking Referral Link):**
1. 📱 **Click referral link** → Web app opens instantly
2. 🎉 **Welcome animation** shows referral bonus
3. 🪙 **Bonus notification** confirms rewards
4. 🚀 **Start mining** immediately

### **For Existing Users:**
1. 📱 **Click any link** → Web app opens normally
2. ❌ **No duplicate messages** for known users
3. 🎯 **Seamless experience** - no interruptions

### **For Referrers:**
1. 📤 **Share link** from app or bot
2. 👥 **Friend joins** via link
3. 🎰 **Automatic rewards** - STON + free spin
4. 📊 **Stats updated** instantly

## 🔗 **Link Sharing Options**

### **From Web App:**
- Copy link button in Referral section
- QR code for easy sharing
- Direct Telegram sharing

### **From Bot:**
- `/invite` command generates link
- Inline share button
- Direct copy-paste ready

## 🛠️ **For Developers**

### **Environment Variables Needed:**
```bash
VITE_ADMIN_API_KEY=your_admin_api_key  # For referral processing
TG_BOT_TOKEN=your_bot_token           # For bot functionality
BOT_USERNAME=xSkyTON_Bot              # Your bot username
```

### **API Endpoint Used:**
```
POST /api/utils?action=refer
Parameters:
- api: Admin API key
- new: New user ID
- referreby: Referrer user ID
```

### **Referral Detection Code:**
```javascript
// In telegramUtils.js
const startParam = urlParams.get('start');
if (startParam && startParam.startsWith('refID')) {
  const referrerId = startParam.replace('refID', '');
  // Process referral...
}
```

## ✅ **Testing Checklist**

### **Referral Flow Test:**
- [ ] Generate referral link from app
- [ ] Share link with test user
- [ ] Click link → Web app opens directly
- [ ] New user sees welcome message
- [ ] Referrer gets STON tokens + free spin
- [ ] No duplicate messages on repeat visits

### **Self-Referral Test:**
- [ ] Try to use your own referral link
- [ ] Should be treated as regular user
- [ ] No referral bonus applied
- [ ] No error messages shown

### **Link Format Test:**
- [ ] Old format `User_123` still works
- [ ] New format `refID123` works
- [ ] Both redirect to web app correctly
- [ ] Referral processing works for both

## 🎊 **Benefits of New System**

1. **🚀 Instant Access**: Direct web app launch
2. **🎯 Better UX**: No intermediate bot commands
3. **🔒 Secure**: Prevents self-referrals and duplicates
4. **📱 Mobile-Friendly**: Optimized for mobile sharing
5. **🎮 Seamless**: Gaming experience starts immediately
6. **📊 Trackable**: Full analytics on referral flow

Your Mini App referral system is now production-ready! 🚀✨
