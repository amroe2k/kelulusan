import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

/**
 * astro.config.frontend.mjs
 * ─────────────────────────
 * Konfigurasi build untuk FRONTEND PUBLIK saja.
 * Output: dist/frontend/
 *
 * Halaman yang dibangun:
 *   - / (index.astro)   → Halaman pengumuman kelulusan siswa
 *   - /login            → Halaman login
 *
 * Jalankan via: npm run build:frontend
 */
export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  outDir: './dist/frontend',
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8090',
          changeOrigin: true,
        }
      }
    }
  }
});
