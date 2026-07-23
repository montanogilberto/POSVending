/// <reference types="vitest" />

import basicSsl from '@vitejs/plugin-basic-ssl'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy(),
    // Serve the dev server over HTTPS. Stripe's embedded Connect components
    // refuse to render the UI layer when a live publishable key is used on an
    // insecure (http://) origin, so local dev needs https://localhost.
    basicSsl()
  ],
  server: {
    https: {}
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  base: './'
})
