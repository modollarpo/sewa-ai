// SEWA AI — frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
            urlPattern: /^https:\/\/api\.sewa\.health\/v1\/scans/,
            handler: 'NetworkFirst',
            options: { cacheName: 'sewa-api-cache', expiration: { maxAgeSeconds: 300 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true, ws: true } },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react:    ['react','react-dom'],
          charts:   ['recharts'],
          router:   ['react-router-dom'],
          query:    ['@tanstack/react-query'],
        },
      },
    },
  },
});
