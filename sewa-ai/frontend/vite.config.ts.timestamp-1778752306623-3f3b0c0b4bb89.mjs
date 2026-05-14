// vite.config.ts
import { defineConfig } from "file:///C:/sewa_extract/sewa-ai/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/sewa_extract/sewa-ai/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/sewa_extract/sewa-ai/frontend/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/*.png"],
      manifest: false,
      // using our own /public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/scans/,
            handler: "NetworkFirst",
            options: { cacheName: "sewa-scans-cache", expiration: { maxAgeSeconds: 300, maxEntries: 50 } }
          },
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/reports/,
            handler: "NetworkFirst",
            options: { cacheName: "sewa-reports-cache", expiration: { maxAgeSeconds: 3600, maxEntries: 20 } }
          },
          {
            urlPattern: /^https:\/\/api\.sewaxai\.health\/api\/v1\/users\/me/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "sewa-user-cache" }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|woff2)$/,
            handler: "CacheFirst",
            options: { cacheName: "sewa-assets-cache", expiration: { maxEntries: 100 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 3e3,
    strictPort: true,
    proxy: { "/api": { target: "http://localhost:5000", changeOrigin: true, ws: true } }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          charts: ["recharts"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxzZXdhX2V4dHJhY3RcXFxcc2V3YS1haVxcXFxmcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcc2V3YV9leHRyYWN0XFxcXHNld2EtYWlcXFxcZnJvbnRlbmRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L3Nld2FfZXh0cmFjdC9zZXdhLWFpL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Ly8gU0VXQSBBSSBcdTIwMTQgZnJvbnRlbmQvdml0ZS5jb25maWcudHNcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdpY29ucy8qLnBuZyddLFxuICAgICAgbWFuaWZlc3Q6IGZhbHNlLCAvLyB1c2luZyBvdXIgb3duIC9wdWJsaWMvbWFuaWZlc3QuanNvblxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZjJ9J10sXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9hcGlcXC5zZXdheGFpXFwuaGVhbHRoXFwvYXBpXFwvdjFcXC9zY2Fucy8sXG4gICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya0ZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnc2V3YS1zY2Fucy1jYWNoZScsIGV4cGlyYXRpb246IHsgbWF4QWdlU2Vjb25kczogMzAwLCBtYXhFbnRyaWVzOiA1MCB9IH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2FwaVxcLnNld2F4YWlcXC5oZWFsdGhcXC9hcGlcXC92MVxcL3JlcG9ydHMvLFxuICAgICAgICAgICAgaGFuZGxlcjogJ05ldHdvcmtGaXJzdCcsXG4gICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ3Nld2EtcmVwb3J0cy1jYWNoZScsIGV4cGlyYXRpb246IHsgbWF4QWdlU2Vjb25kczogMzYwMCwgbWF4RW50cmllczogMjAgfSB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9hcGlcXC5zZXdheGFpXFwuaGVhbHRoXFwvYXBpXFwvdjFcXC91c2Vyc1xcL21lLyxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdTdGFsZVdoaWxlUmV2YWxpZGF0ZScsXG4gICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ3Nld2EtdXNlci1jYWNoZScgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9cXC4oPzpwbmd8anBnfGpwZWd8c3ZnfGdpZnx3b2ZmMikkLyxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnc2V3YS1hc3NldHMtY2FjaGUnLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEwMCB9IH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgc3RyaWN0UG9ydDogdHJ1ZSxcbiAgICBwcm94eTogeyAnL2FwaSc6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJywgY2hhbmdlT3JpZ2luOiB0cnVlLCB3czogdHJ1ZSB9IH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICByZWFjdDogICAgWydyZWFjdCcsJ3JlYWN0LWRvbSddLFxuICAgICAgICAgIGNoYXJ0czogICBbJ3JlY2hhcnRzJ10sXG4gICAgICAgICAgcm91dGVyOiAgIFsncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIHF1ZXJ5OiAgICBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsZUFBZSxhQUFhO0FBQUEsTUFDNUMsVUFBVTtBQUFBO0FBQUEsTUFDVixTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsc0NBQXNDO0FBQUEsUUFDckQsa0JBQWtCO0FBQUEsUUFDbEIsZ0JBQWdCO0FBQUEsVUFDZDtBQUFBLFlBQ0UsWUFBWTtBQUFBLFlBQ1osU0FBUztBQUFBLFlBQ1QsU0FBUyxFQUFFLFdBQVcsb0JBQW9CLFlBQVksRUFBRSxlQUFlLEtBQUssWUFBWSxHQUFHLEVBQUU7QUFBQSxVQUMvRjtBQUFBLFVBQ0E7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVMsRUFBRSxXQUFXLHNCQUFzQixZQUFZLEVBQUUsZUFBZSxNQUFNLFlBQVksR0FBRyxFQUFFO0FBQUEsVUFDbEc7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTLEVBQUUsV0FBVyxrQkFBa0I7QUFBQSxVQUMxQztBQUFBLFVBQ0E7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVMsRUFBRSxXQUFXLHFCQUFxQixZQUFZLEVBQUUsWUFBWSxJQUFJLEVBQUU7QUFBQSxVQUM3RTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLElBQ1osT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLHlCQUF5QixjQUFjLE1BQU0sSUFBSSxLQUFLLEVBQUU7QUFBQSxFQUNyRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osT0FBVSxDQUFDLFNBQVEsV0FBVztBQUFBLFVBQzlCLFFBQVUsQ0FBQyxVQUFVO0FBQUEsVUFDckIsUUFBVSxDQUFDLGtCQUFrQjtBQUFBLFVBQzdCLE9BQVUsQ0FBQyx1QkFBdUI7QUFBQSxRQUNwQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
