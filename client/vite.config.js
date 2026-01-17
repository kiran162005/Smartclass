import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'SmartClass',
        short_name: 'SmartClass',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5174,
    strictPort: true, // Fail if port is already in use
  },

  optimizeDeps: {
    include: ['its-fine'], // 👈 ensures it’s pre-bundled correctly
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  }
})
