import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import * as XLSX from 'xlsx';

const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
const inversa = { 4: "AD", 3: "A", 2: "B", 1: "C", 0: "-" };
const normalizarID = (t) => t ? t.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const RegistroCompetencias = ({ userProfile }) => {
  const [grado, setGrado] = useState("1° A");
  const [area, setArea] = useState("MATEMÁTICA");
  const [bimestre, setBimestre] = useState(1);
  // Cambiamos el estado inicial a vacío para manejarlo dinámicamente
  const [alumnos, setAlumnos] = useState([]); 
  const [notas, setNotas] = useState({});
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
      // ✅ Si la DB no tiene datos, mostramos 35 filas vacías sin crashear
      if (data.length === 0) {
        setAlumnos(Array(35).fill(""));
        return;
      }

      // ✅ PARCHE CRÍTICO: Aseguramos que el nombre sea siempre un String
      // Esto elimina el error de la imagen image_f31ee5.png definitivamente.
      const nombresDeBD = data.map(reg => String(reg.nombre_estudiante || "").trim());
  
      const listaCompleta = [...nombresDeBD];
      while (listaCompleta.length < 35) listaCompleta.push("");
      
      setAlumnos(listaCompleta);

      const nuevasNotas = {};
      data.forEach((reg) => {
        // Usamos String() para evitar errores en normalizarID
        const idEst = normalizarID(String(reg.nombre_estudiante || ""));
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
    }
  } catch (err) {
    console.error("Error crítico en carga:", err.message);
  } finally {
    setLoading(false);
  }
  }, [grado, area, bimestre, normalizarID]);


  useEffect(() => {
  cargarDatos();
  }, [bimestre, grado, area, cargarDatos]);


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
  const MI_CORREO_ADMIN = 'dvasquezespinoza1@gmail.com';
  const esAdministrador = !userProfile || userProfile.correo_electronico === MI_CORREO_ADMIN || userProfile.rol_id === 1;
  const tienePermisoEscritura = esAdministrador || userProfile?.rol_id === 3;

  const exportarExcel = () => {
    const data = alumnosOrdenados.filter(a => a.nombre).map(({ nombre }, idx) => ({
      "N°": idx + 1,
      "ESTUDIANTE": nombre.toUpperCase(),
      "LOGRO BIMESTRAL": calcularLogroBimestral(nombre),
      "CONCLUSION": conclusiones[normalizarID(nombre)] || ""
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calificaciones");
    XLSX.writeFile(wb, `Registro_${grado}_${area}_Bim${bimestre}.xlsx`);
  };

  const alumnosOrdenados = useMemo(() => {
  return [...alumnos]
    .map((nombre, originalIdx) => ({ nombre, originalIdx }))
    .sort((a, b) => {
      // 1. Mandar filas vacías al final
      if (!a.nombre?.trim()) return 1;
      if (!b.nombre?.trim()) return -1;
      
      // 2. Comparación alfabética robusta
      return a.nombre.trim().localeCompare(b.nombre.trim(), 'es', { 
        sensitivity: 'base',
        numeric: true // Por si hay números en los nombres
      });
    });
   }, [alumnos]);

  const calcularPromedio = (nombre, compIdx) => {
  const idEst = normalizarID(nombre);
  if (!idEst) return "-";
  
  let suma = 0;
  let cont = 0;

  // Los bucles for son significativamente más rápidos que forEach en JS
  for (let d = 1; d <= 4; d++) {
    const n = notas[`${idEst}-${compIdx}-${d}`];
    // Acceso directo al objeto escala
    const valor = escala[n];
    if (valor > 0) {
      suma += valor;
      cont++;
    }
  }
  
  if (cont === 0) return "-";
  const promedioRedondeado = Math.round(suma / cont);
  return inversa[promedioRedondeado] || "-";
};

const calcularLogroBimestral = (nombre) => {
  const idEst = normalizarID(nombre);
  if (!idEst) return "-";

  let sumaLetras = 0;
  let contComp = 0;
  
  // Cacheamos la longitud para evitar consultar competencias.length en cada vuelta
  const numCompetencias = competencias.length;

  for (let cIdx = 0; cIdx < numCompetencias; cIdx++) {
    const letraProm = calcularPromedio(nombre, cIdx);
    if (letraProm !== "-") {
      sumaLetras += escala[letraProm];
      contComp++;
    }
  }

  if (contComp === 0) return "-";
  const promedioFinal = Math.round(sumaLetras / contComp);
  return inversa[promedioFinal] || "-";
  };

 const handleGuardarTodo = async () => {
  // 1. Prioridad visual: Cerramos modal y activamos carga inmediatamente
  setShowConfirm(false); 
  setLoading(true);
  setMensaje(null);

  // 2. Usamos setTimeout para "liberar" el hilo y que el spinner aparezca YA
  setTimeout(async () => {
    try {
      const [numGrado, letraSeccion] = grado.split(" ");
      
      // Optimizamos el mapeo: Procesar datos pesados
      const filasParaGuardar = alumnos
        .filter(nombre => nombre && nombre.trim() !== "")
        .map(nombre => {
          const idEst = normalizarID(nombre);
          const nombreTrim = nombre.trim().toUpperCase();

          // Construcción del objeto base
          const registro = {
            nombre_estudiante: nombreTrim,
            grado: numGrado,
            seccion: letraSeccion || "A",
            area: area,
            bimestre: parseInt(bimestre),
            promedio_c1: calcularPromedio(nombre, 0),
            promedio_c2: calcularPromedio(nombre, 1),
            promedio_c3: calcularPromedio(nombre, 2),
            promedio_c4: calcularPromedio(nombre, 3),
            logro_bimestral: calcularLogroBimestral(nombre),
            conclusion_descriptiva: conclusiones[idEst] || ""
          };

          // Mapeo de notas optimizado
          for (let c = 0; c < 4; c++) {
            for (let d = 1; d <= 4; d++) {
              const valorNota = notas[`${idEst}-${c}-${d}`];
              if (valorNota !== undefined) {
                registro[`c${c+1}_d${d}`] = valorNota;
              }
            }
          }
          return registro;
        });

      if (filasParaGuardar.length === 0) {
        setLoading(false);
        return;
      }

      // 3. Ejecutar Upsert
      const { error } = await supabase
        .from('calificaciones')
        .upsert(filasParaGuardar, { 
          onConflict: 'nombre_estudiante,grado,seccion,area,bimestre' 
        });

      if (error) throw error;

      setMensaje({ texto: "¡DATOS GUARDADOS!" });
      setTimeout(() => setMensaje(null), 3000);

    } catch (err) {
      console.error("Error al guardar:", err.message);
      alert("No se pudo guardar: " + err.message);
    } finally {
      setLoading(false);
    }
    }, 50); // 50ms son suficientes para que la UI reaccione
   };

  const getColorNota = (nota) => {
    if (nota === 'C') return 'text-red-600';
    if (nota === 'B') return 'text-blue-600';
    if (nota === 'AD') return 'text-green-600';
    return 'text-slate-700';
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ... (Modales y Notificaciones iguales) */}
      {mensaje && (
        <div className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">{mensaje.texto}</span>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-800 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black mb-2 text-slate-800">¿Guardar confirmar?</h3>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-green-600 text-white font-black rounded-2xl text-xs uppercase">Cancelar</button>
              <button onClick={() => {setShowConfirm(false); setTimeout(() => {handleGuardarTodo();}, 50); }} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 active:scale-95 transition-transform text-white font-black rounded-2xl text-xs uppercase">Sí, Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER CONTROLS */}
     <div className="bg-white border-b rounded-b-[2.5rem] p-4 md:p-6 shadow-sm z-40">
     <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
    
      {/* SECCIÓN IZQUIERDA: TÍTULO Y SELECTORES */}
       <div className="flex items-center gap-4 md:gap-6">
        <div className="bg-green-600 p-3 md:p-4 rounded-2xl md:rounded-3xl text-white shadow-lg shrink-0">
        <FileSpreadsheet className="w-6 h-6 md:w-7 md:h-7" />
         </div>
         <div className="flex flex-col gap-1 md:gap-2">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter">Registro 2026</h1>
           <div className="flex flex-wrap items-center gap-2">
            <select 
             value={grado} 
             onChange={(e) => setGrado(e.target.value)} 
             disabled={!esAdministrador} 
             className="bg-slate-100 border text-[9px] md:text-[10px] font-bold px-3 py-1.5 md:px-4 md:py-2 rounded-xl outline-none"
            >
             {["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => (
               <option key={g} value={g}>{g}</option>
             ))}
            </select>
            <select 
              value={area} 
              onChange={(e) => setArea(e.target.value)} 
              disabled={!esAdministrador} 
              className="bg-green-100 text-green-700 border border-green-200 text-[9px] md:text-[10px] font-bold px-3 py-2 md:px-4 md:py-2 rounded-xl outline-none"
             >
              {Object.keys(CONFIG_AREAS).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SECCIÓN DERECHA: BOTONES DE ACCIÓN */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        {/* SELECTOR DE BIMESTRE (Scrollable en móviles muy pequeños) */}
         <div className="flex bg-gray-200/70 p-1 md:p-1.5 rounded-xl md:rounded-[1.25rem] w-fit overflow-x-auto max-w-full">
           {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBimestre(n)}
              className={`px-4 py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black transition-all whitespace-nowrap ${
               bimestre === n ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
              >
              {n}° BIM
            </button>
          ))}
        </div>

      {/* BOTONES EXCEL Y GUARDAR */}
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button 
          onClick={exportarExcel} 
          className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white px-3 py-2.5 md:px-4 md:py-2 rounded-xl text-[9px] md:text-[10px] font-black flex items-center justify-center gap-2 transition-colors"
          >
           <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
           <span className="inline">EXCEL</span>
         </button>
        
         <button 
          type="button" // Evita comportamientos de formulario por defecto
           onClick={(e) => {
            e.preventDefault();
             setShowConfirm(true);
              }} 
                disabled={loading || !tienePermisoEscritura} 
                 className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all text-white px-3 py-2 md:px-8 md:py-3.5 rounded-xl text-[9px] md:text-[10px] font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                 {loading ? (
                 <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                ) : (
                <Save className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
                )} 
               <span>GUARDAR</span>
           </button>
        </div>
       </div>
     </div>
    </div>

      {/* TABLA */}
      <div className="p-2 md:p-6 flex-1 overflow-hidden">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden flex flex-col h-full">
          <div className="overflow-auto h-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-green-600" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando registros...</p>
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-green-600 text-white text-[9px] uppercase">
                    <th rowSpan="2" className="p-2.5 w-12 sticky left-0 bg-green-600 z-[55] border-r border-b border-green-400">N°</th>
                    <th rowSpan="2" className="p-5 w-[500px] sticky left-9 bg-green-600 z-[50] border-r-2 border-b border-green-400">APELLIDOS Y NOMBRES</th>
                    {competencias.map((c, i) => (
                      <th key={i} colSpan="5" className="p-0 border-r border-b border-green-500 bg-green-700/30 text-center min-w-[155px]">{c}</th>
                    ))}
                    <th rowSpan="2" className="p-0 w-12 bg-yellow-400 text-gray-700 sticky right-0 z-[55] font-black text-center border-l border-b border-yellow-500">LOGRO</th>
                  </tr>
                  <tr className="bg-green-700 text-white text-[8px] text-center">
                    {competencias.map((_, i) => (
                      <React.Fragment key={i}>
                        <th className="w-6 border-r border-green-600/50 py-1">D1</th>
                        <th className="w-6 border-r border-green-600/50 py-1">D2</th>
                        <th className="w-6 border-r border-green-600/50 py-1">D3</th>
                        <th className="w-6 border-r border-green-600/50 py-1">D4</th>
                        <th className="w-6 bg-green-500 font-bold border-r border-green-600">PROM</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[10px]">
                  {alumnosOrdenados.map(({ nombre, originalIdx }, displayIdx) => {
                    const idUnico = normalizarID(nombre);
                    return (
                      <tr key={originalIdx} className="border-b border-slate-200 hover:bg-green-50/50 h-9">
                        <td className="text-center sticky left-0 bg-green-100 font-bold z-20 border-r border-slate-300 text-slate-600">{displayIdx + 1}</td>
                        <td className="p-0 sticky left-10 bg-white z-20 border-r-2 border-slate-300">
                          <input
                            type="text" 
                            value={nombre || ""}
                            disabled={!tienePermisoEscritura}
                            onChange={(e) => {
                              const next = [...alumnos];
                              next[originalIdx] = e.target.value;
                              setAlumnos(next);
                            }}
                            placeholder="Nombre del estudiante..."
                            className="w-full h-full px-2 outline-none font-bold text-slate-700 bg-transparent"
                          />
                        </td>
                        {competencias.map((_, cIdx) => (
                          <React.Fragment key={cIdx}>
                            {[1, 2, 3, 4].map(dIdx => (
                              <td key={dIdx} className="p-0 border-r border-slate-300">
                                <select 
                                  value={notas[`${idUnico}-${cIdx}-${dIdx}`] || ""}
                                  disabled={!tienePermisoEscritura || !nombre}
                                  onChange={(e) => setNotas(prev => ({ ...prev, [`${idUnico}-${cIdx}-${dIdx}`]: e.target.value }))}
                                  className={`w-full h-9 text-center font-bold appearance-none outline-none bg-green-50/50 ${getColorNota(notas[`${idUnico}-${cIdx}-${dIdx}`])}`}
                                >
                                  <option value="">-</option>
                                  <option value="AD">AD</option><option value="A">A</option>
                                  <option value="B">B</option><option value="C">C</option>
                                </select>
                              </td>
                            ))}
                            <td className={`text-center font-black bg-green-100 border-r border-slate-200 w-6 ${getColorNota(calcularPromedio(nombre, cIdx))}`}>
                              {calcularPromedio(nombre, cIdx)}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className={`text-center font-black bg-yellow-200 w-12 sticky right-0 z-20 border-l border-yellow-300 ${getColorNota(calcularLogroBimestral(nombre))}`}>
                          {calcularLogroBimestral(nombre)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroCompetencias;