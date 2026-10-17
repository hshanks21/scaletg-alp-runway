import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
// Ports come from the environment (.env) — VITE_PORT (frontend) and
// VITE_BACKEND_PORT (proxy target). loadEnv() is required here because
// Vite does NOT populate process.env from .env files during config eval.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: {
        '/api': `http://localhost:${env.VITE_BACKEND_PORT || '5000'}`,
      },
    },
  };
});
