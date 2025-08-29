import { useState, useEffect } from 'react';
import { getAdminConfig } from '@/data/firestore/adminConfig';

export const useAdminConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const adminConfig = await getAdminConfig();
      setConfig(adminConfig);
    } catch (err) {
      console.error('Error loading admin config:', err);
      setError(err);
      // Set default fallback config
      setConfig({
        withdrawalEnabled: true,
        miningEnabled: true,
        tasksEnabled: true,
        referralEnabled: true,
        maintenanceMode: false,
        appName: 'SkyTON',
        tokenName: 'STON',
        appVersion: '1.0.0'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    reload: loadConfig
  };
};
