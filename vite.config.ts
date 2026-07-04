/// <reference types="vitest" />

import { createRequire } from 'node:module'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const require = createRequire(import.meta.url)

// The Azure Face Liveness SDK is a gated package (see .npmrc) that isn't
// installed unless AZURE_FACE_NPM_TOKEN is set. Only treat it as external
// when it's genuinely missing, so a build with real access still bundles it
// normally instead of shipping an unresolvable bare import.
const AZURE_FACE_LIVENESS_MODULE = '@azure/ai-vision-face-ui/FaceLivenessDetector.js'

function isModuleInstalled(id: string): boolean {
  try {
    require.resolve(id)
    return true
  } catch {
    return false
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  build: {
    rollupOptions: {
      external: (id) =>
        id === AZURE_FACE_LIVENESS_MODULE && !isModuleInstalled(AZURE_FACE_LIVENESS_MODULE),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  base: './'
})
