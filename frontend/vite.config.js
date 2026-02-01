import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      // Esto inyecta los polyfills directamente sin necesidad de imports externos
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  // ELIMINAMOS build.rollupOptions.external para que el error de consola desaparezca
})
