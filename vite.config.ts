import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { aiRecognitionPlugin } from './vite-plugin-ai-recognition';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    aiRecognitionPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
