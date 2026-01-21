// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Definición de Colores Institucionales
      colors: {
        'primary-brand': '#1e3a8a',  // Azul Marino (Blue-800) para la marca y elegancia
        'secundary-green': '#10b981', // Verde Institucional (Emerald-500)
        'secundary-yellow': '#facc15', // Amarillo Institucional (Yellow-400/500)
        'secundary-red': '#ef4444',    // Rojo Institucional (Red-500)
        // Fondo sutil para el dashboard
        'background-light': '#f9fafb',
        'ie-yellow': '#FFD700',
        'ie-green': '#1B5E20', 
      }
    },
  },
  
  plugins: [],
}
