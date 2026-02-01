import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Habilita explícitamente los shims necesarios para evitar el error de los logs
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  build: {
    rollupOptions: {
      // Esto soluciona el error "[vite]: Rollup failed to resolve import" de tus capturas
      external: ['vite-plugin-node-polyfills/shims/global'],
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      },
    },
  },
  resolve: {
    alias: {
      // Redirección manual para asegurar que encuentre el polyfill
      'vite-plugin-node-polyfills/shims/global': 'vite-plugin-node-polyfills/dist/shims/global.js'
    }
  }
})
