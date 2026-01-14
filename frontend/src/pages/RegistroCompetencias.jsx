import React, { useState, useCallback, useEffect } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, AlertCircle, Download } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import * as XLSX from 'xlsx';

const RegistroCompetencias = () => {
  // 1. ESTADOS DE CONTROL (Forzado estrictamente a 35 filas)
  const [grado, setGrado] = useState("1° A");
  const [area, setArea] = useState("MATEMÁTICA");
  const [bimestre, setBimestre] = useState(1);
  const [alumnos, setAlumnos] = useState(Array(35).fill(""));
  const [notas, setNotas] = useState({});
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);

  // 2. CONFIGURACIÓN DE ÁREAS
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

  // 3. FUNCIÓN DE CARGA REUTILIZABLE (Asegura rellenar hasta 35 si faltan datos)
  const fetchDatos = useCallback(async () => {
    setLoading(true);
    const key = `reg_2026_${grado}_${area}_B${bimestre}`.replace(/\s+/g, '_');
    
    try {
      const { data, error } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('id', key)
        .maybeSingle(); 

      if (error) throw error;

      if (data) {
        const listaCargada = data.alumnos || [];
        // Rellenamos con strings vacíos hasta completar 35 filas exactas
        const lista35 = [...listaCargada, ...Array(35).fill("")].slice(0, 35);
        setAlumnos(lista35);
        setNotas(data.notas || {});
      } else {
        setAlumnos(Array(35).fill(""));
        setNotas({});
      }
    } catch (err) { 
      console.error("Error de conexión:", err.message);
    } finally { 
      setLoading(false); 
    }
  }, [grado, area, bimestre]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // 4. LÓGICA DE CALIFICACIÓN
  const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
  const revertirEscala = (num) => {
    const v = Math.round(num); 
    if (v >= 4) return "AD";
    if (v === 3) return "A";
    if (v === 2) return "B";
    if (v === 1) return "C";
    return "-";
  };

  const calcularPromedio = useCallback((estIdx, compIdx) => {
    let suma = 0, cont = 0;
    [1, 2, 3, 4].forEach(d => {
      const n = notas[`${estIdx}-${compIdx}-${d}`];
      if (n && escala[n] > 0) { suma += escala[n]; cont++; }
    });
    return cont > 0 ? revertirEscala(suma / cont) : "-";
  }, [notas]);

  const calcularLogroBimestral = useCallback((estIdx) => {
    let sumaLetras = 0, contComp = 0;
    competencias.forEach((_, cIdx) => {
      const letraProm = calcularPromedio(estIdx, cIdx);
      if (letraProm !== "-") { 
        sumaLetras += escala[letraProm]; 
        contComp++; 
      }
    });
    return contComp > 0 ? revertirEscala(sumaLetras / contComp) : "-";
  }, [competencias, calcularPromedio]);

  // 5. FUNCIÓN DE EXPORTACIÓN A EXCEL (Incluye las 35 filas)
  const exportarExcel = () => {
    const dataExcel = alumnos.map((nombre, stIdx) => {
      const fila = {
        "N°": stIdx + 1,
        "ESTUDIANTE": nombre || ""
      };
      competencias.forEach((comp, cIdx) => {
        [1, 2, 3, 4].forEach(dIdx => {
          fila[`${comp.substring(0, 15)}... D${dIdx}`] = notas[`${stIdx}-${cIdx}-${dIdx}`] || "";
        });
        fila[`PROM ${cIdx + 1}`] = calcularPromedio(stIdx, cIdx);
      });
      fila["LOGRO FINAL"] = calcularLogroBimestral(stIdx);
      return fila;
    });

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    XLSX.writeFile(wb, `Registro_${grado}_${area}_B${bimestre}.xlsx`);
  };

  // 6. GUARDADO
  const handleGuardarTodo = async () => {
    setLoading(true);
    const key = `reg_2026_${grado}_${area}_B${bimestre}`.replace(/\s+/g, '_');
    const payload = {
      id: key, grado, area, bimestre: parseInt(bimestre),
      alumnos, notas, updated_at: new Date().toISOString()
    };
    try {
      const { error } = await supabase.from('calificaciones').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setMensaje({ texto: "¡Sincronizado con éxito!", tipo: "success" });
    } catch (error) {
      setMensaje({ texto: "Error al guardar", tipo: "error" });
    } finally {
      setLoading(false);
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {mensaje && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-8 py-4 rounded-2xl shadow-2xl text-white animate-in slide-in-from-right duration-300 ${mensaje.tipo === 'success' ? 'bg-slate-900' : 'bg-red-600'}`}>
          {mensaje.tipo === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-white" />}
          <span className="text-[10px] font-black tracking-widest uppercase">{mensaje.texto}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b rounded-b-[2.5rem] p-6 relative shadow-sm z-40">
        <div className="max-w-full mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-green-600 p-4 rounded-3xl text-white shadow-lg">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Registro 2026</h1>
              <div className="flex items-center gap-2">
                <select value={grado} onChange={(e) => setGrado(e.target.value)} className="bg-slate-100 border border-slate-200 text-[10px] font-bold px-4 py-2 rounded-xl outline-none">
                  {["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold px-4 py-2 rounded-xl outline-none">
                  {Object.keys(CONFIG_AREAS).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-100 p-1.5 rounded-[1.25rem] border border-slate-200">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setBimestre(n)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black transition-all ${bimestre === n ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400'}`}>
                  {n}° BIM
                </button>
              ))}
            </div>
            <button onClick={exportarExcel} className="bg-green-500 border border-slate-200 text-white px-6 py-3.5 rounded-2xl text-[11px] font-black flex items-center gap-2 hover:bg-slate-400 transition-all shadow-sm">
              <Download className="w-4 h-4 text-white" /> EXCEL
            </button>
            <button onClick={handleGuardarTodo} disabled={loading} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black flex items-center gap-2 hover:bg-black transition-all shadow-xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-400" />}
              {loading ? "GUARDANDO..." : "GUARDAR TODO"}
            </button>
          </div>
        </div>
      </div>

      {/* TABLA OPTIMIZADA PARA 35 FILAS */}
      <div className="p-4 md:p-6 flex-1 overflow-hidden">
        <div className="bg-white border shadow-2xl rounded-[1.5rem] overflow-hidden flex flex-col h-full">
          <div className="overflow-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-30">
                <tr className="bg-green-600 text-white text-[9px] uppercase tracking-widest">
                  <th className="p-2 w-10 sticky left-0 bg-green-600 z-50 border-r border-white/20">N°</th>
                  <th className="p-2 w-67 md:w-80 text-left sticky left-12 bg-green-600 z-50 border-r border-white italic">ESTUDIANTES</th>
                  {competencias.map((c, i) => (
                    <th key={i} colSpan="5" className="p-2 border-r border-white/10 bg-green-700/40 text-center min-w-[200px] text-[8px] leading-tight px-4">{c}</th>
                  ))}
                  <th className="p-1 w-12 bg-yellow-400 text-black sticky right-0 z-40 font-black text-center border-l border-yellow-500">LOGRO</th>
                </tr>
                <tr className="bg-green-500 text-white text-[8px] font-bold">
                  <th className="sticky left-0 bg-green-500"></th>
                  <th className="sticky left-12 bg-green-500"></th>
                  {competencias.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="w-7 border-r border-white/5">D1</th>
                      <th className="w-7 border-r border-white/5">D2</th>
                      <th className="w-7 border-r border-white/5">D3</th>
                      <th className="w-7 border-r border-white/5">D4</th>
                      <th className="w-8 bg-green-800/20 border-r border-white italic text-[10px]">PROM</th>
                    </React.Fragment>
                  ))}
                  <th className="sticky right-0 bg-yellow-500"></th>
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {alumnos.map((nombre, stIdx) => (
                  <tr key={stIdx} className="border-b hover:bg-green-50 transition-colors group">
                    <td className="p-3 text-center text-slate-400 border-r sticky left-0 bg-white group-hover:bg-green-50 font-bold z-10">{stIdx + 1}</td>
                    <td className="p-0 border-r sticky left-12 bg-white group-hover:bg-green-50 z-10">
                      <input 
                        type="text" 
                        value={nombre || ""}
                        onChange={(e) => {
                          const next = [...alumnos];
                          next[stIdx] = e.target.value.toUpperCase();
                          setAlumnos(next);
                        }}
                        className="w-full h-11 px-4 outline-none bg-transparent font-bold text-slate-700 uppercase placeholder:text-slate-200"
                        placeholder="..."
                      />
                    </td>
                    {competencias.map((_, cIdx) => (
                      <React.Fragment key={cIdx}>
                        {[1, 2, 3, 4].map(dIdx => (
                          <td key={dIdx} className="p-0 border-r w-10">
                            <select 
                              value={notas[`${stIdx}-${cIdx}-${dIdx}`] || ""}
                              onChange={(e) => setNotas({...notas, [`${stIdx}-${cIdx}-${dIdx}`]: e.target.value})}
                              className={`w-full h-11 text-center bg-transparent appearance-none outline-none cursor-pointer ${
                                notas[`${stIdx}-${cIdx}-${dIdx}`] === 'C' ? 'text-red-500' : 
                                notas[`${stIdx}-${cIdx}-${dIdx}`] === 'AD' ? 'text-blue-600' : 'text-slate-600'
                              }`}
                            >
                              <option value="">-</option>
                              <option value="AD">AD</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>
                            </select>
                          </td>
                        ))}
                        <td className="p-3 text-center bg-green-100/50 font-black text-green-700 border-r italic">
                          {calcularPromedio(stIdx, cIdx)}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-3 text-center bg-yellow-300/50 text-yellow-800 font-black sticky right-0 z-10 border-l border-yellow-200">
                      {calcularLogroBimestral(stIdx)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroCompetencias;