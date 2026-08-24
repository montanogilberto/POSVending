/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// vite.config.ts
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
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
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
          }
        },
      },
    },
  },
});