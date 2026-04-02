import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient'; 
import { toast } from 'sonner';

const ModalTrasladado = ({ isOpen, onClose, onUpdate }) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [alumnoSel, setAlumnoSel] = useState(null);
  const [cargando, setCargando] = useState(false);

  // 1. Buscador predictivo optimizado
  useEffect(() => {
    const buscar = async () => {
      if (busqueda.length > 2) {
        try {
          const { data, error } = await supabase.rpc('buscar_estudiante_activo', { 
            query_text: busqueda 
          });
          if (error) throw error;
          setResultados(data || []);
        } catch (err) {
          console.error("Error en búsqueda:", err.message);
        }
      } else {
        setResultados([]);
      }
    };
    const timer = setTimeout(buscar, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // 2. Lógica de cambio de estado con manejo de errores
  const aplicarCambio = async (nuevoEstado) => {
    if (!alumnoSel) return;
    setCargando(true);
    
    try {
      const { data, error } = await supabase.rpc('gestionar_baja_estudiante', {
        p_dni: alumnoSel.dni,
        p_estado: nuevoEstado
      });

      if (error) throw error;

      if (data?.status === 'success') {
        // Feedback visual de éxito
        toast?.success ? toast.success(data.message) : alert(data.message);
        
        // Sincronización con el componente padre
        if (onUpdate) onUpdate(); 
        
        // Reset y cierre
        setAlumnoSel(null);
        setBusqueda('');
        onClose();
      } else {
        throw new Error(data?.message || "No se pudo procesar el cambio.");
      }
    } catch (err) {
      toast?.error ? toast.error(err.message) : alert(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        
        {/* Cabecera Estilo Sidebar */}
        <div className="bg-[#1e293b] p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </div>
            <h3 className="font-bold text-lg tracking-tight">Gestión de Bajas</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-500 mb-4 font-medium">
            Busque al estudiante por apellido o DNI para actualizar su estado de matrícula.
          </p>
          
          <div className="relative">
            <input 
              type="text"
              autoFocus
              className="w-full p-4 border-2 border-orange-400 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none bg-red-50 text-slate-800 font-medium"
              placeholder="Ej: Vasquez..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {/* Resultados Predictivos */}
            {resultados.length > 0 && (
              <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-[110] divide-y divide-slate-50">
                {resultados.map((a) => (
                  <button 
                    key={a.dni}
                    onClick={() => { setAlumnoSel(a); setBusqueda(''); setResultados([]); }}
                    className="w-full text-left p-4 hover:bg-orange-50 flex flex-col transition-colors group"
                  >
                    <span className="font-bold text-slate-700 text-sm group-hover:text-orange-600 transition-colors">{a.nombre_completo}</span>
                    <span className="text-xs text-slate-400 font-mono">DNI: {a.dni}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Área de Confirmación */}
          {alumnoSel ? (
            <div className="mt-6 p-5 rounded-2xl bg-orange-50 border border-orange-100 ring-4 ring-orange-50/50">
              <div className="text-center">
                <span className="text-[10px] uppercase tracking-widest font-black text-orange-600">CONFIRMAR MOVIMIENTO PARA:</span>
                <p className="text-slate-800 font-black text-xl leading-tight mt-1 uppercase">{alumnoSel.nombre_completo}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <button 
                  disabled={cargando}
                  onClick={() => aplicarCambio('Trasladado')}
                  className="bg-orange-500 border-2 border-orange-500 text-white py-3 rounded-xl hover:bg-orange-400 hover:text-white transition-all font-bold text-sm shadow-md active:scale-95 disabled:opacity-50"
                >
                  {cargando ? '...' : 'Trasladado'}
                </button>
                <button 
                  disabled={cargando}
                  onClick={() => aplicarCambio('Retirado')}
                  className="bg-red-600 border-2 border-red-500 text-white py-3 rounded-xl hover:bg-red-400 hover:text-white transition-all font-bold text-sm shadow-md active:scale-95 disabled:opacity-50"
                >
                  {cargando ? '...' : 'Retirado'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 py-10 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-300 bg-slate-50/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-xs mt-3 font-bold uppercase tracking-wider">Esperando búsqueda...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalTrasladado;