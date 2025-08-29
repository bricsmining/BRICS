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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Users,
  Zap,
  DollarSign,
  Shield,
  Globe,
  Activity,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  Bot,
  Mail,
  Hash,
  Wallet
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { 
  getAdminConfig, 
  updateAdminConfig, 
  getEnvConfig
} from '@/data/firestore/adminConfig';

const AdminSettings = ({ adminData }) => {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Web App URL</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${envConfig.webAppUrl ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <span className="text-xs text-gray-400">
                    {envConfig.webAppUrl ? envConfig.webAppUrl : 'Using Default'}
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

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                <Globe className="w-4 h-4 inline mr-1" />
                Telegram WebApp URL
              </label>
              <Input
                value={config.telegramWebAppUrl || ''}
                onChange={(e) => updateConfigField('telegramWebAppUrl', e.target.value)}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="https://your-domain.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                URL for "Open App" buttons in Telegram. Leave empty to use environment default.
              </p>
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
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  GigaPub Enabled
                </label>
                <Switch
                  checked={config.gigapubEnabled || false}
                  onCheckedChange={(checked) => updateConfigField('gigapubEnabled', checked)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  GigaPub Project ID
                </label>
                <Input
                  value={config.gigapubProjectId || ''}
                  onChange={(e) => updateConfigField('gigapubProjectId', e.target.value)}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="YOUR_PROJECT_ID"
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
                value={config.minWithdrawalAmount || 10000000}
                onChange={(e) => updateConfigField('minWithdrawalAmount', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Withdrawal Fee (TON)
              </label>
              <Input
                type="number"
                step="0.001"
                value={config.withdrawalFee || 0.008}
                onChange={(e) => updateConfigField('withdrawalFee', parseFloat(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="0.008"
              />
              <p className="text-xs text-gray-400 mt-1">
                Fee deducted from withdrawal amount (e.g., 0.008 TON fee means user receives amount - 0.008 TON)
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                STON to TON Exchange Rate
              </label>
              <Input
                type="number"
                step="0.0000001"
                value={config.stonToTonRate || 0.0000001}
                onChange={(e) => updateConfigField('stonToTonRate', parseFloat(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="0.0000001"
              />
              <p className="text-xs text-gray-400 mt-1">
                1 STON = {config.stonToTonRate || 0.0000001} TON (Currently: {Math.round(1 / (config.stonToTonRate || 0.0000001)).toLocaleString()} STON = 1 TON)
              </p>
            </div>
            
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Ad Rewards</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Energy Reward Amount
                  </label>
                  <Input
                    type="number"
                    value={config.energyRewardAmount || 10}
                    onChange={(e) => updateConfigField('energyRewardAmount', parseInt(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Energy points awarded per ad watch
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Box Reward Amount
                  </label>
                  <Input
                    type="number"
                    value={config.boxRewardAmount || 1}
                    onChange={(e) => updateConfigField('boxRewardAmount', parseInt(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Mystery boxes awarded per ad watch
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Referral System</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Referrer Reward (STON)
                  </label>
                  <Input
                    type="number"
                    value={config.referralReward || 100}
                    onChange={(e) => updateConfigField('referralReward', parseInt(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    STON tokens awarded to the person who shared the referral link
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Welcome Bonus (STON)
                  </label>
                  <Input
                    type="number"
                    value={config.welcomeBonus || 50}
                    onChange={(e) => updateConfigField('welcomeBonus', parseInt(e.target.value))}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="50"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    STON tokens awarded to the new user who joined via referral link
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Notification Channels</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    General Notifications Channel
                  </label>
                  <Input
                    type="text"
                    value={config.generalNotificationChannel || ''}
                    onChange={(e) => updateConfigField('generalNotificationChannel', e.target.value)}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="@your_general_channel or -1001234567890"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Channel for user joins, referrals, energy/box earnings, task completions, etc.
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Withdrawal Notifications Channel
                  </label>
                  <Input
                    type="text"
                    value={config.withdrawalNotificationChannel || ''}
                    onChange={(e) => updateConfigField('withdrawalNotificationChannel', e.target.value)}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="@your_withdrawal_channel or -1001234567890"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Channel for withdrawal requests, approvals, and related notifications
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Payment Notifications Channel
                  </label>
                  <Input
                    type="text"
                    value={config.paymentNotificationChannel || ''}
                    onChange={(e) => updateConfigField('paymentNotificationChannel', e.target.value)}
                    className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                    placeholder="@your_payment_channel or -1001234567890"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Channel for mining card purchases, payment confirmations, and related notifications
                  </p>
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

      {/* App Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="w-5 h-5 text-cyan-400" />
              App Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                App Name
              </label>
              <Input
                value={config.appName || 'SkyTON'}
                onChange={(e) => updateConfigField('appName', e.target.value)}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="SkyTON"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Token Name
              </label>
              <Input
                value={config.tokenName || 'STON'}
                onChange={(e) => updateConfigField('tokenName', e.target.value)}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="STON"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                App Version
              </label>
              <Input
                value={config.appVersion || '1.0.0'}
                onChange={(e) => updateConfigField('appVersion', e.target.value)}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="1.0.0"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">
                Maintenance Mode
              </label>
              <Switch
                checked={config.maintenanceMode || false}
                onCheckedChange={(checked) => updateConfigField('maintenanceMode', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* User Level Thresholds */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-orange-400" />
              User Level Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Level 2 (STON)
                </label>
                <Input
                  type="number"
                  value={config.level2Threshold || 5000000}
                  onChange={(e) => updateConfigField('level2Threshold', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="5000000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Level 3 (STON)
                </label>
                <Input
                  type="number"
                  value={config.level3Threshold || 20000000}
                  onChange={(e) => updateConfigField('level3Threshold', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="20000000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Level 4 (STON)
                </label>
                <Input
                  type="number"
                  value={config.level4Threshold || 50000000}
                  onChange={(e) => updateConfigField('level4Threshold', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="50000000"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Level 5 (STON)
                </label>
                <Input
                  type="number"
                  value={config.level5Threshold || 100000000}
                  onChange={(e) => updateConfigField('level5Threshold', parseInt(e.target.value))}
                  className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                  placeholder="100000000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mining Card Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1 */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-green-400" />
              Mining Card 1
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Rate per Hour (STON)
              </label>
              <Input
                type="number"
                value={config.card1RatePerHour || 150}
                onChange={(e) => updateConfigField('card1RatePerHour', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="150"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Price (TON)
              </label>
              <Input
                type="number"
                step="0.01"
                value={config.card1CryptoPrice || 0.1}
                onChange={(e) => updateConfigField('card1CryptoPrice', parseFloat(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="0.1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Validity (Days)
              </label>
              <Input
                type="number"
                value={config.card1ValidityDays || 7}
                onChange={(e) => updateConfigField('card1ValidityDays', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="7"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-blue-400" />
              Mining Card 2
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Rate per Hour (STON)
              </label>
              <Input
                type="number"
                value={config.card2RatePerHour || 250}
                onChange={(e) => updateConfigField('card2RatePerHour', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="250"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Price (TON)
              </label>
              <Input
                type="number"
                step="0.01"
                value={config.card2CryptoPrice || 0.25}
                onChange={(e) => updateConfigField('card2CryptoPrice', parseFloat(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="0.25"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Validity (Days)
              </label>
              <Input
                type="number"
                value={config.card2ValidityDays || 15}
                onChange={(e) => updateConfigField('card2ValidityDays', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="15"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3 */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="w-5 h-5 text-purple-400" />
              Mining Card 3
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
                Rate per Hour (STON)
              </label>
              <Input
                type="number"
                value={config.card3RatePerHour || 600}
                onChange={(e) => updateConfigField('card3RatePerHour', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="600"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Price (TON)
            </label>
              <Input
                type="number"
                step="0.01"
                value={config.card3CryptoPrice || 0.5}
                onChange={(e) => updateConfigField('card3CryptoPrice', parseFloat(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="0.5"
            />
          </div>
          
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Validity (Days)
              </label>
              <Input
                type="number"
                value={config.card3ValidityDays || 30}
                onChange={(e) => updateConfigField('card3ValidityDays', parseInt(e.target.value))}
                className="bg-input border-border focus:border-blue-500 focus:bg-input/80 text-white"
                placeholder="30"
              />
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
