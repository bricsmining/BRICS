import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Plus, Send, Image, Video, FileAudio, FileText, ExternalLink, Smartphone } from 'lucide-react';

const BroadcastTab = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    message: '',
    mediaType: null,
    mediaUrl: '',
    parseMode: 'Markdown',
    buttons: []
  });

  // Add a new button row
  const addButtonRow = () => {
    setBroadcastData(prev => ({
      ...prev,
      buttons: [...prev.buttons, []]
    }));
  };

  // Add button to a specific row
  const addButton = (rowIndex) => {
    setBroadcastData(prev => {
      const newButtons = [...prev.buttons];
      newButtons[rowIndex] = [...newButtons[rowIndex], { text: '', type: 'url', value: '' }];
      return { ...prev, buttons: newButtons };
    });
  };

  // Remove button from row
  const removeButton = (rowIndex, buttonIndex) => {
    setBroadcastData(prev => {
      const newButtons = [...prev.buttons];
      newButtons[rowIndex].splice(buttonIndex, 1);
      if (newButtons[rowIndex].length === 0) {
        newButtons.splice(rowIndex, 1);
      }
      return { ...prev, buttons: newButtons };
    });
  };

  // Update button data
  const updateButton = (rowIndex, buttonIndex, field, value) => {
    setBroadcastData(prev => {
      const newButtons = [...prev.buttons];
      newButtons[rowIndex][buttonIndex] = {
        ...newButtons[rowIndex][buttonIndex],
        [field]: value
      };
      return { ...prev, buttons: newButtons };
    });
  };

  // Convert buttons to Telegram format
  const formatButtonsForTelegram = (buttons) => {
    return buttons.map(row => 
      row.map(button => {
        const telegramButton = { text: button.text };
        
        switch (button.type) {
          case 'url':
            telegramButton.url = button.value;
            break;
          case 'webapp':
            telegramButton.web_app = { url: button.value };
            break;
          case 'callback':
            telegramButton.callback_data = button.value;
            break;
          default:
            telegramButton.url = button.value;
        }
        
        return telegramButton;
      })
    );
  };

  // Send broadcast
  const sendBroadcast = async () => {
    if (!broadcastData.message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a broadcast message.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // SECURITY: Use secure API without exposing keys

      const payload = {
        message: broadcastData.message,
        adminEmail: 'admin@skyton.com', // You might want to get this from user context
        parseMode: broadcastData.parseMode,
        ...(broadcastData.mediaType && broadcastData.mediaUrl && {
          mediaType: broadcastData.mediaType,
          mediaUrl: broadcastData.mediaUrl
        }),
        ...(broadcastData.buttons.length > 0 && {
          buttons: formatButtonsForTelegram(broadcastData.buttons)
        })
      };

      const response = await fetch('/api/admin?action=broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': adminApiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Broadcast Sent Successfully! 🎉",
          description: `Message sent to ${result.totalUsers} users. Success: ${result.successCount}, Failed: ${result.failCount}`,
          variant: "default"
        });

        // Reset form
        setBroadcastData({
          message: '',
          mediaType: null,
          mediaUrl: '',
          parseMode: 'Markdown',
          buttons: []
        });
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      toast({
        title: "Broadcast Failed",
        description: error.message || "Failed to send broadcast. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Broadcast Message
          </CardTitle>
          <CardDescription>
            Send messages to all users with media, buttons, and rich formatting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="message">Message Content *</Label>
            <Textarea
              id="message"
              placeholder="Enter your broadcast message here...

You can use:
• **Bold text**
• *Italic text*
• `Code text`
• [Links](https://example.com)

🎯 Keep it engaging and informative!"
              value={broadcastData.message}
              onChange={(e) => setBroadcastData(prev => ({ ...prev, message: e.target.value }))}
              rows={8}
              className="resize-none"
            />
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>{broadcastData.message.length} characters</span>
              <Select
                value={broadcastData.parseMode || ""}
                onValueChange={(value) =>
                  setBroadcastData(prev => ({ ...prev, parseMode: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {(() => {
                      switch (broadcastData.parseMode) {
                        case "Markdown": return "Markdown";
                        case "HTML": return "HTML";
                        default: return "Plain Text";
                      }
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Markdown">Markdown</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="">Plain Text</SelectItem>
                </SelectContent>
              </Select>

            </div>
          </div>

          <Separator />

          {/* Media Attachment */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <Label>Media Attachment (Optional)</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="mediaType">Media Type</Label>
              <Select
                value={broadcastData.mediaType || 'none'}
                onValueChange={(value) =>
                  setBroadcastData(prev => ({
                    ...prev,
                    mediaType: value === 'none' ? null : value,
                    mediaUrl: value === 'none' ? '' : prev.mediaUrl
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      switch (broadcastData.mediaType) {
                        case 'photo': return '📷 Photo';
                        case 'video': return '🎥 Video';
                        case 'audio': return '🎵 Audio';
                        case 'document': return '📄 Document';
                        default: return 'No Media';
                      }
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Media</SelectItem>
                  <SelectItem value="photo">📷 Photo</SelectItem>
                  <SelectItem value="video">🎥 Video</SelectItem>
                  <SelectItem value="audio">🎵 Audio</SelectItem>
                  <SelectItem value="document">📄 Document</SelectItem>
                </SelectContent>
              </Select>

              </div>

              {broadcastData.mediaType && (
                <div className="space-y-2">
                  <Label htmlFor="mediaUrl">Media URL</Label>
                  <Input
                    id="mediaUrl"
                    type="url"
                    placeholder="https://example.com/media.jpg"
                    value={broadcastData.mediaUrl}
                    onChange={(e) => setBroadcastData(prev => ({ ...prev, mediaUrl: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {broadcastData.mediaType && (
              <div className="text-sm text-gray-600 bg-blue-600 p-3 rounded-md">
                <strong>Media Guidelines:</strong>
                <ul className="mt-1 ml-4 list-disc">
                  <li>Use direct URLs to media files</li>
                  <li>Photos: JPG, PNG, GIF (max 10MB)</li>
                  <li>Videos: MP4 (max 50MB)</li>
                  <li>Audio: MP3, OGG (max 50MB)</li>
                  <li>Documents: PDF, DOC, etc. (max 50MB)</li>
                </ul>
              </div>
            )}
          </div>

          <Separator />

          {/* Interactive Buttons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>Interactive Buttons (Optional)</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButtonRow}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Row
              </Button>
            </div>

            {broadcastData.buttons.map((row, rowIndex) => (
              <Card key={rowIndex} className="bg-gray-50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">Row {rowIndex + 1}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addButton(rowIndex)}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Button
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {row.map((button, buttonIndex) => (
                      <div key={buttonIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-0 rounded border">
                        <Input
                          placeholder="Button Text"
                          value={button.text}
                          onChange={(e) => updateButton(rowIndex, buttonIndex, 'text', e.target.value)}
                        />
                        
                        <Select
                          value={button.type}
                          onValueChange={(value) => updateButton(rowIndex, buttonIndex, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue>
                              {(() => {
                                switch (button.type) {
                                  case "url": return "🔗 URL Link";
                                  case "webapp": return "📱 Web App";
                                  case "callback": return "⚙️ Callback";
                                  default: return "Select Type";
                                }
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="url">🔗 URL Link</SelectItem>
                            <SelectItem value="webapp">📱 Web App</SelectItem>
                            <SelectItem value="callback">⚙️ Callback</SelectItem>
                          </SelectContent>
                        </Select>

                        
                        <Input
                          placeholder={
                            button.type === 'url' ? 'https://example.com' :
                            button.type === 'webapp' ? 'https://your-app.com' :
                            'callback_data'
                          }
                          value={button.value}
                          onChange={(e) => updateButton(rowIndex, buttonIndex, 'value', e.target.value)}
                        />
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeButton(rowIndex, buttonIndex)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {broadcastData.buttons.length === 0 && (
              <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No buttons added yet</p>
                <p className="text-sm">Click "Add Row" to create interactive buttons</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Preview & Send */}
          <div className="space-y-4">
            <div className="bg-blue-500 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Broadcast Preview:</h4>
              <div className="text-sm text-gray-700">
                <p><strong>Recipients:</strong> All users</p>
                <p><strong>Format:</strong> {broadcastData.parseMode || 'Plain Text'}</p>
                {broadcastData.mediaType && (
                  <p><strong>Media:</strong> {broadcastData.mediaType} ({broadcastData.mediaUrl ? '✅' : '❌'})</p>
                )}
                <p><strong>Buttons:</strong> {broadcastData.buttons.reduce((total, row) => total + row.length, 0)} buttons in {broadcastData.buttons.length} rows</p>
              </div>
            </div>

            <Button
              onClick={sendBroadcast}
              disabled={isLoading || !broadcastData.message.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Broadcast to All Users
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Templates</CardTitle>
          <CardDescription>Click to use pre-made broadcast templates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 text-left"
              onClick={() => setBroadcastData({
                message: `🎉 *SkyTON Update!*

Hello miners! We have exciting news:

🔥 *New Features:*
• Enhanced mining rewards
• New social tasks  
• Improved referral system

💰 *Special Offer:*
Complete any task today and get 2x rewards!

Ready to boost your earnings?`,
                mediaType: null,
                mediaUrl: '',
                parseMode: 'Markdown',
                buttons: [
                  [{ text: '🚀 Open SkyTON', type: 'webapp', value: import.meta.env.VITE_WEB_APP_URL || 'https://your-app.com' }],
                  [
                    { text: '📱 Share', type: 'url', value: 'https://t.me/share/url?url=https://t.me/xSkyTON_Bot&text=Join%20me%20on%20SkyTON!' },
                    { text: '💬 Support', type: 'url', value: 'https://t.me/SkyTONSupport' }
                  ]
                ]
              })}
            >
              <div>
                <div className="font-medium">📢 Update Announcement</div>
                <div className="text-sm text-gray-500 mt-1">New features and special offers</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 text-left"
              onClick={() => setBroadcastData({
                message: `⚠️ *Important Notice*

Dear SkyTON users,

We will be performing scheduled maintenance:

🕐 *Time:* Tomorrow 2:00 AM - 4:00 AM UTC
⏱️ *Duration:* Approximately 2 hours
🔧 *Purpose:* System improvements

During this time, the app may be temporarily unavailable.

Thank you for your patience! 🙏`,
                mediaType: null,
                mediaUrl: '',
                parseMode: 'Markdown',
                buttons: [
                  [{ text: '📅 Add to Calendar', type: 'url', value: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=SkyTON%20Maintenance' }]
                ]
              })}
            >
              <div>
                <div className="font-medium">⚠️ Maintenance Notice</div>
                <div className="text-sm text-gray-500 mt-1">System maintenance announcement</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BroadcastTab;
