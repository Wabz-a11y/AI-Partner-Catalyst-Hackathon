// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '::',           // Allows access via IPv6 and external network (good for mobile testing)
    port: 8080,           // Your frontend runs on http://localhost:8080
    proxy: {
      // Proxy all /api requests to your Express backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Optional: rewrite if you want to remove /api prefix on backend
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  preview: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
  },
}));