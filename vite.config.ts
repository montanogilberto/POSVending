/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// `npm run dev` calls the local backend over http (API_BASE_URL → http://localhost:8000),
// but index.html's CSP only allows https: connections. Widen it for the dev server only;
// production builds keep the strict policy.
const devLocalApiCsp = (): Plugin => ({
  name: 'dev-local-api-csp',
  apply: 'serve',
  transformIndexHtml: (html) =>
    html.replace("data: blob: https:;", "data: blob: https: http://localhost:8000;"),
});

// vite.config.ts
export default defineConfig({
  plugins: [react(), devLocalApiCsp()],
  base: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 3D first: '@react-three/*' also contains 'react', and matching it
            // as app-core dragged three.js into the startup bundle.
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            // Keep React, Ionic, and core node_modules together to prevent instance duplication
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('@ionic')
            ) {
              return 'vendor-app-core';
            }
            // Separate standalone heavy utilities
            if (id.includes('html2canvas') || id.includes('dompurify')) {
              return 'vendor-helpers';
            }
          }
        },
      },
    },
  },
});