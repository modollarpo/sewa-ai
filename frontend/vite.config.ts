// SEWA XAI — frontend/vite.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
    } as Record<string, unknown>
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: false,
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['sw.js', 'sw.js.map', 'workbox-*.js'],
      },
    }),
  ],
  server: {
    port: 3005,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true, ws: true } },
  },
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react', 'react-dom'],
          charts:   ['recharts'],
          router:   ['react-router-dom'],
          query:    ['@tanstack/react-query'],
          icons:    ['lucide-react'],
          video:    ['remotion', '@remotion/player', '@remotion/renderer'],
          cornerstone: ['@cornerstonejs/core', '@cornerstonejs/tools', '@cornerstonejs/dicom-image-loader', 'dicom-parser'],
          forms:    ['react-hook-form', '@hookform/resolvers', 'zod'],
          utils:    ['date-fns', 'axios', 'zustand', 'i18next', 'react-i18next'],
        },
      },
    },
  },
});
