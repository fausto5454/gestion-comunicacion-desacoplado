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

  // --- MEJORA DE CONECTIVIDAD (Generación de Key segura) ---
  const generarKey = useCallback(() => {
    // Normaliza el texto para quitar tildes y caracteres que puedan romper la URL de la base de datos
    const areaSegura = area.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return `reg_2026_${grado}_${areaSegura}_B${bimestre}`.replace(/\s+/g, '_').replace(/°/g, '');
  }, [grado, area, bimestre]);

  // 3. FUNCIÓN DE CARGA REUTILIZABLE
  const fetchDatos = useCallback(async () => {
    setLoading(true);
    const key = generarKey();
    
    try {
      // Ejemplo de cómo asegurar el orden ascendente al consultar
  const { data, error } = await supabase
      .from('calificaciones')
      .select('alumnos, notas')
      .eq('id', key)
      .order('id', { ascending: true }) // Asegura el orden ascendente por ID
      .maybeSingle();

      if (error) throw error;

      if (data) {
        const listaCargada = data.alumnos || [];
        const lista35 = [...listaCargada, ...Array(35).fill("")].slice(0, 35);
        setAlumnos(lista35);
        setNotas(data.notas || {});
      } else {
        setAlumnos(Array(35).fill(""));
        setNotas({});
      }
    } catch (err) { 
      console.error("Error de conexión:", err.message);
      setMensaje({ texto: "Error al cargar datos", tipo: "error" });
    } finally { 
      setLoading(false); 
    }
  }, [generarKey]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // 4. LÓGICA DE CALIFICACIÓN
  const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
  const revertirEscala = (num) => {
  const v = Math.round(num); // 1.5 -> 2 (B), 2.5 -> 3 (A), 3.5 -> 4 (AD)
  if (v >= 4) return "AD";
  if (v === 3) return "A";
  if (v === 2) return "B";
  if (v >= 1) return "C";
  return "-";
  };

  const calcularPromedio = useCallback((nombreAlumno, compIdx) => {
  let suma = 0, cont = 0;
  [1, 2, 3, 4].forEach(d => {
    const n = notas[`${nombreAlumno}-${compIdx}-${d}`]; // Usa el nombre como clave
    if (n && escala[n] > 0) { 
      suma += escala[n]; 
      cont++; 
    }
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

  // 5. FUNCIÓN DE EXPORTACIÓN A EXCEL
  const exportarExcel = () => {
    const dataExcel = alumnos.map((nombre, stIdx) => {
      const fila = { "N°": stIdx + 1, "ESTUDIANTE": nombre || "" };
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

  // 6. GUARDADO OPTIMIZADO
  const handleGuardarTodo = async () => {
  setLoading(true);
  
  // 1. Filtramos solo alumnos reales (quitamos los vacíos)
  const alumnosValidos = alumnos.filter(n => n && n !== "" && n !== "INGRESE ESTUDIANTE...");

  // 2. Limpiamos el objeto de notas para enviar solo lo que pertenece a alumnos reales
  const notasLimpias = {};
  Object.keys(notas).forEach(key => {
    // Solo incluimos la nota si la clave comienza con un nombre de la lista válida
    if (alumnosValidos.some(nombre => key.startsWith(nombre))) {
      notasLimpias[key] = notas[key];
    }
  });

  try {
    const { error } = await supabase.from('calificaciones').upsert({
      id: `reg_2026_1_A_MATEMATICA_B1`, // Tu ID de registro
      alumnos: alumnosValidos.sort(), // Guardamos ordenados de A-Z
      notas: notasLimpias, // Enviamos el JSON con los nombres como clave
      updated_at: new Date().toISOString()
    });

    if (error) throw error;
    alert("¡Datos sincronizados con éxito!");
  } catch (err) {
    console.error("Error completo:", err);
    alert("Error al guardar: " + err.message);
  } finally {
    setLoading(false);
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
                <button key={n} onClick={() => setBimestre(n)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${bimestre === n ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400'}`}>
                  {n}° BIM
                </button>
              ))}
            </div>
            <button onClick={exportarExcel} className="bg-green-500 border border-slate-200 text-white px-6 py-3.5 rounded-2xl text-[11px] font-black flex items-center gap-2 hover:bg-slate-400 transition-all shadow-sm">
              <Download className="w-4 h-4 text-white" /> EXCEL
            </button>
            <button onClick={handleGuardarTodo} disabled={loading} className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black flex items-center gap-2 hover:bg-black transition-all shadow-xl disabled:opacity-70">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-400" />}
              {loading ? "GUARDANDO..." : "GUARDAR TODO"}
            </button>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="p-4 md:p-6 flex-1 overflow-hidden">
        <div className="bg-white border shadow-2xl rounded-[1rem] overflow-hidden flex flex-col h-full">
          <div className="overflow-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <thead>
              <tr className="bg-green-600 text-white text-[9px] uppercase">
                <th className="p-2 w-7 sticky left-0 bg-green-600 z-50 text-center border-r border-gray-300">N°</th>
    
                  {/* COLUMNA AMPLIADA: Se eliminó el límite estricto para dar paso al nombre completo */}
                  <th className="p-2 w-[350px] text-center sticky left-8 bg-green-600 z-50 border-r-2 border-green-400">
                  APELLIDOS Y NOMBRES
                  </th>

                   {competencias.map((c, i) => (
                   <th key={i} colSpan="5" className="p-1 border-r border-gray-300 bg-green-700/40 text-center text-[7.5px]">
                 <div className="line-clamp-2 leading-tight px-1">{c}</div>
               </th>
             ))}
           <th className="p-0 w-8 bg-yellow-400 text-gray-700 sticky right-0 z-40 font-black text-center">LOGRO</th>
         </tr>

       <tr className="bg-green-700 text-white text-[10px]">
       <th className="sticky left-0 bg-green-700"></th>
       <th className="sticky left-8 bg-green-700 border-r border-gray-300"></th>
       {competencias.map((_, i) => (
       <React.Fragment key={i}>
        {/* COLUMNAS D1-D4 MÁS PEQUEÑAS (w-7) */}
        <th className="w-[35px] min-w-[35px] border-r border-white/10">D1</th>
        <th className="w-[35px] min-w-[35px] border-r border-white/10">D2</th>
        <th className="w-[35px] min-w-[35px] border-r border-white/10">D3</th>
        <th className="w-[35px] min-w-[35px] border-r border-white/10">D4</th>
        <th className="w-[35px] min-w-[35px] bg-green-500 border-r border-white/20 text-center text-[8px]">PROM</th>
      </React.Fragment>
      ))}
      <th className="sticky right-0 bg-yellow-600"></th>
    </tr>
   </thead>
    <tbody className="text-[10px]">
  {alumnos.map((nombre, stIdx) => {
    // Definimos el ID único para las notas: usa el nombre si existe, sino el índice temporal
    const alumnoId = nombre || `vacio-${stIdx}`;

    return (
      <tr key={stIdx} className="border-b hover:bg-green-50 h-7">
        {/* Columna N° */}
        <td className="text-center sticky left-0 bg-green-100 font-bold z-10 text-slate-800 text-[9px] border-r border-slate-300">
          {stIdx + 1}
        </td>

        {/* Columna Nombres */}
        <td className="p-0 sticky left-8 bg-white z-10 border-r border-slate-300 after:content-[''] after:absolute after:right-0 after:top-0 after:h-full after:w-[1px] after:bg-slate-300">
          <input
            type="text" 
            value={nombre || ""}
            onChange={(e) => {
              const next = [...alumnos];
              next[stIdx] = e.target.value.toUpperCase();
              setAlumnos(next);
            }}
            className="w-full h-7 px-4 outline-none bg-transparent font-bold text-slate-700 text-[10px]"
            placeholder="INGRESE ESTUDIANTE..."
          />
        </td>

        {/* Columnas de Competencias y Notas - Integración de Clave por Nombre */}
        {competencias.map((_, cIdx) => (
          <React.Fragment key={cIdx}>
            {[1, 2, 3, 4].map(dIdx => {
              const notaKey = `${alumnoId}-${cIdx}-${dIdx}`;
              return (
                <td key={dIdx} className="p-0 border-r border-slate-300 h-7">
                  <select 
                    value={notas[notaKey] || ""}
                    onChange={(e) => setNotas({ ...notas, [notaKey]: e.target.value })}
                    className="w-full h-full text-center bg-green-100/50 font-bold appearance-none outline-none text-[9px] text-slate-800"
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

            {/* Columna PROM - Ahora usa alumnoId para calcular correctamente */}
            <td className="text-center font-bold text-black bg-white w-10 border-r border-slate-300 h-7">
              {calcularPromedio(alumnoId, cIdx)} 
             </td>
             </React.Fragment>
               ))}

               {/* Columna LOGRO BIMESTRAL - Calculado con el identificador único */}
               <td className="text-center font-bold bg-yellow-300/80 text-black w-12 sticky right-0 border-l border-slate-400 h-7">
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