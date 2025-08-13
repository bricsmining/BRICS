import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Send,
  Users,
  Zap,
  DollarSign,
  MessageSquare,
  Shield,
  Bell,
  Globe,
  Activity,
  Save,
  RefreshCw,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Bot,
  Mail,
  Hash,
  Clock,
  Wallet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  getAdminConfig, 
  updateAdminConfig, 
  broadcastMessage,
  getEnvConfig
} from '@/data/firestore/adminConfig';

const AdminSettings = ({ adminData }) => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [envConfig, setEnvConfig] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [adminConfig, environmentConfig] = await Promise.all([
        getAdminConfig(),
        Promise.resolve(getEnvConfig())
      ]);
      setConfig(adminConfig);
      setEnvConfig(environmentConfig);
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: '❌ Error',
        description: 'Failed to load admin configuration',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const success = await updateAdminConfig(config, adminData.email);
      
      if (success) {
        // Reload ad configuration if ad settings were changed
        try {
          const { reloadAdConfig } = await import('@/ads/adsController');
          await reloadAdConfig();
        } catch (adError) {
          console.error('Failed to reload ad config:', adError);
        }

        toast({
          title: '✅ Settings Saved',
          description: 'Admin configuration updated successfully',
          className: 'bg-[#1a1a1a] text-white'
        });
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: '❌ Save Failed',
        description: 'Failed to save admin configuration',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) {
      toast({
        title: '❌ Empty Message',
        description: 'Please enter a message to broadcast',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
      return;
    }

    try {
      setBroadcasting(true);
      
      // Use server-side API for broadcasting
      const response = await fetch('/api/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY
        },
        body: JSON.stringify({
          message: broadcastText,
          adminEmail: adminData.email
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: '✅ Broadcast Sent',
          description: `Message sent to ${result.successCount}/${result.totalUsers} users`,
          className: 'bg-[#1a1a1a] text-white'
        });
        setBroadcastText('');
      } else {
        throw new Error(result.error || 'Broadcast failed');
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
      toast({
        title: '❌ Broadcast Failed',
        description: error.message || 'Failed to send broadcast message',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white'
      });
    } finally {
      setBroadcasting(false);
    }
  };



  const updateConfigField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div 
      className="space-y-6 p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black min-h-screen"
      style={{
        '--card': '215 25% 15%',           // Dark gray
        '--card-foreground': '0 0% 98%',   // White text
        '--border': '215 20% 25%',         // Gray borders
        '--input': '215 25% 20%',          // Dark input background
        '--muted': '215 20% 20%',          // Muted background
        '--muted-foreground': '215 15% 70%', // Muted text
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Admin Settings</h1>
          <p className="text-gray-300">Manage system configuration and settings</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={loadConfig}
            variant="outline"
            className="border-gray-500 text-gray-200 hover:bg-gray-700/50 hover:border-gray-400"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/25"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Environment Status */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="w-5 h-5 text-blue-400" />
              Environment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-900/40 border border-blue-500/60 rounded-lg p-3 mb-4 shadow-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Secure Configuration</p>
                  <p>Sensitive credentials are stored in environment variables for security.</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-muted/60 border border-border/70 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Telegram Bot</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${envConfig.telegramBotToken ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400">
                    {envConfig.telegramBotToken ? 'Connected' : 'Not Configured'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-muted/60 border border-border/70 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">OxaPay API</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${envConfig.oxapayApiKey ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400">
                    {envConfig.oxapayApiKey ? 'Connected' : 'Not Configured'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-muted/60 border border-border/70 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Referral API</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${envConfig.referralApiKey ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400">
                    {envConfig.referralApiKey ? 'Connected' : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Settings */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5 text-blue-400" />
              Telegram Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Require Telegram Join
              </label>
              <Switch
                checked={config.telegramJoinRequired || false}
                onCheckedChange={(checked) => updateConfigField('telegramJoinRequired', checked)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Channel Link
              </label>
              <Input
                value={config.telegramChannelLink || ''}
                onChange={(e) => updateConfigField('telegramChannelLink', e.target.value)}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="@channel_name"
              />
            </div>
            
            <div className="border-t border-gray-600 pt-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Admin Notifications
              </h4>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Admin Chat ID
                </label>
                <Input
                  value={config.adminChatId || ''}
                  onChange={(e) => updateConfigField('adminChatId', e.target.value)}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="1234567890"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get your chat ID from @userinfobot
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Admin Username
                </label>
                <Input
                  value={config.adminTgUsername || ''}
                  onChange={(e) => updateConfigField('adminTgUsername', e.target.value)}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="username"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Without @ symbol
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ad Networks */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="w-5 h-5 text-green-400" />
              Ad Networks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Adsgram Enabled
                </label>
                <Switch
                  checked={config.adsgramEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('adsgramEnabled', checked)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Adsgram Block ID
                </label>
                <Input
                  value={config.adsgramBlockId || ''}
                  onChange={(e) => updateConfigField('adsgramBlockId', e.target.value)}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="int-12066"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-600 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Monetag Enabled
                </label>
                <Switch
                  checked={config.monetagEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('monetagEnabled', checked)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Monetag Zone ID
                </label>
                <Input
                  value={config.monetagZoneId || ''}
                  onChange={(e) => updateConfigField('monetagZoneId', e.target.value)}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="9475832"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits & Features */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-yellow-400" />
              Limits & Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Daily Energy Ads
                </label>
                <Input
                  type="number"
                  value={config.dailyEnergyAdLimit || 10}
                  onChange={(e) => updateConfigField('dailyEnergyAdLimit', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Hourly Energy Ads
                </label>
                <Input
                  type="number"
                  value={config.hourlyEnergyAdLimit || 3}
                  onChange={(e) => updateConfigField('hourlyEnergyAdLimit', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Daily Box Ads
                </label>
                <Input
                  type="number"
                  value={config.dailyBoxAdLimit || 10}
                  onChange={(e) => updateConfigField('dailyBoxAdLimit', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Hourly Box Ads
                </label>
                <Input
                  type="number"
                  value={config.hourlyBoxAdLimit || 3}
                  onChange={(e) => updateConfigField('hourlyBoxAdLimit', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Max Energy
              </label>
              <Input
                type="number"
                value={config.maxEnergy || 500}
                onChange={(e) => updateConfigField('maxEnergy', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Min Withdrawal (STON)
              </label>
              <Input
                type="number"
                value={config.minWithdrawalAmount || 100000000}
                onChange={(e) => updateConfigField('minWithdrawalAmount', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
              />
            </div>
            
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Exchange Rates</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    STON to TON Rate
                  </label>
                  <Input
                    type="number"
                    step="0.0000001"
                    value={config.stonToTonRate || 0.0000001}
                    onChange={(e) => updateConfigField('stonToTonRate', parseFloat(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="0.0000001"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    USD to TON Rate
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.usdToTonRate || 5.50}
                    onChange={(e) => updateConfigField('usdToTonRate', parseFloat(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="5.50"
                  />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Withdrawals
                </label>
                <Switch
                  checked={config.withdrawalEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('withdrawalEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Mining
                </label>
                <Switch
                  checked={config.miningEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('miningEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Tasks
                </label>
                <Switch
                  checked={config.tasksEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('tasksEnabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Referrals
                </label>
                <Switch
                  checked={config.referralEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('referralEnabled', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Broadcast Section */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            Telegram Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Broadcast Message
            </label>
            <Textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Enter message to broadcast to all users..."
              className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              This will send a message to all registered users
            </p>
            <Button
              onClick={handleBroadcast}
              disabled={broadcasting || !broadcastText.trim()}
              className="bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-500/25"
            >
              {broadcasting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Broadcast
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
