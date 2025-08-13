/**
 * Consolidated Admin API handler
 * Handles all admin-related operations in one endpoint
 */

// Import individual handlers
import notifyAdminHandler from './notify-admin.js';
import broadcastHandler from './broadcast.js';
import verifyAdminHandler from './verifyAdmin.js';

export default async function handler(req, res) {
  // Extract the action from query parameter
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'notify':
        return await notifyAdminHandler(req, res);
      
      case 'broadcast':
        return await broadcastHandler(req, res);
      
      case 'verify':
        return await verifyAdminHandler(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: ['notify', 'broadcast', 'verify']
        });
    }
  } catch (error) {
    console.error('Error in consolidated admin handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      action: action || 'unknown'
    });
  }
}
