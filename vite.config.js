import { fileURLToPath, URL } from 'node:url' // Import ini penting untuk Node Path

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      // DEFINISI ALIAS BARU DI SINI
      '@': fileURLToPath(new URL('./src', import.meta.url)) 
      // Ini memberitahu Vite: Kapanpun kamu melihat '@/', arahkan ke folder './src'
    }
  }
})