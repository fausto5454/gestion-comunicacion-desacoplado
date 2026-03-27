import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { Save, Loader2, Bookmark, Users, Calendar, FileSpreadsheet, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const AsistenciaAuxiliar = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Estados para selectores según capturas
  const [gradoSeccion, setGradoSeccion] = useState(""); 
  const [turno, setTurno] = useState("MAÑANA");
  const [isSaving, setIsSaving] = useState(false);

  const opcionesGradoSeccion = useMemo(() => [
    "1° A", "1° B", "1° C","2° A", "2° B", "2° C","3° A", "3° B", "4° A", "4° B", "5° A", "5° B"
  ], []);

  // Carga inicial
  useEffect(() => {
    if (!gradoSeccion) setGradoSeccion(opcionesGradoSeccion[0]);
  }, [gradoSeccion, opcionesGradoSeccion]);

  const fetchNomina = useCallback(async () => {
  if (!gradoSeccion || !fecha) return; // Evita consultas con datos incompletos
  
  setLoading(true);
  try {
    const partes = gradoSeccion.split(' ');
    const grado = partes[0];
    const seccion = partes[1];
    
    // 1. Traer la lista de alumnos de 'matriculas'
    // Corregido: 'anio_lectivo' con guion bajo para evitar error 400
    const { data: listaAlumnos, error: errorMatriculas } = await supabase
      .from('matriculas')
      .select('dni_estudiante, apellido_paterno, apellido_materno, nombres')
      .eq('grado', grado)
      .eq('seccion', seccion)
      .eq('anio_lectivo', 2026) // Enviado como número
      .eq('estado_estudiante', 'Activo');

    if (errorMatriculas) throw errorMatriculas;

    // 2. Traer la asistencia ya registrada hoy en ConsolidadoGeneral
    // Corregido: Verificamos que 'fecha' sea una cadena limpia YYYY-MM-DD
    const fechaLimpia = typeof fecha === 'string' ? fecha.split(':')[0] : fecha;

    const { data: asistenciasHoy, error: errorConsolidado } = await supabase
      .from('ConsolidadoGeneral')
      .select('dni_estudiante, estado')
      .eq('fecha', fechaLimpia);

    if (errorConsolidado) {
      console.warn("No se encontró registro previo en ConsolidadoGeneral, se usará 'P' por defecto.");
    }

    if (listaAlumnos && listaAlumnos.length > 0) {
      setEstudiantes(listaAlumnos);
      const mapAsist = {};
      
      listaAlumnos.forEach(est => {
        const reg = asistenciasHoy?.find(a => a.dni_estudiante === est.dni_estudiante);
        // Mapeamos el estado existente (P, F, T, J, FJ, TJ)
        mapAsist[est.dni_estudiante] = reg ? reg.estado : 'P';
      });
      
      setAsistencia(mapAsist);
    } else {
      setEstudiantes([]); // Limpia la lista si no hay resultados
      toast.info("No se encontraron estudiantes para este grado/sección.");
    }

  } catch (err) {
    console.error("Error detallado en fetchNomina:", err);
    toast.error(`Error de sincronización inicial: ${err.message}`);
  } finally {
    setLoading(false);
  }
  }, [gradoSeccion, fecha]);

  useEffect(() => {
    fetchNomina();
  }, [fetchNomina]);

  const toggleAsistencia = (dni, estado) => {
    setAsistencia(prev => ({ ...prev, [dni]: estado }));
  };

 const guardarAsistencia = async () => {
  setIsSaving(true);
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("No se pudo identificar al usuario. Inicia sesión nuevamente.");
    }

    const [grado, seccion] = gradoSeccion.split(' ');

    const registros = estudiantes.map(est => ({
      dni_estudiante: est.dni_estudiante,
      fecha: fecha.split('T')[0], 
      estado: asistencia[est.dni_estudiante] || '.', // El PUNTO administrativo solicitado
      grado: grado,
      seccion: seccion,
      turno: turno.toUpperCase(), 
      anio_lectivo: 2026,
      usuario_gmail: user.email, 
      observaciones: `CONTROL AUXILIAR - ${turno}`
    }));

    // EL CAMBIO ESTÁ AQUÍ:
    const { error } = await supabase
      .from('asistencia_auxiliar') // <--- ASEGÚRATE QUE DIGA ESTO, NO 'ConsolidadoGeneral'
      .select('*')
      .eq('fecha', fecha.split('T')[0])
      .eq('grado', grado)
      .eq('seccion', seccion);

    if (error) throw error;

    toast.success("Sincronización administrativa exitosa");
  } catch (err) {
    console.error("Error en sincronización:", err);
    // Este mensaje ya no debería mostrar el error de "relation does not exist"
    toast.error(`Fallo de validación: ${err.message}`);
  } finally {
    setIsSaving(false);
  }
  };

  useEffect(() => {
  // Definimos la variable dentro del efecto
  const canalSincro = supabase
    .channel('sincro-total')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'asistencia_auxiliar' }, // Verifica este nombre
      (payload) => {
        const { dni_estudiante, estado } = payload.new;
        setAsistencia((prev) => ({
          ...prev,
          [dni_estudiante]: estado
        }));
      }
    )
    .subscribe();

    return () => {
      supabase.removeChannel(canalSincro);
    };
  }, [gradoSeccion, fecha]);

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      <Toaster richColors />
      {/* Sub-Header Gris Oscuro (Captura 1) */}
     <div className="p-4 md:p-6 bg-slate-600 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-5 w-full lg:w-auto">
          <div className="hidden sm:block bg-pink-600 p-6 rounded-3xl text-white shadow-lg">
            <Bookmark size={24} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-green-400 text-xl font-black uppercase mb-2">Asistencia Auxiliar</h3>
            <div className="flex gap-2">
              <div className="relative">
              <select 
                value={gradoSeccion}
                onChange={(e) => setGradoSeccion(e.target.value)}
                 className="pl-5 pr-10 py-2 bg-green-50 text-gray-600 font-bold rounded-full border-none shadow-md appearance-none cursor-pointer hover:bg-green-100 transition-all text-[10px] md:text-[11px]"
                >
                {opcionesGradoSeccion.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
              </div>
              <select 
                value={turno} 
                onChange={(e) => setTurno(e.target.value)} 
                className="px-4 py-1.5 bg-white text-emerald-700 font-bold rounded-full text-xs outline-none border-none shadow-sm"
              >
                <option value="MAÑANA">MAÑANA</option>
                <option value="TARDE">TARDE</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button className="p-2 bg-white text-emerald-600 rounded-lg shadow-md hover:bg-emerald-50"><FileSpreadsheet size={18}/></button>
           <button className="p-2 bg-white text-red-600 rounded-lg shadow-md hover:bg-red-50"><FileText size={18}/></button>
           <div className="relative ml-2">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="date" 
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)} 
                className="pl-9 pr-3 py-2 bg-white rounded-xl text-xs font-bold text-slate-600 outline-none shadow-md" 
              />
           </div>
        </div>
      </div>

      {/* Tabla Estilo Captura */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full border rounded-2xl overflow-hidden border border-gray-300 min-w-[450px]">
          <thead>
             <tr className="bg-gray-500">
                <th className="border border-gray-300 px-3 py-2 text-left text-[10px] font-black text-green-400 bg-emerald-800 uppercase w-10">N°</th>
                <th className="border border-gray-300 px-4 py-2 text-left text-[10px] font-black text-green-400 uppercase tracking-wider">Apellidos y Nombres</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-black text-green-400 bg-pink-600 uppercase w-40">Estado</th>
              </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan="3" className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
            ) : estudiantes.length > 0 ? (
              estudiantes.map((est, i) => (
                <tr key={est.dni_estudiante} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center text-[11px] font-bold text-emerald-600 bg-emerald-100/60">{i + 1}</td>
                  <td className="border border-gray-300 px-4 py-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-tight block">
                      {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 bg-emerald-100/70">
                    <div className="flex justify-center gap-1">
                      {['P', 'F', 'T', 'J', 'FJ', 'TJ'].map((l) => {
                        const isActive = asistencia[est.dni_estudiante] === l;
                        // Colores de los botones según tus capturas
                        const colorClass = {
                          'P': isActive ? 'bg-slate-500 text-white' : 'bg-slate-200 text-slate-400',
                          'F': isActive ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-300',
                          'T': isActive ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-300',
                          'J': isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300',
                          'FJ': isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-300',
                          'TJ': isActive ? 'bg-sky-400 text-white' : 'bg-slate-100 text-slate-300',
                        };

                        return (
                          <button
                            key={l}
                            onClick={() => toggleAsistencia(est.dni_estudiante, l)}
                            className={`w-7 h-7 rounded-md text-[10px] font-black transition-all ${colorClass[l]}`}
                          >
                            {l === 'P' ? '.' : l}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="p-12 text-center text-slate-400 font-bold italic">
                  No hay estudiantes cargados. Selecciona un grado válido.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con contador y guardado */}
      <div className="p-6 bg-slate-50 border-t border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
          <Users size={14} /> {estudiantes.length} Alumnos en lista
        </div>
        <button 
          onClick={guardarAsistencia}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
          disabled={estudiantes.length === 0 || isSaving}
          >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
          {isSaving ? 'GUARDANDO...' : `GUARDAR CONTROL ${turno}`}
        </button>
      </div>
    </div>
  );
};

export default AsistenciaAuxiliar;