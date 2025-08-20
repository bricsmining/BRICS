import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const DisabledFeature = ({ 
  featureName, 
  icon: Icon = Settings, 
  message = "This feature is currently disabled by the administrator.",
  showCard = true 
}) => {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8 px-4"
    >
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="flex items-center justify-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">
          {featureName} Disabled
        </h3>
      </div>
      
      <p className="text-gray-300 text-sm max-w-sm mx-auto">
        {message}
      </p>
      
      <div className="mt-4 text-xs text-gray-500">
        Contact support if you believe this is an error
      </div>
    </motion.div>
  );

  if (showCard) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardContent className="p-0">
          {content}
        </CardContent>
      </Card>
    );
  }

  return content;
};

export default DisabledFeature;
