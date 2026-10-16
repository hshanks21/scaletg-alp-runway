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
    port: parseInt(process.env.VITE_PORT || '5173'),
    host: '0.0.0.0',
    proxy: {
      '/api': `http://localhost:${process.env.VITE_BACKEND_PORT || '5000'}`,
    },
  },
});
