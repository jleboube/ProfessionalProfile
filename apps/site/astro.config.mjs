import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [tailwind()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 3003,
    host: true
  },
  vite: {
    server: {
      fs: {
        allow: ['/uploads']
      }
    }
  }
});