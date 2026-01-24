import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import * as XLSX from 'xlsx';

const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
const inversa = { 4: "AD", 3: "A", 2: "B", 1: "C", 0: "-" };
const normalizarID = (t) => t ? String(t).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const RegistroCompetencias = ({ userProfile }) => {
  const [grado, setGrado] = useState("1° A");
  const [area, setArea] = useState("MATEMÁTICA");
  const [bimestre, setBimestre] = useState(1);
  const [alumnos, setAlumnos] = useState([]); 
  const [notas, setNotas] = useState({});
  const [generos, setGeneros] = useState({}); // Nuevo: Estado para Género
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [conclusiones, setConclusiones] = useState({});

  const cargarDatos = useCallback(async () => {
    if (!grado || !area || !bimestre) return;
    setLoading(true);
    setNotas({}); 
    
    try {
      const [numGrado, letraSeccion] = grado.split(" ");
      const { data, error } = await supabase
        .from('calificaciones')
        .select('*')
        .eq('grado', numGrado)
        .eq('seccion', letraSeccion || "A")
        .eq('area', area)
        .eq('bimestre', parseInt(bimestre))
        .order('nombre_estudiante', { ascending: true });

      if (error) throw error;

      if (data) {
        if (data.length === 0) {
          setAlumnos(Array(35).fill(""));
          setGeneros({});
          return;
        }

        const nombresDeBD = data.map(reg => String(reg.nombre_estudiante || "").trim());
        const listaCompleta = [...nombresDeBD];
        while (listaCompleta.length < 35) listaCompleta.push("");
        setAlumnos(listaCompleta);

        const nuevasNotas = {};
        const nuevosGeneros = {};
        data.forEach((reg) => {
          const idEst = normalizarID(String(reg.nombre_estudiante || ""));
          nuevosGeneros[idEst] = reg.genero || ""; 
          for (let c = 1; c <= 4; c++) {
            for (let d = 1; d <= 4; d++) {
              const valor = reg[`c${c}_d${d}`];
              if (valor !== null && valor !== "") {
                nuevasNotas[`${idEst}-${c-1}-${d}`] = valor;
              }
            }
          }
        });
        setNotas(nuevasNotas);
        setGeneros(nuevosGeneros);
      }
    } catch (err) {
      console.error("Error crítico:", err.message);
    } finally {
      setLoading(false);
    }
  }, [grado, area, bimestre]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const CONFIG_AREAS = {
    "MATEMÁTICA": ["RESUELVE PROBLEMAS DE CANTIDAD", "RESUELVE PROBLEMAS DE REGULARIDAD", "FORMA Y MOVIMIENTO", "GESTIÓN DE DATOS"],
    "COMUNICACIÓN": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"],
    "CIENCIA Y TECNOLOGÍA": ["INDAGA MEDIANTE MÉTODOS", "EXPLICA EL MUNDO FÍSICO", "DISEÑA SOLUCIONES"],
    "PERSONAL SOCIAL": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA", "CONSTRUYE INTERPRETACIONES HISTÓRICAS", "GESTIONA EL ESPACIO", "GESTIONA RECURSOS ECONÓMICOS"],
    "DPCC": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA DEMOCRÁTICAMENTE"],
    "ARTE Y CULTURA": ["APRECIA MANIFESTACIONES", "CREA PROYECTOS DESDE LENGUAJES"],
    "EDUCACION FÍSICA": ["SE DESENVUELVE DE MANERA AUTÓNOMA", "ASUME UNA VIDA SALUDABLE", "INTERACTÚA A TRAVÉS DE HABILIDADES"],
    "EPT": ["GESTIONA PROYECTOS DE EMPRENDIMIENTO ECONÓMICO O SOCIAL"],
    "RELIGIÓN": ["CONSTRUYE SU IDENTIDAD COMO PERSONA DIGNA", "ASUME LA EXPERIENCIA DEL ENCUENTRO"],
    "INGLÉS": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"]
  };

  const competencias = CONFIG_AREAS[area] || [];
  const tienePermisoEscritura = true; // Simplificado para el ejemplo

  const alumnosOrdenados = useMemo(() => {
    return [...alumnos].map((nombre, originalIdx) => ({ nombre, originalIdx }))
      .sort((a, b) => {
        if (!a.nombre?.trim()) return 1;
        if (!b.nombre?.trim()) return -1;
        return a.nombre.trim().localeCompare(b.nombre.trim(), 'es', { sensitivity: 'base', numeric: true });
      });
  }, [alumnos]);

  const calcularPromedio = (nombre, compIdx) => {
    const idEst = normalizarID(nombre);
    if (!idEst) return "-";
    let suma = 0, cont = 0;
    for (let d = 1; d <= 4; d++) {
      const valor = escala[notas[`${idEst}-${compIdx}-${d}`]];
      if (valor > 0) { suma += valor; cont++; }
    }
    return cont === 0 ? "-" : inversa[Math.round(suma / cont)] || "-";
  };

  const calcularLogroBimestral = (nombre) => {
    const idEst = normalizarID(nombre);
    if (!idEst) return "-";
    let sumaLetras = 0, contComp = 0;
    competencias.forEach((_, cIdx) => {
      const letraProm = calcularPromedio(nombre, cIdx);
      if (letraProm !== "-") { sumaLetras += escala[letraProm]; contComp++; }
    });
    return contComp === 0 ? "-" : inversa[Math.round(sumaLetras / contComp)] || "-";
  };

  // Restaurado: Función Excel
  const exportarExcel = () => {
    const data = alumnosOrdenados.filter(a => a.nombre).map(({ nombre }, idx) => {
      const idEst = normalizarID(nombre);
      return {
        "N°": idx + 1,
        "GEN": generos[idEst] || "",
        "ESTUDIANTE": nombre.toUpperCase(),
        "LOGRO BIMESTRAL": calcularLogroBimestral(nombre)
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    XLSX.writeFile(wb, `Registro_${grado}_${area}_Bim${bimestre}.xlsx`);
  };

  const handleGuardarTodo = async () => {
    setLoading(true);
    try {
      const [numGrado, letraSeccion] = grado.split(" ");
      const filasParaGuardar = alumnos
        .filter(nombre => nombre && nombre.trim() !== "")
        .map(nombre => {
          const idEst = normalizarID(nombre);
          const reg = {
            nombre_estudiante: nombre.trim().toUpperCase(),
            grado: numGrado,
            seccion: letraSeccion || "A",
            area: area,
            bimestre: parseInt(bimestre),
            genero: generos[idEst] || "",
            logro_bimestral: calcularLogroBimestral(nombre)
          };
          for (let c = 0; c < 4; c++) {
            for (let d = 1; d <= 4; d++) {
              const val = notas[`${idEst}-${c}-${d}`];
              if (val) reg[`c${c+1}_d${d}`] = val;
            }
          }
          return reg;
        });

      await supabase.from('calificaciones').upsert(filasParaGuardar, { onConflict: 'nombre_estudiante,grado,seccion,area,bimestre' });
      setMensaje({ texto: "¡DATOS GUARDADOS!" });
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); setShowConfirm(false); }
  };

  const getColorNota = (nota) => {
    if (nota === 'C') return 'text-red-600';
    if (nota === 'B') return 'text-blue-600';
    if (nota === 'AD') return 'text-green-600';
    return 'text-slate-700';
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* NOTIFICACIÓN */}
      {mensaje && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">{mensaje.texto}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b rounded-b-[2.5rem] p-6 shadow-sm z-40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-green-600 p-4 rounded-3xl text-white shadow-lg"><FileSpreadsheet className="w-7 h-7" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Registro 2026</h1>
              <div className="flex gap-2 mt-1">
                <select value={grado} onChange={(e) => setGrado(e.target.value)} className="bg-slate-100 border text-[10px] font-bold px-4 py-1.5 rounded-xl outline-none">
                  {["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-4 py-1.5 rounded-xl outline-none">
                  {Object.keys(CONFIG_AREAS).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-gray-200/70 p-1.5 rounded-[1.25rem]">
              {[1, 2, 3, 4].map(n => (
                <button key={n} onClick={() => setBimestre(n)} className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${bimestre === n ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{n}° BIM</button>
              ))}
            </div>
            {/* Restaurado: Botón Excel */}
            <button onClick={exportarExcel} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" /> EXCEL
            </button>
            <button onClick={() => setShowConfirm(true)} disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl text-[10px] font-black flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-400" />} GUARDAR
            </button>
          </div>
        </div>
      </div>

      {/* TABLA: SOLUCIÓN AL DESPLAZAMIENTO */}
      <div className="p-6 flex-1">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden">
          {/* Contenedor con scroll horizontal SOLAMENTE */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-green-600 text-white text-[9px] uppercase">
                  {/* Celdas STICKY: Se quedan quietas horizontalmente pero se mueven verticalmente con la página */}
                  <th rowSpan="2" className="p-2.5 w-12 sticky left-0 z-30 bg-green-600 border-r border-b border-green-400">N°</th>
                  <th rowSpan="2" className="p-2.5 w-12 sticky left-5 z-30 bg-green-600 border-r border-b border-green-400">GEN</th>
                  <th rowSpan="2" className="p-4 w-64 sticky left-10 z-30 bg-green-600 border-r-2 border-b border-green-400 text-center">APELLIDOS Y NOMBRES</th>
                  
                  {competencias.map((c, i) => (
                    <th key={i} colSpan="5" className="p-2 border-r border-b border-green-500 bg-green-700/30 text-center min-w-[140px]">{c}</th>
                  ))}
                  
                  <th rowSpan="2" className="p-0.5 w-12 sticky right-0 z-30 bg-yellow-400 text-slate-800 font-black border-l border-b border-yellow-500">LOGRO</th>
                </tr>
                <tr className="bg-green-700 text-white text-[8px] text-center uppercase">
                  {competencias.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="w-8 border-r border-green-600/50 py-1">D1</th>
                      <th className="w-8 border-r border-green-600/50 py-1">D2</th>
                      <th className="w-8 border-r border-green-600/50 py-1">D3</th>
                      <th className="w-8 border-r border-green-600/50 py-1">D4</th>
                      <th className="w-8 bg-green-500 font-bold border-r border-green-600">PROM</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[10px]">
                {alumnosOrdenados.map(({ nombre, originalIdx }, displayIdx) => {
                  const idUnico = normalizarID(nombre);
                  return (
                    <tr key={originalIdx} className="border-b border-slate-200 hover:bg-green-50/50 h-10">
                      <td className="text-center sticky left-0 z-20 bg-green-200 font-bold border-r border-slate-300 text-gray-600">{displayIdx + 1}</td>
                      <td className="p-0 sticky left-7 z-20 bg-white border-r border-slate-300">
                        <select 
                          value={generos[idUnico] || ""}
                          onChange={(e) => setGeneros(prev => ({ ...prev, [idUnico]: e.target.value }))}
                          className="w-full h-10 text-center font-bold outline-none bg-gray-200 appearance-none text-blue-700"
                        >
                          <option value="">-</option><option value="M">M</option><option value="H">H</option>
                        </select>
                      </td>
                      <td className="p-0 sticky left-10 z-20 bg-white border-r-2 border-slate-300">
                        <input
                          type="text" 
                          value={nombre || ""}
                          onChange={(e) => {
                            const next = [...alumnos];
                            next[originalIdx] = e.target.value;
                            setAlumnos(next);
                          }}
                          className="w-full h-8 px-2 outline-none font-bold text-slate-700 uppercase bg-transparent"
                          placeholder="Nombre..."
                        />
                      </td>
                      {competencias.map((_, cIdx) => (
                        <React.Fragment key={cIdx}>
                          {[1, 2, 3, 4].map(dIdx => (
                            <td key={dIdx} className="p-0 border-r border-slate-200">
                              <select 
                                value={notas[`${idUnico}-${cIdx}-${dIdx}`] || ""}
                                onChange={(e) => setNotas(prev => ({ ...prev, [`${idUnico}-${cIdx}-${dIdx}`]: e.target.value }))}
                                className={`w-full h-10 text-center font-bold outline-none appearance-none bg-green-50/50 ${getColorNota(notas[`${idUnico}-${cIdx}-${dIdx}`])}`}
                              >
                                <option value="">-</option><option value="AD">AD</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>
                              </select>
                            </td>
                          ))}
                          <td className={`text-center font-black bg-green-100 border-r border-slate-200 ${getColorNota(calcularPromedio(nombre, cIdx))}`}>
                            {calcularPromedio(nombre, cIdx)}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className={`text-center font-black bg-yellow-200 sticky right-0 z-20 border-l border-yellow-200 ${getColorNota(calcularLogroBimestral(nombre))}`}>
                        {calcularLogroBimestral(nombre)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-800 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black text-slate-800">¿Guardar registro?</h3>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl text-xs uppercase">Cancelar</button>
              <button onClick={handleGuardarTodo} className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl text-xs uppercase">Sí, Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroCompetencias;