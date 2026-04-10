import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'http://localhost:8080', ws: true },
    },
    // CSP is NOT set here — Vite's HMR injects inline scripts that break strict script-src.
    // Set Content-Security-Policy in nginx / CDN for production. Example:
    //   default-src 'self';
    //   script-src 'self';
    //   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    //   font-src 'self' https://fonts.gstatic.com;
    //   img-src 'self' data: blob: https://res.cloudinary.com;
    //   media-src 'self' blob: https://res.cloudinary.com;
    //   connect-src 'self' wss://yourdomain.com;
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
