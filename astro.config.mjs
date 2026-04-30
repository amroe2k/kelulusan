import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [tailwind()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          // Proxy ke PHP built-in dev server (port 8090)
          // Root: public/ sehingga /api/xxx.php → public/api/xxx.php
          target: 'http://localhost:8090',
          changeOrigin: true,
        }
      }
    }
  }
});
