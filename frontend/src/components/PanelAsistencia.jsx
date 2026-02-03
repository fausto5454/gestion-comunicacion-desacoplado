import React, { useState } from 'react';
import AsistenciaAlumnos from '../components/AsistenciaAlumnos';
import { LayoutGrid, Filter } from 'lucide-react';

const PanelAsistencia = () => {
  const [seleccion, setSeleccion] = useState({ grado: '', seccion: '' });

  // Definimos tus 12 secciones (ajusta según tu realidad)
  const grados = ['1', '2', '3', '4', '5'];
  const secciones = ['A', 'B', 'C', 'D'];

  return (
    <div className="space-y-6">
      {/* Selector de Grupo */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-green-700 font-bold mr-4">
          <LayoutGrid size={20} />
          <span>Seleccionar Salón:</span>
        </div>
        
        <select 
          className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 text-sm"
          value={seleccion.grado}
          onChange={(e) => setSeleccion({...seleccion, grado: e.target.value})}
        >
          <option value="">Grado</option>
          {grados.map(g => <option key={g} value={g}>{g}° Grado</option>)}
        </select>

        <select 
          className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 text-sm"
          value={seleccion.seccion}
          onChange={(e) => setSeleccion({...seleccion, seccion: e.target.value})}
        >
          <option value="">Sección</option>
          {secciones.map(s => <option key={s} value={s}>Sección "{s}"</option>)}
        </select>
      </div>

      {/* Renderizado Condicional */}
      {seleccion.grado && seleccion.seccion ? (
        <AsistenciaAlumnos grado={seleccion.grado} seccion={seleccion.seccion} />
      ) : (
        <div className="h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
          <Filter size={48} className="mb-2 opacity-20" />
          <p>Selecciona un grado y sección para cargar la nómina</p>
        </div>
      )}
    </div>
  );
};

export default PanelAsistencia;