import React, { useState, useCallback, useEffect } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import * as XLSX from 'xlsx';

const RegistroCompetencias = ({ userProfile }) => {
  // 1. ESTADOS
  const [grado, setGrado] = useState("1° A");
  const [area, setArea] = useState("MATEMÁTICA");
  const [bimestre, setBimestre] = useState(1);
  const [alumnos, setAlumnos] = useState(Array(35).fill(""));
  const [notas, setNotas] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const CONFIG_AREAS = {
    "MATEMÁTICA": ["RESUELVE PROBLEMAS DE CANTIDAD", "RESUELVE PROBLEMAS DE REGULARIDAD", "FORMA Y MOVIMIENTO", "GESTIÓN DE DATOS"],
    "COMUNICACIÓN": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"],
    "CIENCIA Y TECNOLOGÍA": ["INDAGA MEDIANTE MÉTODOS", "EXPLICA EL MUNDO FÍSICO", "DISEÑA SOLUCIONES"],
    "PERSONAL SOCIAL": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA", "CONSTRUYE INTERPRETACIONES HISTÓRICAS", "GESTIONA EL ESPACIO", "GESTIONA RECURSOS ECONÓMICOS"],
    "DPCC": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA DEMOCRÁTICAMENTE"],
    "ARTE Y CULTURA": ["APRECIA MANIFESTACIONES", "CREA PROYECTOS DESDE LENGUAJES"],
    "EDUCACIÓN FÍSICA": ["SE DESENVUELVE DE MANERA AUTÓNOMA", "ASUME UNA VIDA SALUDABLE", "INTERACTÚA A TRAVÉS DE HABILIDADES"],
    "EPT": ["GESTIONA PROYECTOS DE EMPRENDIMIENTO ECONÓMICO O SOCIAL"],
    "RELIGIÓN": ["CONSTRUYE SU IDENTIDAD COMO PERSONA DIGNA", "ASUME LA EXPERIENCIA DEL ENCUENTRO"],
    "INGLÉS": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"]
  };

  const competencias = CONFIG_AREAS[area] || [];
  const esAdministrador = !userProfile || userProfile?.rol_id === 1;
  const esDocente = userProfile?.rol_id === 3;
  const esEstudiante = userProfile?.rol_id === 6;
  const tienePermisoEscritura = esAdministrador || (esDocente && area === userProfile?.area_asignada);

  const normalizarTexto = (texto) => 
    texto ? texto.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

  useEffect(() => {
    if (userProfile) {
      if (esDocente && userProfile.area_asignada) setArea(userProfile.area_asignada);
      if ((esDocente || esEstudiante) && userProfile.grado_asignado) setGrado(userProfile.grado_asignado);
    }
  }, [userProfile, esDocente, esEstudiante]);

  const getColorNota = (nota) => {
    if (nota === 'C') return 'text-red-600';
    if (nota === 'B') return 'text-blue-600';
    if (nota === 'A' || nota === 'AD') return 'text-slate-700';
    return 'text-slate-700';
  };

  const generarKey = useCallback(() => {
    const areaSegura = normalizarTexto(area);
    return `reg_2026_${grado}_${areaSegura}_B${bimestre}`.replace(/\s+/g, '_').replace(/°/g, '');
  }, [grado, area, bimestre]);

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    const key = generarKey();
    try {
      const { data, error } = await supabase.from('calificaciones').select('alumnos, notas').eq('id', key).maybeSingle();
      if (error) throw error;
      if (data) {
        setAlumnos([...(data.alumnos || []), ...Array(35).fill("")].slice(0, 35));
        setNotas(data.notas || {});
      } else {
        setAlumnos(Array(35).fill(""));
        setNotas({});
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [generarKey]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
  const revertirEscala = (num) => {
    const v = Math.round(num);
    if (v >= 4) return "AD";
    if (v === 3) return "A";
    if (v === 2) return "B";
    if (v >= 1) return "C";
    return "-";
  };

  const calcularPromedio = (idAlumno, compIdx) => {
    let suma = 0, cont = 0;
    [1, 2, 3, 4].forEach(d => {
      const n = notas[`${idAlumno}-${compIdx}-${d}`];
      if (n && escala[n] > 0) { suma += escala[n]; cont++; }
    });
    return cont > 0 ? revertirEscala(suma / cont) : "-";
  };

  const calcularLogroBimestral = (idAlumno) => {
    let sumaLetras = 0, contComp = 0;
    competencias.forEach((_, cIdx) => {
      const letraProm = calcularPromedio(idAlumno, cIdx);
      if (letraProm !== "-") { sumaLetras += escala[letraProm]; contComp++; }
    });
    return contComp > 0 ? revertirEscala(sumaLetras / contComp) : "-";
  };

  const exportarExcel = () => {
    const dataExcel = alumnos
      .filter(n => n.trim() !== "")
      .filter(nombre => !esEstudiante || normalizarTexto(nombre) === normalizarTexto(userProfile?.nombre_completo))
      .map((nombre, idx) => {
        const fila = { "N°": idx + 1, "Estudiante": nombre };
        competencias.forEach((c, cIdx) => {
          [1, 2, 3, 4].forEach(d => {
            fila[`${c.substring(0,15)}.. D${d}`] = notas[`${nombre}-${cIdx}-${d}`] || "-";
          });
          fila[`PROM C${cIdx+1}`] = calcularPromedio(nombre, cIdx);
        });
        fila["LOGRO FINAL"] = calcularLogroBimestral(nombre);
        return fila;
      });

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    XLSX.writeFile(wb, `Registro_${grado}_${area}_B${bimestre}.xlsx`);
  };

  const handleGuardarTodo = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const { error } = await supabase.from('calificaciones').upsert({
        id: generarKey(),
        alumnos: alumnos.filter(n => n.trim() !== ""),
        notas: notas,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setMensaje({ texto: "¡Sincronizado con éxito!", tipo: "success" });
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {mensaje && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">{mensaje.texto}</span>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-800 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-800">¿Guardar cambios?</h3>
            <p className="text-slate-500 text-sm mb-8">Esta acción actualizará el registro oficial en la base de datos.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-colors hover:bg-green-400">Cancelar</button>
              <button onClick={handleGuardarTodo} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-slate-300 transition-transform active:scale-95">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Header adaptable */}
      <div className="bg-white border-b rounded-b-[2.5rem] p-4 md:p-6 shadow-sm z-40">
        <div className="max-w-full mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="bg-green-600 p-3 md:p-4 rounded-2xl md:rounded-3xl text-white shadow-lg">
              <FileSpreadsheet className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className="text-lg md:text-2xl font-black text-slate-800 tracking-tighter">Registro 2026</h1>
              <div className="flex items-center gap-2">
                <select value={grado} onChange={(e) => setGrado(e.target.value)} disabled={!esAdministrador} className="bg-slate-100 border text-[9px] md:text-[10px] font-bold px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl outline-none border-slate-200">
                  {esAdministrador ? ["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => <option key={g} value={g}>{g}</option>) : <option value={grado}>{grado}</option>}
                </select>
                <select value={area} onChange={(e) => setArea(e.target.value)} disabled={!esAdministrador} className="bg-green-50 text-green-700 border border-green-200 text-[9px] md:text-[10px] font-bold px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl outline-none">
                  {esAdministrador ? Object.keys(CONFIG_AREAS).map(a => <option key={a} value={a}>{a}</option>) : <option value={area}>{area}</option>}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex bg-gray-100 p-1 md:p-1.5 rounded-xl md:rounded-[1.25rem] border border-slate-200">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setBimestre(n)} className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black transition-all ${bimestre === n ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {n}° BIM
                </button>
              ))}
            </div>
            
            <button onClick={exportarExcel} className="bg-green-500 hover:bg-green-600 text-white px-4 md:px-6 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-sm transition-all active:scale-95">
              <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> EXCEL
            </button>

            {tienePermisoEscritura && !esEstudiante && (
              <button onClick={() => setShowConfirm(true)} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white px-4 md:px-8 py-2 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black flex items-center gap-2 shadow-xl transition-all active:scale-95">
                {loading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />}
                GUARDAR
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-2 md:p-6 flex-1 overflow-hidden">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl md:rounded-[1.5rem] overflow-hidden flex flex-col h-full">
          <div className="overflow-auto relative h-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-green-600 text-white text-[8px] md:text-[9px] uppercase">
                  <th rowSpan="2" className="p-1 md:p-2 w-7 md:w-10 sticky left-0 bg-green-600 z-[55] border-r border-b border-green-400">N°</th>
                  <th rowSpan="2" className="p-4 w-[160px] md:w-[450px] sticky left-6 md:left-10 bg-green-600 z-[55] border-r-2 border-b border-green-400 text-center">APELLIDOS Y NOMBRES</th>
                  {competencias.map((c, i) => (
                    <th key={i} colSpan="5" className="p-1 border-r border-b border-green-500 bg-green-700/30 text-center text-[7px] md:text-[7px] min-w-[140px] md:min-w-[150px]">{c}</th>
                  ))}
                  <th rowSpan="2" className="p-0 w-10 md:w-12 bg-yellow-400 text-gray-700 sticky right-0 z-[55] font-black text-center border-l border-b border-yellow-500 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">LOGRO</th>
                </tr>
                <tr className="bg-green-700 text-white text-[8px] md:text-[8px] text-center">
                  {competencias.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="w-7 md:w-8 border-r border-green-600/50 py-1">D1</th>
                      <th className="w-7 md:w-8 border-r border-green-600/50 py-1">D2</th>
                      <th className="w-7 md:w-8 border-r border-green-600/50 py-1">D3</th>
                      <th className="w-7 md:w-8 border-r border-green-600/50 py-1">D4</th>
                      <th className="w-8 md:w-9 bg-green-500 font-bold border-r border-green-600">PROM</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[8px] md:text-[10px]">
                {alumnos
                  .map((nombre, stIdx) => ({ nombre, stIdx }))
                  .filter(({ nombre }) => {
                    if (esAdministrador || esDocente) return true;
                    if (esEstudiante) return normalizarTexto(nombre) === normalizarTexto(userProfile?.nombre_completo);
                    return false;
                  })
                  .map(({ nombre, stIdx }) => {
                    const alumnoId = nombre || `vacio-${stIdx}`;
                    return (
                      <tr key={stIdx} className="border-b border-slate-200 hover:bg-green-50/50 h-8 md:h-9 transition-colors">
                        {/* MEJORA 1: z-20 y bg-green-100 para que las notas pasen por detrás */}
                        <td className="text-center sticky left-0 bg-green-100 font-bold z-20 border-r border-slate-300 text-slate-600">{stIdx + 1}</td>
                        
                        {/* MEJORA 2: z-20 y bg-white sólido */}
                        <td className="p-0 sticky left-7 md:left-10 bg-white z-20 border-r-2 border-slate-300">
                          <input
                            type="text" 
                            value={nombre || ""}
                            disabled={!tienePermisoEscritura || esEstudiante}
                            onChange={(e) => {
                              const next = [...alumnos];
                              next[stIdx] = e.target.value.toUpperCase();
                              setAlumnos(next);
                            }}
                            /* MEJORA 3: Eliminado 'overflow-ellipsis' para que el texto sea siempre legible */
                            className="w-full h-full px-2 outline-none font-bold text-slate-700 text-[8px] md:text-[10px] bg-transparent whitespace-nowrap"
                            placeholder=""
                          />
                        </td>
                        {competencias.map((_, cIdx) => {
                          const prom = calcularPromedio(alumnoId, cIdx);
                          return (
                            <React.Fragment key={cIdx}>
                              {[1, 2, 3, 4].map(dIdx => {
                                const notaVal = notas[`${alumnoId}-${cIdx}-${dIdx}`];
                                return (
                                  <td key={dIdx} className="p-0 border-r border-slate-300 relative">
                                    <select 
                                      value={notaVal || ""}
                                      disabled={!tienePermisoEscritura || esEstudiante}
                                      onChange={(e) => setNotas({ ...notas, [`${alumnoId}-${cIdx}-${dIdx}`]: e.target.value })}
                                      /* Las notas mantienen z-10 (implícito) para quedar por debajo de los sticky z-20 */
                                      className={`w-full h-8 md:h-9 text-center font-bold appearance-none outline-none text-[8px] md:text-[9px] bg-green-50/50 cursor-pointer relative ${getColorNota(notaVal)}`}
                                    >
                                      <option value="">-</option>
                                      <option value="AD">AD</option>
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                      <option value="C">C</option>
                                    </select>
                                  </td>
                                );
                              })}
                              <td className={`text-center font-black bg-white border-r border-slate-200 w-8 md:w-9 ${getColorNota(prom)}`}>
                                {prom}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* MEJORA 4: z-20 y bg sólido para que el Logro no sea tapado por las notas móviles */}
                        <td className={`text-center font-black bg-yellow-200 w-10 md:w-12 sticky right-0 z-20 border-l border-yellow-300 ${getColorNota(calcularLogroBimestral(alumnoId))}`}>
                          {calcularLogroBimestral(alumnoId)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroCompetencias;