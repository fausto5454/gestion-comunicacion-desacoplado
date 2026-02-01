// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // 🔒 Clases ancladas para PRODUCCIÓN (Vercel)
  safelist: [
    // Fondos con opacidad (CRÍTICO)
    "bg-yellow-300/60",
    "bg-blue-50/30",
    "bg-white/30",
    "bg-sky-200/50",
    "bg-emerald-400",

    // Sombras usadas en dashboard
    "shadow-sm",
    "shadow-md",
    "shadow-xl",
    "shadow-2xl",

    // Animaciones
    "animate-in",
    "fade-in",
    "duration-500",

    // Estados hover / group
    "hover:bg-blue-50/30",
    "group-hover:bg-amber-100",

    // Colores institucionales (por seguridad)
    "bg-primary-brand",
    "bg-secundary-green",
    "bg-secundary-yellow",
    "bg-secundary-red",
    "text-primary-brand",
    "text-secundary-green",
    "text-secundary-yellow",
    "text-secundary-red",
  ],

  theme: {
    extend: {
      // 🎨 Colores Institucionales (bien definidos)
      colors: {
        "primary-brand": "#1e3a8a",        // Azul Marino institucional
        "secundary-green": "#10b981",      // Verde institucional
        "secundary-yellow": "#facc15",     // Amarillo institucional
        "secundary-red": "#ef4444",        // Rojo institucional

        // Fondos UI
        "background-light": "#f9fafb",

        // Identidad IE
        "ie-yellow": "#FFD700",
        "ie-green": "#1B5E20",
      },
    },
  },

  plugins: [],
};
