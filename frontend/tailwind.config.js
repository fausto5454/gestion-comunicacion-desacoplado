/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  // 🔒 Clases ancladas para PRODUCCIÓN (Vercel)
  // Esto evita que el "PurgeCSS" elimine clases usadas dinámicamente
  safelist: [
    // Fondos con opacidad (CRÍTICO para el Dashboard)
    "bg-yellow-300/60",
    "bg-blue-50/30",
    "bg-white/30",
    "bg-sky-200/50",
    "bg-emerald-400",

    // Sombras y Elevación
    "shadow-sm",
    "shadow-md",
    "shadow-xl",
    "shadow-2xl",

    // Animaciones de entrada (Modales y Alertas)
    "animate-in",
    "fade-in",
    "duration-500",

    // Estados Interactivos
    "hover:bg-blue-50/30",
    "group-hover:bg-amber-100",

    // Clases generadas con tus colores personalizados
    {
      pattern: /(bg|text)-(primary-brand|secundary-green|secundary-yellow|secundary-red|ie-yellow|ie-green)/,
    },
  ],

  theme: {
    extend: {
      // 🎨 Definición de Identidad Visual SIGESCOM
      colors: {
        // Colores Base de la App
        "primary-brand": "#1e3a8a",      // Azul Marino (Confianza/Seguridad)
        "secundary-green": "#10b981",    // Verde (Aprobado/Logro)
        "secundary-yellow": "#facc15",   // Amarillo (Proceso/Advertencia)
        "secundary-red": "#ef4444",      // Rojo (Requerido/Error)

        // Fondos UI y Superficies
        "background-light": "#f9fafb",

        // Colores de Identidad de la Institución Educativa
        "ie-yellow": "#FFD700",          // Oro (Excelencia)
        "ie-green": "#1B5E20",           // Bosque (Identidad IE)
      },
      
      // ✨ Extra: Bordes redondeados consistentes para el dashboard
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },

  plugins: [],
};