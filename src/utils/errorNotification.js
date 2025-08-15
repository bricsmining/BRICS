/**
 * Global Error Notification System
 * Automatically sends error notifications to admin via Telegram bot
 */

import { getCurrentUser } from '@/data/firestore/userActions';

// Global error notification function
export async function notifyError(error, location, userId = null) {
  try {
    let userName = 'Unknown';
    
    // Try to get user info if userId is provided
    if (userId) {
      try {
        const user = await getCurrentUser(userId);
        userName = user?.firstName || user?.username || `User ${userId}`;
      } catch (userError) {
        console.warn('Failed to get user info for error notification:', userError);
      }
    }

    // Determine the API base URL
    const apiBaseUrl = window.location.hostname === 'localhost' ? 'https://skyton.vercel.app' : '';
    
    await fetch(`${apiBaseUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'admin',
        notificationType: 'webapp_error',
        data: {
          userId: userId || 'Anonymous',
          userName: userName,
          errorType: error.name || 'Error',
          errorMessage: error.message || error.toString(),
          location: location || 'Unknown',
          userAgent: navigator.userAgent || 'Unknown',
          stack: error.stack || 'No stack trace'
        }
      })
    });
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }
}

// Set up global error handlers
export function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    notifyError(
      new Error(event.reason?.message || event.reason || 'Unhandled promise rejection'),
      'Promise Rejection Handler'
    );
  });

  // Handle JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    notifyError(
      event.error || new Error(event.message || 'Unknown error'),
      `${event.filename}:${event.lineno}:${event.colno}`
    );
  });

  // Override console.error to catch logged errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Call original console.error
    originalConsoleError.apply(console, args);
    
    // Send notification for errors that look significant
    const message = args.join(' ');
    if (message.includes('Error') || message.includes('Failed') || message.includes('Exception')) {
      notifyError(
        new Error(message),
        'Console Error'
      );
    }
  };
}

// Helper to notify specific errors with context
export function notifyErrorWithContext(error, context, userId = null) {
  notifyError(error, context, userId);
}
