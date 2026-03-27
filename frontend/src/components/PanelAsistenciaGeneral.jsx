import React, { useState, useEffect } from 'react';
import { LayoutGrid, Filter, Clock } from 'lucide-react';
import AsistenciaAlumnos from './AsistenciaAlumnos'; // Verifica que la ruta sea correcta
import AsistenciaAuxiliar from './AsistenciaAuxiliar'; // El componente que vimos en tus capturas

const PanelAsistenciaGeneral = ({ session, perfilUsuario }) => {
  const [seleccion, setSeleccion] = useState({ grado: '', seccion: '', turno: '' });

  // Datos para los selectores (esto podría venir de una base de datos más adelante)
  const grados = ['1', '2', '3', '4', '5'];
  const secciones = ['A', 'B', 'C'];
  const turnos = ['MAÑANA', 'TARDE'];

  // Efecto para depuración: verifica si llegan las props
  useEffect(() => {
    console.log("Sesión activa:", session);
    console.log("Perfil:", perfilUsuario);
  }, [session, perfilUsuario]);

  return (
    <div className="space-y-6">
      {/* Banner de Título dinámico */}
      <div className="bg-green-600 p-4 rounded-lg shadow-sm">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <LayoutGrid size={24} />
          {perfilUsuario?.rol_id === 5 ? 'GESTIÓN DE ASISTENCIA AUXILIAR' : 'GESTIÓN DE ASISTENCIA ACADÉMICA'}
        </h2>
      </div>

      {/* Selector de Grupo mejorado */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-green-700 font-bold mr-2">
          <Filter size={20} />
          <span>Filtros de búsqueda:</span>
        </div>
        
        {/* Selector de Grado */}
       <select 
        className="..."
        value={seleccion.grado}
        onChange={(e) => setSeleccion({...seleccion, grado: e.target.value})}
        >
       <option value="">Grado</option>
       {grados.map(g => (
       /* value="1" para la lógica, pero se muestra "1°" para el usuario */
       <option key={g} value={g}>{g}° Grado</option>
       ))}
       </select>

     {/* Selector de Sección */}
     <select 
     className="..."
     value={seleccion.seccion}
     onChange={(e) => setSeleccion({...seleccion, seccion: e.target.value})}
     >
     <option value="">Sección</option>
      {secciones.map(s => (
       /* Aseguramos que el valor sea puramente la letra 'A', 'B', etc. */
      <option key={s} value={s}>Sección "{s}"</option>
      ))}
      </select>

        {/* Selector de Turno (Mejora añadida para Auxiliares) */}
        <select 
          className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-green-500 text-sm"
          value={seleccion.turno}
          onChange={(e) => setSeleccion({...seleccion, turno: e.target.value})}
        >
          <option value="">Turno</option>
          {turnos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Renderizado Condicional de la Lista */}
      {seleccion.grado && seleccion.seccion ? (
        // Si es auxiliar (rol 5), usa la lógica de AsistenciaAuxiliar
        perfilUsuario?.rol_id === 5 ? (
          <AsistenciaAuxiliar 
            grado={seleccion.grado} 
            seccion={seleccion.seccion} 
            turno={seleccion.turno}
            session={session}
          />
        ) : (
          // Si es docente o admin, usa AsistenciaAlumnos
          <AsistenciaAlumnos 
            grado={seleccion.grado} 
            seccion={seleccion.seccion} 
            session={session}
          />
        )
      ) : (
        /* Estado vacío cuando no hay selección */
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
          <Clock size={48} className="mb-2 opacity-20" />
          <p className="font-medium">Esperando selección de salón</p>
          <p className="text-xs">Selecciona un grado y sección para desplegar la nómina de estudiantes</p>
        </div>
      )}
    </div>
  );
};

export default PanelAsistenciaGeneral;