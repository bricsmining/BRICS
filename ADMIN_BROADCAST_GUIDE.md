# 📢 Admin Broadcast Guide

## How to Send Broadcasts to All Users

The SkyTON admin panel now includes a comprehensive broadcast system that allows you to send rich messages to all users via the Telegram bot.

## 🎯 **Accessing the Broadcast Feature**

1. **Login to Admin Panel**: Go to your admin page and authenticate
2. **Navigate to Broadcast Tab**: Click the "Broadcast" tab in the admin interface
3. **Create Your Message**: Use the comprehensive broadcast interface

## 📝 **Creating Broadcast Messages**

### **1. Basic Text Message**
- Enter your message in the text area
- Use Markdown formatting for rich text:
  - `**Bold text**`
  - `*Italic text*`
  - `` `Code text` ``
  - `[Links](https://example.com)`

### **2. Message Formatting Options**
- **Markdown**: Rich formatting with `**bold**`, `*italic*`, etc.
- **HTML**: Use HTML tags like `<b>bold</b>`, `<i>italic</i>`
- **Plain Text**: No formatting

### **3. Adding Media Attachments**
Choose from these media types:
- **📷 Photo**: JPG, PNG, GIF (max 10MB)
- **🎥 Video**: MP4 (max 50MB)  
- **🎵 Audio**: MP3, OGG (max 50MB)
- **📄 Document**: PDF, DOC, etc. (max 50MB)

**Requirements:**
- Use direct URLs to media files
- Ensure files are publicly accessible
- Test URLs before sending

### **4. Interactive Buttons**
Add up to 3 types of buttons:

#### **🔗 URL Buttons**
- Link to external websites
- Example: `https://skyton.com/news`

#### **📱 Web App Buttons**  
- Launch web applications
- Example: `https://sky-ton-2.vercel.app`

#### **⚙️ Callback Buttons**
- Trigger bot actions
- Example: `show_stats`, `get_help`

**Button Layout:**
- Organize buttons in rows (up to 3 buttons per row)
- Each button needs text and a URL/callback
- Buttons appear below your message

## 🎨 **Quick Templates**

Use pre-made templates for common broadcasts:

### **📢 Update Announcement Template**
```markdown
🎉 *SkyTON Update!*

Hello miners! We have exciting news:

🔥 *New Features:*
• Enhanced mining rewards
• New social tasks  
• Improved referral system

💰 *Special Offer:*
Complete any task today and get 2x rewards!

Ready to boost your earnings?
```

### **⚠️ Maintenance Notice Template**
```markdown
⚠️ *Important Notice*

Dear SkyTON users,

We will be performing scheduled maintenance:

🕐 *Time:* Tomorrow 2:00 AM - 4:00 AM UTC
⏱️ *Duration:* Approximately 2 hours
🔧 *Purpose:* System improvements

During this time, the app may be temporarily unavailable.

Thank you for your patience! 🙏
```

## 📊 **Broadcast Examples**

### **Example 1: Feature Announcement with Media**
- **Message**: Exciting update announcement
- **Media**: Screenshot of new features (photo)
- **Buttons**: 
  - Row 1: "🚀 Open SkyTON" (Web App)
  - Row 2: "📱 Share" (URL), "💬 Support" (URL)

### **Example 2: Event Notification**
- **Message**: Special event details
- **Media**: Event banner (photo)
- **Buttons**:
  - Row 1: "🎯 Join Event" (Web App)
  - Row 2: "📅 Add to Calendar" (URL)

### **Example 3: Simple Text Update**
- **Message**: Quick status update
- **Media**: None
- **Buttons**: 
  - Row 1: "📊 Check Stats" (Callback)

## 🚀 **Sending the Broadcast**

1. **Preview Your Message**: Check the preview section
2. **Verify Recipients**: Confirms "All users" will receive it
3. **Click Send**: Press "Send Broadcast to All Users"
4. **Monitor Results**: See success/failure counts

## 📈 **Broadcast Results**

After sending, you'll see:
- **Total Users**: Number of users in database
- **Success Count**: Messages delivered successfully  
- **Failed Count**: Messages that failed to send
- **Media Type**: Type of media included (if any)
- **Button Count**: Number of interactive buttons

## 💡 **Best Practices**

### **Content Guidelines**
- ✅ Keep messages concise and engaging
- ✅ Use emojis to make messages visually appealing
- ✅ Include clear call-to-action buttons
- ✅ Test media URLs before sending
- ✅ Use proper formatting for readability

### **Timing Considerations**
- ✅ Consider user time zones
- ✅ Avoid sending during off-peak hours
- ✅ Space out broadcasts (don't spam users)
- ✅ Plan important announcements in advance

### **Button Best Practices**
- ✅ Use clear, action-oriented button text
- ✅ Limit to 2-3 buttons per row
- ✅ Test all button links before sending
- ✅ Use web app buttons for in-app actions

## 🔧 **Technical Requirements**

### **Environment Variables Needed**
```env
VITE_ADMIN_API_KEY=your_admin_api_key
TG_BOT_TOKEN=your_telegram_bot_token
VITE_WEB_APP_URL=your_web_app_url
```

### **API Endpoint**
The broadcast uses: `POST /api/admin?action=broadcast`

### **Authentication**
- Requires admin API key in `X-API-Key` header
- Admin must be logged into the admin panel

## 🚨 **Troubleshooting**

### **Common Issues**

**"Admin API key not configured"**
- Solution: Set `VITE_ADMIN_API_KEY` in environment variables

**"Media failed to send"**
- Solution: Check media URL is publicly accessible
- Solution: Verify file size is within limits
- Solution: Ensure correct media type selected

**"Some messages failed"**
- Solution: Normal for inactive users
- Solution: Check Telegram bot token is valid
- Solution: Verify users have started the bot

**"Buttons not working"**
- Solution: Test URLs manually first
- Solution: Ensure web app URLs are correct
- Solution: Check callback data format

## 📞 **Support**

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set
3. Test with a simple text message first
4. Check Vercel function logs for detailed errors

## 🎉 **Advanced Features**

### **Scheduled Broadcasts** (Future Enhancement)
- Plan broadcasts for specific times
- Recurring announcement schedules
- Time zone optimization

### **User Segmentation** (Future Enhancement)  
- Send to specific user groups
- Target by activity level
- Personalized messaging

### **Analytics** (Future Enhancement)
- Track message open rates
- Monitor button click rates
- User engagement metrics

---

**Ready to engage your community? Start broadcasting! 🚀**
