import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { Save, Loader2, Bookmark, Users, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const obtenerFechaLima = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  };

const AsistenciaAuxiliar = () => {
  const [fecha, setFecha] = useState(obtenerFechaLima());
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [loading, setLoading] = useState(false);
  const [gradoSeccion, setGradoSeccion] = useState(""); 
  const [turno, setTurno] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // MEJORA 1: Detección automática de turno por horario escolar
 useEffect(() => {
    const horaActual = new Date().getHours();
    const turnoSugerido = horaActual >= 13 ? "TARDE" : "MAÑANA";
    setTurno(turnoSugerido);
  }, []);

  const opcionesGradoSeccion = useMemo(() => [
    "1° A", "1° B", "1° C","2° A", "2° B", "2° C","3° A", "3° B", "4° A", "4° B", "5° A", "5° B"
  ], []);

  useEffect(() => {
    if (!gradoSeccion) setGradoSeccion(opcionesGradoSeccion[0]);
  }, [gradoSeccion, opcionesGradoSeccion]);

  const fetchNomina = useCallback(async () => {
  if (!gradoSeccion || !fecha) return;
  
  setLoading(true);
  try {
    const [grado, seccion] = gradoSeccion.split(' ');
    const fechaISO = typeof fecha === 'string' ? fecha.split('T')[0] : new Date(fecha).toISOString().split('T')[0];

    // 1. Cargar alumnos activos (Matriculas)
    const { data: alumnos } = await supabase
      .from('matriculas')
      .select('dni_estudiante, apellido_paterno, apellido_materno, nombres')
      .eq('grado', grado)
      .eq('seccion', seccion.trim())
      .eq('anio_lectivo', 2026)
      .eq('estado_estudiante', 'Activo');

    // 2. Cargar asistencia (Docentes y Auxiliares compartiendo la misma tabla)
    const { data: asistenciaDB } = await supabase
      .from('asistencia')
      .select('dni_estudiante, estado, turno, observaciones')
      .eq('fecha', fechaISO)
      .eq('grado', grado)
      .eq('seccion', seccion.trim())
      .eq('turno', turno);

   if (alumnos) {
     setEstudiantes(alumnos);
     const nuevoMapaAsistencia = {};

     alumnos.forEach(est => {
        const registrosEst = asistenciaDB?.filter(a => 
        String(a.dni_estudiante) === String(est.dni_estudiante)
      );

     const regAuxiliar = registrosEst?.find(r => r.observaciones === 'GENERAL');
     const regDocente = registrosEst?.find(r => r.observaciones !== 'GENERAL');
     nuevoMapaAsistencia[est.dni_estudiante] = regAuxiliar 
       ? regAuxiliar.estado 
       : (regDocente ? regDocente.estado : 'P');
   });

   setAsistencia(nuevoMapaAsistencia);

    }
   } catch (err) {
     console.error("Error de sincronización:", err);
   } finally {
     setLoading(false);
   }
   }, [gradoSeccion, fecha, turno]);

  useEffect(() => {
    fetchNomina();
  }, [fetchNomina]);

  const guardarAsistencia = async () => {
  setIsSaving(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sesión expirada");

    // 1. VALIDACIÓN CRÍTICA: Evita que se guarde como NULL si el selector falló
    if (!turno) throw new Error("Debe seleccionar un TURNO (MAÑANA/TARDE) antes de guardar.");

    const [grado, seccion] = gradoSeccion.split(' ');
    
    // MEJORA: Normalización estricta de fecha para el Consolidado General
    const fechaISO = typeof fecha === 'string' ? fecha.split('T')[0] : new Date(fecha).toISOString().split('T')[0];

    const registros = estudiantes.map(est => {
      const estadoActual = asistencia[est.dni_estudiante];
      
      // UNIFICACIÓN: Si es punto, vacío o P, guardamos 'P'
      let estadoParaBD = 'P'; 
      if (['F', 'T', 'J', 'FJ', 'TJ'].includes(estadoActual)) {
        estadoParaBD = estadoActual;
      }

      return {
        dni_estudiante: String(est.dni_estudiante),
        fecha: fechaISO,
        estado: estadoParaBD,
        grado: grado,
        seccion: seccion.trim(), 
        turno: turno.toUpperCase(),
        observaciones: "GENERAL", 
        usuario_gmail: user.email,
        anio_lectivo: "2026"
      };
    });

    const { error } = await supabase
      .from('asistencia')
      .upsert(registros, { 
        onConflict: 'dni_estudiante,fecha,turno'});

    if (error) throw error;

    toast.success(`Asistencia ${turno} sincronizada correctamente`);
    
  } catch (err) {
    console.error("DETALLE DEL ERROR:", err);
    toast.error("Error: " + (err.message || "No se pudo actualizar"));
  } finally {
    setIsSaving(false);
  }
  };

  useEffect(() => {
    const canalAuxiliar = supabase
      .channel('cambios_desde_docente')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'asistencia' }, 
        (payload) => {
          fetchNomina(); 
        }
      )
      .subscribe();

    return () => supabase.removeChannel(canalAuxiliar);
  }, [fetchNomina]);

  const toggleAsistencia = (dni, estado) => {
    setAsistencia(prev => ({ ...prev, [dni]: estado }));
  };

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      <Toaster richColors position="top-right" />
      
      {/* Header Principal con Slate-600 */}
      <div className="p-4 md:p-4 bg-slate-600 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-3 md:gap-5 w-full lg:w-auto">
            <div className="hidden sm:block bg-pink-600 p-6 rounded-3xl text-white shadow-lg">
              <Bookmark size={24} />
            </div>
          <div>
            <h3 className="text-green-400 text-lg font-black uppercase leading-tight">Control de Asistencia</h3>
            <div className="flex gap-4 mt-1">
              <select 
                value={gradoSeccion}
                onChange={(e) => setGradoSeccion(e.target.value)}
                className="pl-5 pr-10 py-2 bg-green-50 text-slate-700 font-bold rounded-full text-[11px] shadow-inner outline-none cursor-pointer"
              >
                {opcionesGradoSeccion.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              <select
               value={turno}
               onChange={(e) => setTurno(e.target.value)}
               className={`px-3 py-1 rounded-full text-[10px] font-black outline-none cursor-pointer border-none shadow-sm transition-colors ${
               turno === 'MAÑANA' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-amber-100 text-amber-700'
               }`}>
               <option value="MAÑANA">MAÑANA</option>
               <option value="TARDE">TARDE</option>
              </select>
            </div>
          </div>
        </div>
        <div className="relative flex-1 md:flex-none min-w-[140px]">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
           <input 
            type="date" 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)} 
            className="w-full bg-white border-none rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-gray-600 shadow-sm ring-1 ring-gray-200 outline-none"
          />
        </div>
      </div>

      {/* Tabla con Bordes Finos */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full border rounded-2xl overflow-hidden border border-gray-300 min-w-[450px]">
          <thead>
            <tr className="bg-gray-500">
               <th className="border border-gray-300 px-3 py-2 text-left text-[10px] font-black text-green-400 bg-emerald-800 uppercase w-10">N°</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-[10px] font-black text-green-400 uppercase tracking-wider">Apellidos y Nombres</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-black text-green-400 bg-pink-600 uppercase w-40">Estado del Estudiante</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="3" className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
            ) : (
              estudiantes.map((est, i) => (
                <tr key={est.dni_estudiante} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-1.5 text-center text-[11px] font-bold text-emerald-600 bg-emerald-100/60 border-r border-gray-300">{i + 1}</td>
                  <td className="px-4 py-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase leading-none block">
                      {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
                    </span>
                  </td>
                  <td className="px-2 py-2 bg-emerald-100/60">
                    <div className="flex justify-center gap-1">
                      {['P', 'F', 'T', 'J', 'FJ', 'TJ'].map((l) => {
                        const isActive = asistencia[est.dni_estudiante] === l;
                        const colors = {
                          'P': isActive ? 'bg-slate-600 text-white' : 'bg-slate-200 text-white',
                          'F': isActive ? 'bg-red-500 text-white' : 'bg-white text-red-400',
                          'T': isActive ? 'bg-amber-400 text-white' : 'bg-white text-amber-400',
                          'J': isActive ? 'bg-green-500 text-white' : 'bg-white text-green-400',
                          'FJ': isActive ? 'bg-blue-500 text-white' : 'bg-white text-blue-400',
                          'TJ': isActive ? 'bg-sky-400 text-white' : 'bg-white text-sky-400',
                        };
                        return (
                          <button
                            key={l}
                            onClick={() => toggleAsistencia(est.dni_estudiante, l)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all transform active:scale-90 ${colors[l]}`}
                          >
                            {l}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Footer */}
      <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
          <Users size={14} /> {estudiantes.length} Alumnos
        </div>
        <button 
          onClick={guardarAsistencia}
          disabled={isSaving || estudiantes.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 
          GUARDAR REGISTRO {turno}
        </button>
      </div>
    </div>
  );
};

export default AsistenciaAuxiliar;