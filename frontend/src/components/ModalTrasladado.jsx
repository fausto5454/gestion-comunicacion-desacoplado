import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient'; 
import { toast } from 'sonner';

const ModalTrasladado = ({ isOpen, onClose, onUpdate }) => {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [alumnoSel, setAlumnoSel] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Limpieza integral al cerrar
  const handleClose = useCallback(() => {
    setBusqueda('');
    setResultados([]);
    setAlumnoSel(null);
    onClose();
  }, [onClose]);

  // 1. Buscador predictivo con Debounce
  useEffect(() => {
    if (busqueda.length < 3) {
      setResultados([]);
      return;
    }

    const buscar = async () => {
      try {
        const { data, error } = await supabase.rpc('buscar_estudiante_activo', { 
          query_text: busqueda.trim() 
        });
        if (error) throw error;
        setResultados(data || []);
      } catch (err) {
        console.error("Error SIGESCOM:", err.message);
      }
    };

    const timer = setTimeout(buscar, 400);
    return () => clearTimeout(timer);
  }, [busqueda]);

  // 2. Lógica de cambio de estado optimizada
  const aplicarCambio = async (nuevoEstado) => {
    if (!alumnoSel || cargando) return;
    setCargando(true);
    
    try {
      const { data, error } = await supabase.rpc('gestionar_baja_estudiante', {
        p_dni: alumnoSel.dni,
        p_estado: nuevoEstado
      });

      if (error) throw error;

      if (data?.status === 'success') {
        toast.success(`Estudiante marcado como ${nuevoEstado}`);
        if (onUpdate) onUpdate(); 
        handleClose();
      } else {
        throw new Error(data?.message || "Error en la base de datos.");
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-800 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden ring-1 ring-black/5">
        
        {/* Cabecera Institucional */}
        <div className="bg-[#1e293b] p-4 md:p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base tracking-tight leading-none">Gestión de Bajas</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">I.E. № 2079 A. Raimondi</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">✕</button>
        </div>

        <div className="p-5 md:p-6">
          {/* Input de Búsqueda con estilo responsivo */}
          <div className="relative">
            <input 
              type="text"
              autoFocus
              className="w-full p-4 border-2 border-orange-300 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none bg-red-50 text-slate-800 font-bold text-sm md:text-base placeholder:text-slate-400"
              placeholder="Buscar por Apellido o DNI"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            {/* Listado de Resultados */}
            {resultados.length > 0 && (
              <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-[110] divide-y divide-slate-50 border-t-0">
                {resultados.map((a) => (
                  <button 
                    key={a.dni}
                    onClick={() => { setAlumnoSel(a); setBusqueda(''); setResultados([]); }}
                    className="w-full text-left p-4 hover:bg-orange-50 flex flex-col transition-colors group"
                  >
                    <span className="font-black text-slate-700 text-xs md:text-sm group-hover:text-orange-600 uppercase">{a.nombre_completo}</span>
                    <span className="text-[10px] md:text-xs text-slate-400 font-mono mt-1">DNI: {a.dni}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirmación y Botones */}
          {alumnoSel ? (
            <div className="mt-6 p-4 md:p-5 rounded-2xl bg-orange-50 border border-orange-100 animate-in zoom-in-95 duration-200">
              <div className="text-center mb-5">
                <span className="text-[9px] uppercase tracking-widest font-black text-orange-600 bg-orange-200/30 px-2 py-1 rounded-md">Confirmar Acción</span>
                <p className="text-slate-800 font-black text-lg md:text-xl leading-tight mt-2 uppercase">{alumnoSel.nombre_completo}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  disabled={cargando}
                  onClick={() => aplicarCambio('Trasladado')}
                  className="bg-orange-500 text-white py-3.5 rounded-xl hover:bg-orange-400 transition-all font-black text-xs md:text-sm shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                >
                  {cargando ? 'PROCESANDO...' : 'TRASLADADO'}
                </button>
                <button 
                  disabled={cargando}
                  onClick={() => aplicarCambio('Retirado')}
                  className="bg-red-600 text-white py-3.5 rounded-xl hover:bg-red-400 transition-all font-black text-xs md:text-sm shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  {cargando ? '...' : 'RETIRADO'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 py-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 bg-slate-50/30">
              <div className="bg-white p-4 rounded-full shadow-sm mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingrese datos del estudiante</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalTrasladado;