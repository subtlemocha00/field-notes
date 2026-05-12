import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/favicon-32.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/field_notes_logo.png'
      ],
      manifest: {
        id: '/',
        name: 'Field Notes',
        short_name: 'Field Notes',
        description: 'Construction field book for inspectors.',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          // Installability icons — purpose "any" is what Chrome's
          // installability checker actually requires. Separate from
          // maskable so neither classification disqualifies the other.
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          // Maskable variants — the logo already includes its own
          // padding so the same files work for adaptive icons. For
          // pixel-perfect Android adaptive icons, supply variants
          // designed with the 10% safe-zone padding.
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    // Option 1: Allow ONLY your ngrok URL (more secure)
    // allowedHosts: ['your-ngrok-subdomain.ngrok-free.app'],

    // Option 2: Allow ANY host (easier for quick testing)
    allowedHosts: true
  }
})
