import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ mode }) => {
  // Carga las variables del archivo .env según el modo (development/production)
  const env = loadEnv(mode, process.cwd(), '');
  
  // Ahora el log funcionará sin dar error de "undefined"
  console.log("🧩 Vite env test:", env.VITE_SUPABASE_URL);

  return {
    plugins: [
      nodePolyfills({
        globals: { Buffer: true, global: true, process: true },
      }),
      react(),
      tailwindcss(),
    ],
    // --- ESTA SECCIÓN ES LA QUE DESBLOQUEA EL ERROR DE VERCEL ---
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          // Ignora errores de dependencia circular que rompen el build en Vercel
          if (warning.code === 'CIRCULAR_DEPENDENCY') return;
          warn(warning);
        },
      },
    },
    // -----------------------------------------------------------
  }
})
