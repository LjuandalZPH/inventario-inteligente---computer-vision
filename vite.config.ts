import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },

    server: {
      // El HMR puede desactivarse mediante la variable DISABLE_HMR.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Desactiva la observación de archivos cuando HMR está deshabilitado.
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {},

      // Redirige las solicitudes /api al backend de Express.
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});