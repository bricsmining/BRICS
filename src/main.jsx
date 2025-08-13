import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { initializeAdNetworks } from '@/ads/adsController'; // Import the ad network initialization function

console.log("Mounting root..."); // Debug log

// Initialize ad networks after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeAdNetworks();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
