import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Import the plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ // Add the PWA plugin configuration
      registerType: 'autoUpdate', // Automatically update the service worker
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'], // Assets to cache
      manifest: {
        name: 'Daily Planner PWA',
        short_name: 'DailyPlan',
        description: 'A progressive web app for daily planning and tracking.',
        theme_color: '#3b82f6', // Example: blue-500
        background_color: '#ffffff', // White background
        display: 'standalone', // Open as a standalone app
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Path relative to public directory
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png', // Use the same icon for maskable
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable', // Important for Android adaptive icons
          },
        ],
      },
      // Optional: Workbox configuration for service worker caching strategies
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cache these file types
        runtimeCaching: [ // Example: Cache API calls (adjust pattern if needed)
          {
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst', // Try network first, fallback to cache
            options: {
              cacheName: 'gemini-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200] // Cache successful responses
              }
            }
          },
          {
             urlPattern: ({ url }) => url.origin === import.meta.env.VITE_SUPABASE_URL, // Cache Supabase calls
             handler: 'NetworkFirst',
             options: {
               cacheName: 'supabase-cache',
               expiration: {
                 maxEntries: 30,
                 maxAgeSeconds: 60 * 60 * 24 // 1 day
               },
               cacheableResponse: {
                 statuses: [0, 200]
               }
             }
           }
        ]
      },
      devOptions: {
        enabled: true // Enable PWA features in development for testing
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})
