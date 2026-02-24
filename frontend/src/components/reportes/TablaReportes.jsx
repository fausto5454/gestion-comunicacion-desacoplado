import React, { useState } from 'react';

const TablaReportes = ({ datosTabla = [] }) => {
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 5; // Reducimos a 4 para asegurar que quepa en pantalla

  const ultimoIndice = paginaActual * registrosPorPagina;
  const primerIndice = ultimoIndice - registrosPorPagina;
  const registrosActuales = datosTabla.slice(primerIndice, ultimoIndice);
  const totalPaginas = Math.ceil(datosTabla.length / registrosPorPagina);

  return (
    // Añadimos 'min-h-[500px]' para darle un cuerpo constante y 'flex-col'
    <div className="bg-white rounded-xl shadow-md p-4 flex flex-col min-h-[520px] justify-between">
      <div>
        <h3 className="font-bold text-lg mb-4 text-gray-800 text-center border-b pb-2">
          Detalle de Comunicaciones
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full bg-sky-50/50 text-sm text-left">
            <thead>
              <tr className="text-gray-200 bg-slate-600 uppercase text-[9px] font-bold">
                <th className="pb-3 w-1/5">Título</th>
                <th className="pb-3 w-2/5">Mensaje</th>
                <th className="pb-3 w-1/5">Emisor</th>
                <th className="pb-3 w-1/5">Receptor</th>
                <th className="pb-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrosActuales.length > 0 ? (
                registrosActuales.map((reporte) => (
                  <tr key={reporte.id_comunicacion} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-2 font-medium text-gray-700 align-top">
                      {reporte.titulo}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 italic leading-snug align-top">
                      "{reporte.mensaje}"
                    </td>
                    <td className="py-3 text-gray-600 align-top">
                      {reporte.nombre_emisor}
                    </td>
                    <td className="py-3 align-top">
                      <div className="flex flex-col">
                        <span className="text-gray-800">{reporte.nombre_receptor}</span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          DNI: {reporte.dni_receptor || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-center align-top">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        reporte.estado === 'leído' 
                          ? 'bg-green-50 text-green-600 border-green-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {reporte.estado.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400">
                    No hay datos disponibles
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* FOOTER DE PAGINACIÓN: Forzado al final con mt-auto */}
      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Página <span className="font-semibold text-gray-700">{paginaActual}</span> de {totalPaginas}
           </p>
           <div className="flex items-center gap-1">
           <button
            onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
            disabled={paginaActual === 1}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Anterior"
             >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex gap-1">
            {[...Array(totalPaginas)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPaginaActual(i + 1)}
                className={`w-8 h-8 text-xs rounded-md border transition-colors ${
                  paginaActual === i + 1 
                  ? 'bg-green-600 text-white border-green-600 shadow-sm font-bold' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPaginaActual(p => Math.min(p + 1, totalPaginas))}
            disabled={paginaActual === totalPaginas}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TablaReportes;