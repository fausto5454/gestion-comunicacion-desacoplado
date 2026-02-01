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
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Esto evita que el build se detenga por las dependencias circulares de los polyfills
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
  }
})
