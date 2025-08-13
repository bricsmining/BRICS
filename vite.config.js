import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Fallback: if API server is not running, return error
          proxy.on('error', (err, req, res) => {
            console.log('API proxy error - API server not available');
            res.writeHead(503, {
              'Content-Type': 'application/json',
            });
            res.end(JSON.stringify({
              error: 'API server not available',
              message: 'Please ensure the backend server is running'
            }));
          });
        }
      }
    }
  }
});