import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

/**
 * astro.config.dashboard.mjs
 * ──────────────────────────
 * Konfigurasi build untuk ADMIN DASHBOARD saja.
 * Output: dist/dashboard/
 *
 * Halaman yang dibangun:
 *   - /login            → Halaman login admin
 *   - /dashboard/       → Dashboard index (redirect)
 *   - /dashboard/[view] → View halaman admin (overview, lembaga, identitas, ...)
 *
 * Jalankan via: npm run build:dashboard
 */
export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  outDir: './dist/dashboard',
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
