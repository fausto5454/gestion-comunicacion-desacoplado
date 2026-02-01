import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      // Forzamos la ruta al archivo que los logs dicen que no encuentran
      'vite-plugin-node-polyfills/shims/global': 'vite-plugin-node-polyfills/dist/shims/global.js',
    },
  },
  build: {
    rollupOptions: {
      // Instrucción recomendada por el log de Vercel para este error específico
      external: ['vite-plugin-node-polyfills/shims/global'],
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
    },
  },
})
