/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: './',
  // react-router v5 imports CJS prop-types; pre-bundle them up front so a
  // mid-session dep re-optimization can't leave a stale react-router chunk
  // that imports raw /node_modules/prop-types (no default export).
  optimizeDeps: {
    include: ['prop-types', 'react-router', 'react-router-dom'],
  },
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