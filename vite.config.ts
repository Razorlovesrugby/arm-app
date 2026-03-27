import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: false, // we use our own public/manifest.json
      workbox: {
        // NetworkFirst for all Supabase API calls
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dgpplqzsukifcvddoxcd\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
        // CacheFirst for static assets (handled automatically by vite-plugin-pwa)
        // Offline fallback
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/availability\//], // availability form always needs network
      },
    }),
  ],
})
