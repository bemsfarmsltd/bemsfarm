import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/admin/',
  cacheDir: '/tmp/vite-cache',
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'https://api.bemsfarms.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
