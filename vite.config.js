// C:\management-score\vite.config.js

import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    hmr: {
      overlay: false
    }
  },
  resolve: { 
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)) 
    }
  }
})
