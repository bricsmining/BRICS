# 📱 SkyTON Notification System

## 🎯 **Overview**

A comprehensive Telegram notification system that keeps the admin informed of all activities and notifies users of important events.

## 🔔 **Admin Notifications**

The admin will receive Telegram messages for:

### **📊 User Activities**
- ✅ **New User Joins** - When someone creates an account
- 💰 **Successful Referrals** - When someone refers a friend
- ✅ **Task Completions** - When users complete tasks automatically
- 📋 **Task Submissions** - When users submit tasks for manual review
- ⚡ **Energy Earnings** - When users earn energy from ads
- 📦 **Box Openings** - When users open reward boxes
- 💸 **Withdrawal Requests** - When users request withdrawals

### **Sample Admin Notification Messages:**

#### **New User:**
```
🎉 New User Joined!

👤 User Info:
• ID: 123456789
• Name: John Doe
• Username: @johndoe
• Referred by: 987654321

🕐 Time: 12/25/2024, 3:45:21 PM
```

#### **Referral:**
```
💰 New Referral!

👥 Referral Info:
• Referrer: 987654321 (Alice Smith)
• New User: 123456789 (John Doe)
• Reward: 100 STON + 1 Free Spin

🕐 Time: 12/25/2024, 3:45:21 PM
```

#### **Withdrawal Request:**
```
💸 Withdrawal Request!

👤 User: 123456789 (John Doe)
💰 Amount: 50000 STON
💳 Method: TON Wallet
📍 Address: UQA...abc123
💵 Current Balance: 75000 STON

Action Required: Process withdrawal

🕐 Time: 12/25/2024, 3:45:21 PM
```

## 👤 **User Notifications**

Users will receive Telegram messages for:

### **⚖️ Admin Actions**
- ✅ **Task Approved** - When admin approves their task submission
- ❌ **Task Rejected** - When admin rejects their task submission
- ✅ **Withdrawal Approved** - When admin approves their withdrawal
- ❌ **Withdrawal Rejected** - When admin rejects their withdrawal

### **🎉 System Events**
- 🎯 **Successful Referral** - When they successfully refer someone

### **Sample User Notification Messages:**

#### **Task Approved:**
```
✅ Task Approved!

Your task submission has been approved!

📝 Task: Join Telegram Channel
💰 Reward: 500 STON added to your balance
🎉 Status: Completed

Keep completing tasks to earn more STON! 🚀
```

#### **Withdrawal Approved:**
```
✅ Withdrawal Approved!

Your withdrawal request has been approved!

💰 Amount: 50000 STON
💳 Method: TON Wallet
📍 Address: UQA...abc123
⏱️ Processing Time: 24-48 hours

Your tokens will be transferred soon! 🚀
```

#### **Successful Referral:**
```
🎉 Successful Referral!

Your friend joined SkyTON through your referral link!

👥 New Member: John Doe
💰 Your Reward: 100 STON
🎰 Bonus: 1 Free Spin added

Keep sharing to earn more rewards! 🚀

Share your link: https://t.me/xSkyTON_Bot/app?start=refID987654321
```

## 🔧 **Technical Implementation**

### **API Endpoints:**

#### **Main Notification API:**
```
POST /api/notifications?action=admin
POST /api/notifications?action=user
```

#### **Utility Functions:**
```javascript
// Import in any file
import { notifyAdmin, notifyUser, notifyNewUser, notifySuccessfulReferral } from '@/utils/notifications';

// Admin notifications
await notifyNewUser(userData, referrerId);
await notifyTaskSubmission(userId, userName, taskTitle, reward, target);
await notifyWithdrawalRequest(userId, userName, amount, method, address, balance);

// User notifications  
await notifyTaskApproval(userId, taskTitle, reward);
await notifyWithdrawalApproval(userId, amount, method, address);
await notifySuccessfulReferral(referrerId, referrerName, newUserId, newUserName, reward);
```

### **Integration Points:**

#### **1. User Creation (New User Notifications):**
```javascript
// In src/data/firestore/userActions.js
await notifyNewUser(telegramUserData, referrerId);
```

#### **2. Referral Processing (Referral Notifications):**
```javascript
// In api/utils.js
await sendNotifications(referrerId, referrerName, newUserId, newUserName, rewardAmount);
```

#### **3. Task Management (Task Notifications):**
```javascript
// In src/data/firestore/adminActions.js
await notifyTaskApproval(userId, task.title, task.reward);
await notifyTaskRejection(userId, task.title, reason);
```

