import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Firebase v12 public entry points (stable .mjs files)
      'firebase/app': path.resolve(__dirname, 'node_modules/firebase/app/dist/index.mjs'),
      'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth/dist/index.mjs'),
      'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/firestore/dist/index.mjs'),
      'firebase/storage': path.resolve(__dirname, 'node_modules/firebase/storage/dist/index.mjs'),
      // Internal @firebase/* packages — use correct v12 ESM paths
      '@firebase/app': path.resolve(__dirname, 'node_modules/@firebase/app/dist/esm/index.esm.js'),
      '@firebase/auth': path.resolve(__dirname, 'node_modules/@firebase/auth/dist/esm/index.js'),
      '@firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage/dist/index.esm.js'),
    }
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
  }
})
