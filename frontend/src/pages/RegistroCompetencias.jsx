import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import XLSX from 'xlsx-js-style';

const areasConfig = {
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


const escala = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0 };
const inversa = { 4: "AD", 3: "A", 2: "B", 1: "C", 0: "-" };
const normalizarID = (t) => t ? String(t).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const RegistroCompetencias = ({ perfilUsuario, session, areaNombre, gradoSeccion }) => {
  const [grado, setGrado] = useState(perfilUsuario?.grado ? `${perfilUsuario.grado} ${perfilUsuario.seccion}` : "1° A");
  const [area, setArea] = useState(perfilUsuario?.area || "MATEMÁTICA");
  const [bimestre, setBimestre] = useState(1);
  const [alumnos, setAlumnos] = useState([]); 
  const [notas, setNotas] = useState({});
  const [generos, setGeneros] = useState({}); // Nuevo: Estado para Género
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [conclusiones, setConclusiones] = useState({});
 
  const competencias = areasConfig[area] || [];
  const rolActual = perfilUsuario?.rol_id || session?.user?.user_metadata?.rol_id;
  const esEstudiante = Number(rolActual) === 6; 
  const esDocente = Number(rolActual) === 3;
  const esAdmin = Number(rolActual) === 1;

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
      if (esEstudiante) {
       setAlumnos([perfilUsuario?.nombre_completo || ""]);
     } else {
      // IMPORTANTE: Aquí deberías cargar la lista de alumnos matriculados.
      // Si no tienes esa tabla, al menos inicializa con un mensaje o estructura válida.
      setAlumnos(Array(38).fill("")); 
    }
     setGeneros({});
     setLoading(false);
     return;
    }
      // CASO B: Sí hay datos en la base de datos
      const nombresDeBD = data.map(reg => String(reg.nombre_estudiante || "").trim());
  
      if (esEstudiante) {
         // Para el estudiante, solo cargamos los nombres que vienen de la DB
        // (El filtro del renderizado se encargará de mostrar solo el suyo)
               setAlumnos(nombresDeBD);
        } else {
       // Para la docente, mantenemos el formato de 38 filas
            const listaCompleta = [...nombresDeBD];
            while (listaCompleta.length < 38) listaCompleta.push("");
               setAlumnos(listaCompleta);
       }

        const nuevasNotas = {};
        const nuevosGeneros = {};

       data.forEach((reg) => {
       const nombreEst = String(reg.nombre_estudiante || "").trim();
       const idEst = normalizarID(nombreEst);
  
       // Guardamos el Sexo/Género
       nuevosGeneros[idEst] = reg.genero || ""; 

       // Cargamos las notas usando el nombre exacto de columna de Supabase
       for (let c = 1; c <= 4; c++) {
          for (let d = 1; d <= 4; d++) {
            const valor = reg[`c${c}_d${d}`]; // Usa guion bajo: c1_d1
              if (valor) {
                // Esta llave debe ser IGUAL a la que usas en el renderizado
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

  // Restaurado y Mejorado: Función Excel Profesional
  const exportarExcel = () => {
      const alumnosValidos = alumnosOrdenados.filter(a => a.nombre && a.nombre.trim() !== "");
      if (alumnosValidos.length === 0) return;
  
      // 1. Cálculos Estadísticos
      const nFinales = alumnosValidos.map(a => calcularLogroBimestral(a.nombre));
      const totalAlumnos = nFinales.length;
      const stats = {
          AD: nFinales.filter(n => n === 'AD').length,
          A: nFinales.filter(n => n === 'A').length,
          B: nFinales.filter(n => n === 'B').length,
          C: nFinales.filter(n => n === 'C').length
      };
  
      // 2. ESTILOS DE ALTA PRECISIÓN (TODO FUENTE 8)
      const borderThin = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      const estiloBase = { font: { sz: 8 }, border: borderThin, alignment: { vertical: "center", horizontal: "center" } };
      
      const estiloVerdeOscuro = { 
          ...estiloBase, 
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, 
          fill: { fgColor: { rgb: "00A859" } }, 
          alignment: { horizontal: "center", vertical: "center", wrapText: true } 
      };
  
      // Estilo Naranja Logro Final (Corregido para una sola celda)
      const estiloNaranjaLogro = { 
          ...estiloBase, 
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, 
          fill: { fgColor: { rgb: "F4A300" } }, 
          alignment: { horizontal: "center", vertical: "center", wrapText: true } 
      };
  
      const estiloAzulResumen = { 
          ...estiloBase, 
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, 
          fill: { fgColor: { rgb: "64740B" } },
          alignment: { horizontal: "center", vertical: "center" }
      };
  
      const rows = [];
      // La columna Logro Final es la inmediatamente posterior a las competencias
      const colLogroIdx = 3 + (competencias.length * 5); 
  
      // FILA 1: TÍTULO PRINCIPAL
      rows.push([{ v: "REGISTRO AUXILIAR 2026", s: { font: { bold: true, sz: 12 }, alignment: { horizontal: "center" } } }]);
  
      // FILA 2: CABECERA DE INFORMACIÓN (Ajustada para máxima visibilidad)
       const filaInfo = Array(colLogroIdx + 6).fill({ v: "", s: {} });
      filaInfo[0] = { v: `ÁREA: ${area.toUpperCase()}`, s: { font: { bold: true, sz: 8 } } };
      filaInfo[8] = { v: `GRADO: ${grado}`, s: { font: { bold: true, sz: 8 } } };
      const nombreDocente = perfilUsuario?.full_name ? perfilUsuario.full_name.toUpperCase() : "DOCENTE NO IDENTIFICADO";
      filaInfo[colLogroIdx - 4] = { v: `DOCENTE: ${nombreDocente}`, s: { font: { bold: true, sz: 8 }, alignment: { horizontal: "center" } } };
      
      rows.push(filaInfo);
      rows.push([]); 
  
      // FILA 4: ENCABEZADO SUPERIOR
      const h1 = [
          { v: "N°", s: estiloVerdeOscuro }, 
          { v: "SEXO", s: estiloVerdeOscuro }, 
          { v: "APELLIDOS Y NOMBRES", s: estiloVerdeOscuro }
      ];
      competencias.forEach(c => {
          h1.push({ v: c.toUpperCase(), s: estiloVerdeOscuro }, "", "", "", "");
      });
      h1.push({ v: "LOGRO FINAL", s: estiloNaranjaLogro }); // Solo ocupa una columna
      h1.push({ v: "", s: {} }); // Celda de separación vacía
      h1.push({ v: "RESUMEN ESTADÍSTICO", s: estiloAzulResumen }, "", "", "");
      rows.push(h1);
  
      // FILA 5: ENCABEZADO INFERIOR (Sub-cabeceras)
      const h2 = [{ v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }];
      competencias.forEach(() => ["D1", "D2", "D3", "D4", "PROM"].forEach(t => h2.push({ v: t, s: estiloVerdeOscuro })));
      h2.push({ v: "", s: estiloNaranjaLogro }); // Merge vertical con la fila superior
      h2.push({ v: "", s: {} });
      h2.push({ v: "NIVELES", s: estiloAzulResumen }, { v: "NOTAS", s: estiloAzulResumen }, { v: "CANT.", s: estiloAzulResumen }, { v: "%", s: estiloAzulResumen });
      rows.push(h2);
  
      // 3. CUERPO DE DATOS
      alumnosValidos.forEach((alumno, idx) => {
          const idEst = normalizarID(alumno.nombre);
          const row = [
              { v: idx + 1, s: estiloBase },
              { v: generos[idEst] || "-", s: estiloBase },
              { v: alumno.nombre.toUpperCase(), s: { ...estiloBase, alignment: { horizontal: "left" } } }
          ];
  
          // Notas y Promedios
          competencias.forEach((_, cIdx) => {
              [1, 2, 3, 4].forEach(d => {
                  const val = notas[`${idEst}-${cIdx}-${d}`] || "-";
                  row.push({ v: val, s: { ...estiloBase, font: { sz: 8, color: { rgb: val === 'C' ? "FF0000" : "000000" } } } });
              });
              const p = calcularPromedio(alumno.nombre, cIdx);
              row.push({ v: p, s: { ...estiloBase, fill: { fgColor: { rgb: "DCFCE7" } }, font: { bold: true, sz: 8 } } });
          });
  
          // Celda Logro Final (Fondo amarillo como en la imagen)
          const lf = calcularLogroBimestral(alumno.nombre);
          row.push({ v: lf, s: { ...estiloBase, fill: { fgColor: { rgb: "FEF08A" } }, font: { bold: true, sz: 8 } } });
          row.push({ v: "", s: {} }); // Separador
  
          // Resumen Estadístico Lateral
          if (idx < 4) {
          const item = [
              { n: "DESTACADO", k: "AD", c: "4ADE80" },
              { n: "LOGRADO", k: "A", c: "2563EB" },
              { n: "EN PROCESO", k: "B", c: "FDE047" },
              { n: "EN INICIO", k: "C", c: "EF4444" }
          ][idx];
          
          row.push(
              { v: item.n, s: { ...estiloBase, fill: { fgColor: { rgb: item.c } }, font: { bold: true, sz: 8 } } },
              { v: item.k, s: { ...estiloBase, font: { bold: true, sz: 8 } } },
              { v: stats[item.k] || 0, s: estiloBase },
              { v: totalAlumnos > 0 ? `${((stats[item.k]/totalAlumnos)*100).toFixed(0)}%` : "0%", s: estiloBase }
            );
          } else if (idx === 4) {
           // FILA TOTAL CORREGIDA: Combinamos visualmente las dos primeras celdas
          const estiloTotal = { ...estiloBase, font: { bold: true, sz: 8 }, fill: { fgColor: { rgb: "E0F2FE" } } };
          row.push(
              { v: "TOTAL", s: estiloTotal }, 
              { v: "", s: estiloTotal }, // Esta celda se ocultará tras el merge
              { v: totalAlumnos, s: estiloTotal },
              { v: "100%", s: estiloTotal }
          );
        }
      rows.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
  
      // 4. MERGES ESTRATÉGICOS (PARA EVITAR DATOS OCULTOS)
      ws['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: colLogroIdx + 5 } }, // Título Principal
          { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },             // ÁREA (Visible)
          { s: { r: 1, c: 8 }, e: { r: 1, c: 13 } },            // GRADO (Visible)
          { s: { r: 1, c: colLogroIdx - 4 }, e: { r: 1, c: colLogroIdx + 1 } }, // DOCENTE (Visible)
          { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },             // N°
          { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },             // SEXO
          { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },             // APELLIDOS Y NOMBRES
          { s: { r: 3, c: colLogroIdx }, e: { r: 4, c: colLogroIdx } }, // LOGRO FINAL (Vertical Única)
          { s: { r: 3, c: colLogroIdx + 2 }, e: { r: 3, c: colLogroIdx + 5 } } // RESUMEN ESTADÍSTICO (Título)
      ];
  
      // Merge para los títulos de cada competencia
      let currCol = 3;
      competencias.forEach(() => {
          ws['!merges'].push({ s: { r: 3, c: currCol }, e: { r: 3, c: currCol + 4 } });
          currCol += 5;
      });
  
      // MEJORA: Merge dinámico para la fila TOTAL del Resumen Estadístico
      // El resumen estadístico empieza en la fila index 5. El TOTAL está en el index 9.
      const colResumenStart = colLogroIdx + 2; 
      ws['!merges'].push({ 
          s: { r: 9, c: colResumenStart },     // Inicio: Celda "TOTAL"
          e: { r: 9, c: colResumenStart + 1 } // Fin: Combina con la siguiente celda (Notas)
      });
  
      // 5. AJUSTE DE ANCHOS DE COLUMNA (Fuente 8)
      ws['!cols'] = [
          { wch: 4 }, { wch: 6 }, { wch: 40 }, // Datos personales
          ...Array(competencias.length * 5).fill({ wch: 4.2 }), // D1 a PROM
          { wch: 6 },    // LOGRO FINAL (Estrecho similar a PROM)
          { wch: 2 },    // Separador
          { wch: 15 },   // NIVELES (Resumen)
          { wch: 6 },    // NOTAS (Resumen)
          { wch: 6 },    // CANT. (Resumen)
          { wch: 6 }     // % (Resumen)
      ];
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "REGISTRO");
      XLSX.writeFile(wb, `Registro_Auxiliar_2026.xlsx`);
    };

  const handleGuardarTodo = async () => {
  setLoading(true);
  try {
    const [numGrado, letraSeccion] = grado.split(" ");
    
    const filasParaGuardar = alumnos
      .filter(nombre => nombre && nombre.trim() !== "")
      .map(nombre => {
        const idEst = normalizarID(nombre);
        const nombreTrim = nombre.trim().toUpperCase();
        
        // Creamos el registro incluyendo los promedios que mencionas
        const reg = {
          nombre_estudiante: nombreTrim,
          grado: numGrado,
          seccion: letraSeccion || "A",
          area: area,
          bimestre: parseInt(bimestre),
          genero: generos[idEst] || "",
          // Incluimos los promedios por competencia
          promedio_c1: calcularPromedio(nombre, 0),
          promedio_c2: calcularPromedio(nombre, 1),
          promedio_c3: calcularPromedio(nombre, 2),
          promedio_c4: calcularPromedio(nombre, 3),
          logro_bimestral: calcularLogroBimestral(nombre),
          conclusion_descriptiva: conclusiones[idEst] || ""
        };

        // Mapeo de los calificadores individuales (D1, D2, etc.)
        for (let c = 0; c < 4; c++) {
          for (let d = 1; d <= 4; d++) {
            const val = notas[`${idEst}-${c}-${d}`];
            if (val) reg[`c${c+1}_d${d}`] = val;
          }
        }
        return reg;
      });

    if (filasParaGuardar.length === 0) {
      setMensaje({ texto: "SIN DATOS PARA GUARDAR", tipo: 'error' });
      return;
    }

    // EJECUCIÓN: Capturamos 'error' para validar el RLS
    const { error } = await supabase
      .from('calificaciones')
      .upsert(filasParaGuardar, { 
        onConflict: 'nombre_estudiante,grado,seccion,area,bimestre' 
      });

    if (error) {
      // Si Supabase devuelve error (por ejemplo, Wendy en otra área)
      console.error("Error de permisos (RLS):", error.message);
      setMensaje({ 
        texto: "ERROR: NO TIENE PERMISO PARA ESTA ÁREA/GRADO", 
        tipo: 'error' 
      });
    } else {
      // Si no hay error, confirmamos el guardado
      setMensaje({ texto: "¡DATOS GUARDADOS EN SUPABASE!", tipo: 'success' });
    }

  } catch (err) {
    setMensaje({ texto: "ERROR DE CONEXIÓN", tipo: 'error' });
  } finally {
    setLoading(false);
    setShowConfirm(false);
    setTimeout(() => setMensaje(null), 4000);
  }
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
      <div className="bg-white border-b rounded-b-[2.5rem] p-4 md:p-6 shadow-sm z-40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
     {/* SECCIÓN IZQUIERDA: Ícono, Título y Selectores */}
     <div className="flex items-start md:items-center gap-4">
      {/* Contenedor del ícono con más espacio (padding mejorado) */}
      <div className="bg-green-600 p-3.5 rounded-[1.5rem] text-white shadow-lg shadow-green-100 flex-shrink-0">
        <FileSpreadsheet className="w-7 h-7" />
        </div>

        <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">
          Registro 2026
        </h1>
        
        {/* Selectores con mejor espaciado y responsividad */}
        <div className="flex flex-wrap gap-2">
          <select 
            value={grado} 
            onChange={(e) => setGrado(e.target.value)} 
            disabled={esDocente || esEstudiante} 
            className="bg-slate-200/80 border-slate-200 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-60"
          >
            {["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select 
            value={area} 
            onChange={(e) => setArea(e.target.value)} 
            disabled={esDocente || esEstudiante} 
            className="bg-green-200/80 text-green-700 border border-green-200 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all disabled:opacity-60"
          >
            {Object.keys(areasConfig).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
    {/* SECCIÓN DERECHA: Bimestres y Acciones */}
    <div className="flex flex-wrap items-center gap-3">
      {/* Selector de Bimestres (Scroll horizontal en móvil para evitar saltos de línea) */}
      <div className="flex bg-gray-100/80 p-1.5 rounded-[1.25rem] overflow-x-auto">
        {[1, 2, 3, 4].map(n => (
          <button 
            key={n} 
            onClick={() => setBimestre(n)} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${
              bimestre === n ? 'bg-green-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {n}° BIM
          </button>
        ))}
      </div>
      {/* Botones de Acción con mejor tamaño en móvil */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!esEstudiante && ( //Ocultar el botón Excel para estudiantes.
        <button 
          onClick={exportarExcel} 
          className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-100 flex-1 sm:flex-none">
          <Download className="w-4 h-4" /> 
          <span className="hidden sm:inline">EXCEL</span>
       </button>
        )}
        {!esEstudiante && (
          <button 
            onClick={() => setShowConfirm(true)} 
            disabled={loading} 
            className="bg-slate-900 hover:bg-slate-800 text-white px-7 py-4 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:bg-slate-400 flex-1 sm:flex-none"
          >
            {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
           <Save className="w-4 h-4 text-green-400" />
            )} 
            <span>GUARDAR</span>
         </button>
          )}
        </div>
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
                  <th rowSpan="2" className="p-2.5 w-12 sticky left-5 z-30 bg-green-600 border-r border-b border-green-400">SEXO</th>
                  <th rowSpan="2" className="p-4 w-64 sticky left-10 z-30 bg-green-600 border-r border-b border-green-400 text-center">APELLIDOS Y NOMBRES</th>
                  
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
              <tbody className={`text-[10px] ${perfilUsuario?.rol_id === 6 ? 'pointer-events-none' : ''}`}>
              {alumnosOrdenados
              .filter(({ nombre }) => {
               const rolUsuario = perfilUsuario?.rol_id;
                const esDocente = rolUsuario === 3; // Wendy
                 const esAdmin = rolUsuario === 1;

                 // Si es Admin o Docente, ve a todos los estudiantes
                   if (esDocente || esAdmin) return true;

                    // Lógica de privacidad para Estudiantes:
                    // Solo ve la fila si su nombre coincide con el del perfil
                     const idFila = normalizarID(nombre);
                      const idUsuario = normalizarID(perfilUsuario?.nombre_completo);
      
                       return idFila.includes(idUsuario) || idUsuario.includes(idFila);
                        })
                        .map(({ nombre, originalIdx }, displayIdx) => {
                         // Si el nombre no existe, ponemos un genérico (excepto si es estudiante con restricciones)
                          const nombreFinal = nombre || (perfilUsuario?.rol_id !== 6 ? `ESTUDIANTE ${displayIdx + 1}` : "");
      
                          // Mantenemos tus constantes por si las usas en las celdas de abajo
                           const idUnico = normalizarID(nombreFinal);
                           const esWendy = perfilUsuario?.rol_id === 3;

                            return (
                            <tr key={originalIdx} className="border-b border-slate-200 hover:bg-green-50/50 h-10">
                            {/* NÚMERO DE ORDEN - Fijo a la izquierda */}
                            <td className="text-center sticky left-0 z-20 bg-green-200 font-bold border-r border-slate-300 text-gray-600 w-7">
                            {displayIdx + 1}</td>
                             <td className="p-0 sticky left-7 z-20 bg-white border-r border-slate-300">
                             <select 
                             disabled={esEstudiante}
                             value={generos[idUnico] || ""}
                             onChange={(e) => setGeneros(prev => ({ ...prev, [idUnico]: e.target.value }))}
                             className="w-full h-10 text-center font-bold outline-none bg-gray-200 appearance-none text-blue-700"
                            >
                          <option value="">-</option><option value="M">M</option><option value="H">H</option>
                        </select>
                      </td>
                      <td className="p-0 sticky left-10 z-20 bg-white border-r-1 border-slate-200">
                        <input
                          type="text" 
                           readOnly={esEstudiante} //El estudiante no puede editar su nombre.
                            value={nombre || ""}
                            onChange={(e) => {
                            if (esEstudiante) return;
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
                               disabled={esEstudiante}
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