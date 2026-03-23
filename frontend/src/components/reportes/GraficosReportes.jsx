import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Registramos los elementos necesarios de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const GraficosReportes = ({ stats }) => {
  const data = {
    labels: ['Leídos', 'No Leídos'],
    datasets: [
      {
        data: [stats.leidos || 0, stats.noLeidos || 0],
        backgroundColor: ['#22c55e', '#ef4444'],
        hoverBackgroundColor: ['#16a34a', '#dc2626'],
        borderWidth: 0,
        // Reducimos el cutout para que la dona se vea más sólida y equilibrada
        cutout: '65%', 
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom', // Leyenda abajo para ganar espacio lateral
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { size: 12, weight: '500' }
        }
      },
      tooltip: {
        backgroundColor: '#1f2937',
        padding: 12,
        cornerRadius: 8,
      }
    }
  };

  return (
    // Contenedor con altura fija para evitar saltos visuales
    <div className="relative h-[280px] w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
      
      {/* Texto central para indicar el porcentaje de éxito */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
        <span className="text-2xl font-bold text-gray-800">
          {stats.total > 0 ? Math.round((stats.leidos / stats.total) * 100) : 0}%
        </span>
        <span className="text-[10px] text-gray-400 uppercase font-semibold">Efectividad</span>
      </div>
    </div>
  );
};

export default GraficosReportes;

