import React from 'react';

const LogoSigescomVisibilidad = () => (
  <div className="flex flex-col items-center justify-center p-4 bg-[#111827] rounded-lg">
    {/* Contenedor del logo con fondo Gray 900 de Tailwind */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 450 150"
      className="w-full h-auto"
    >
      <defs>
        {/* Degradado de alta intensidad: Cian a Azul Eléctrico */}
        <linearGradient id="visibilidadGradiente" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#00F2FE', stopOpacity: 1 }} /> 
          <stop offset="100%" style={{ stopColor: '#4FACFE', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Isotipo S Corregido, Dinámico e Inconfundible */}
      <path
        d="M30 40 Q 30 20, 50 20 L 70 20 Q 90 20, 90 40 L 90 50 L 60 50 L 60 40 L 40 40 L 40 80 L 80 80 L 80 70 L 50 70 L 50 60 L 90 60 L 90 80 Q 90 100, 70 100 L 50 100 Q 30 100, 30 80 Z"
        fill="url(#visibilidadGradiente)"
      />

      {/* Píxeles decorativos en Verde Neón intenso para visibilidad */}
      <rect x="95" y="10" width="12" height="12" rx="2" fill="#33FF66" />
      <rect x="110" y="10" width="12" height="12" rx="2" fill="#33FF66" />
      <rect x="95" y="25" width="12" height="12" rx="2" fill="#33CCFF" />

      {/* Texto Principal en blanco puro para contraste - SIGESCOM 2079 */}
      <text
        x="120"
        y="50"
        fill="#FFFFFF"
        style={{ fontSize: '30px', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}
      >
        SIGESCOM 2079
      </text>

      {/* Subtítulos claros y legibles sobre el fondo oscuro */}
      <text
        x="120"
        y="80"
        fill="#E5E7EB" // Gris muy claro para contraste superior
        style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
      >
        Sistema de Gestión de Comunicaciones
      </text>
      <text
        x="120"
        y="100"
        fill="#E5E7EB"
        style={{ fontSize: '12px', fontFamily: 'Arial, sans-serif' }}
      >
        IE N° 2079 Antonio Raimondi
      </text>
    </svg>
  </div>
);

export default LogoSigescomVisibilidad;