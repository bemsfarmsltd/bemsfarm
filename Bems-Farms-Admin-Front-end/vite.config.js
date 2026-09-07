import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  cacheDir: '/tmp/vite-cache',
  server: {
    port: 5174,
    strictPort: true,
    host: true,
  },
})
