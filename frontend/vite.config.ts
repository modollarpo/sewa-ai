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
      manifest: false, // using our own /public/manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/scans/,
            handler: 'NetworkFirst',
            options: { cacheName: 'sewa-scans-cache', expiration: { maxAgeSeconds: 300, maxEntries: 50 } },
          },
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/reports/,
            handler: 'NetworkFirst',
            options: { cacheName: 'sewa-reports-cache', expiration: { maxAgeSeconds: 3600, maxEntries: 20 } },
          },
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/users\/me/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'sewa-user-cache' },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'sewa-assets-cache', expiration: { maxEntries: 100 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3005,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true, ws: true } },
  },
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
          forms:    ['react-hook-form', '@hookform/resolvers', 'zod'],
          utils:    ['date-fns', 'axios', 'zustand', 'i18next', 'react-i18next'],
        },
      },
    },
  },
});
