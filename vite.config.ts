
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },

    server: {
      hmr: process.env.DISABLE_HMR !== 'true',

      watch: process.env.DISABLE_HMR === 'true' ? null : {},

      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },

        '/admin/oauth': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
        '/oauth': {
          target: 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },

    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
          admin: 'admin.html',
        },
      },
    },
  };
});