#### **4. Withdrawal Management (Withdrawal Notifications):**
```javascript
// In src/data/firestore/adminActions.js
await notifyWithdrawalRequest(userId, username, amount, method, address, balance);
await notifyWithdrawalApproval(userId, amount, method, address);
await notifyWithdrawalRejection(userId, amount, reason);
```

## ⚙️ **Configuration**

### **Required Environment Variables:**
```bash
TG_BOT_TOKEN=your_bot_token
VITE_ADMIN_API_KEY=adminsumon7891
ADMIN_API_KEY=adminsumon7891
```

### **Admin Chat ID Setup:**
1. **Go to Admin Panel** → Settings
2. **Set Telegram Chat ID** (your admin chat ID)
3. **Save settings**

### **How to Get Your Chat ID:**
1. Send `/start` to @userinfobot
2. Copy your chat ID
3. Enter it in admin settings

## 🚀 **Current Integrations**

### **✅ Already Implemented:**
- [x] New user notifications to admin
- [x] Referral success notifications (admin + user)
- [x] Task completion notifications to admin
- [x] Task approval/rejection notifications to user
- [x] Withdrawal request notifications to admin
- [x] Withdrawal approval/rejection notifications to user

### **🔄 Still Need Integration:**
- [ ] Energy earning notifications (from ads)
- [ ] Box opening notifications (from ads)
- [ ] Task submission notifications (manual tasks)

## 📋 **Adding New Notifications**

### **For Admin Notifications:**
```javascript
// 1. Add to notification types in api/notifications.js
case 'your_event':
  return `🎯 *Your Event!*
  
  Event details here...
  
  🕐 *Time:* ${timestamp}`;

// 2. Create utility function in src/utils/notifications.js
export async function notifyYourEvent(data) {
  return await notifyAdmin('your_event', data);
}

// 3. Call from your code
await notifyYourEvent({ userId, details, ... });
```

### **For User Notifications:**
```javascript
// 1. Add to notification types in api/notifications.js
case 'your_user_event':
  return `🎉 *Event Notification!*
  
  User event details here...`;

// 2. Create utility function in src/utils/notifications.js
export async function notifyUserEvent(userId, data) {
  return await notifyUser(userId, 'your_user_event', data);
}

// 3. Call from your code
await notifyUserEvent(userId, { details, ... });
```

## 🧪 **Testing**

### **Test Admin Notifications:**
```javascript
// Test in browser console
import { notifyAdmin } from '@/utils/notifications';
await notifyAdmin('new_user', { userId: '123', name: 'Test User' });
```

### **Test User Notifications:**
```javascript
// Test in browser console
import { notifyUser } from '@/utils/notifications';
await notifyUser('123456789', 'task_approved', { taskTitle: 'Test Task', reward: 100 });
```

## 🔍 **Debugging**

### **Common Issues:**

#### **Admin Not Receiving Notifications:**
- ✅ Check `TG_BOT_TOKEN` is set
- ✅ Check admin chat ID is configured in admin panel
- ✅ Check `VITE_ADMIN_API_KEY` is set

#### **Users Not Receiving Notifications:**
- ✅ Check bot token is valid
- ✅ Check user has started the bot (@xSkyTON_Bot)
- ✅ Check user ID is correct

#### **API Errors:**
- ✅ Check API key in requests
- ✅ Check Firebase admin config exists
- ✅ Check console logs for errors

### **Debug Console Logs:**
```
✅ Admin notification sent: referral
✅ User notification sent: task_approved to 123456789
❌ Admin notification failed: Admin config not found
❌ Failed to send notification to 123456789: Bot was blocked by the user
```

## 📊 **Notification Flow Diagram**

```
Event Occurs → Check Event Type → Generate Message → Send to Telegram → Log Result

Examples:
User Joins → notifyNewUser() → Admin gets "New User" message
Task Approved → notifyTaskApproval() → User gets "Task Approved" message
Withdrawal → notifyWithdrawalRequest() → Admin gets "Withdrawal Request" message
```

## 🎯 **Benefits**

- 📱 **Real-time updates** for admin
- 🎉 **User engagement** through notifications
- 📊 **Complete visibility** of all activities
- ⚡ **Instant alerts** for important events
- 🤖 **Automated communication** via Telegram
- 📈 **Better user experience** with feedback

Your notification system is now comprehensive and will keep everyone informed! 🚀
