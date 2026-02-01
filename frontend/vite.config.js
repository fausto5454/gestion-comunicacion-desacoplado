import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
      }),
      react(),
      tailwindcss(),
    ],
    // ESTE BLOQUE ELIMINA EL ERROR "EXITED WITH 1"
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Ignora el error de dependencia circular que aparece en tus logs
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
  }
})
