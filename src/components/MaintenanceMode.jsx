import React from 'react';
import { motion } from 'framer-motion';
import { Settings, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MaintenanceMode = ({ config }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30 shadow-2xl">
          <CardContent className="p-8">
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mx-auto mb-6 w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center"
            >
              <Settings className="h-8 w-8 text-orange-400" />
            </motion.div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-400" />
              <h1 className="text-2xl font-bold text-white">
                {config?.appName || 'SkyTON'} Under Maintenance
              </h1>
            </div>
            
            <div className="space-y-4 text-gray-300">
              <p className="text-lg">
                We're currently performing scheduled maintenance to improve your experience.
              </p>
              
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>We'll be back shortly</span>
              </div>
              
              <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                <p className="text-sm text-orange-200">
                  <strong>What's happening:</strong><br />
                  Our team is working hard to bring you new features and improvements. 
                  Thank you for your patience!
                </p>
              </div>
              
              <div className="text-xs text-gray-500 mt-6">
                Version: {config?.appVersion || '1.0.0'}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MaintenanceMode;
