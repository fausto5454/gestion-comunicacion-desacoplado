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
  const [nombreDocenteAsignado, setNombreDocenteAsignado] = useState("");
  const [conclusiones, setConclusiones] = useState({});
  const [asistenciaReferencia, setAsistenciaReferencia] = useState({});
  const [dnis, setDnis] = useState({});
 
  const competencias = areasConfig[area] || [];
  const rolActual = perfilUsuario?.rol_id || session?.user?.user_metadata?.rol_id;
  const esEstudiante = Number(rolActual) === 6; 
  const esDocente = Number(rolActual) === 3;
  const esAdmin = Number(rolActual) === 1;

 useEffect(() => {
  const sincronizarDNIs = async () => {
    // Eliminamos 'nombre_estudiante' que causa el Error 400
    const { data, error } = await supabase
      .from('matriculas')
      .select('dni_estudiante, apellido_paterno, apellido_materno, nombres');

    if (error) {
      console.error("Fallo en sincronización:", error.message);
      return;
    }

    if (data) {
      const mapaDnisLocal = {}; // Declaración local para evitar ReferenceError
      data.forEach(m => {
        // Construimos la llave exactamente como en el resto de la app
        const nombreCompleto = `${m.apellido_paterno} ${m.apellido_materno}, ${m.nombres}`.toUpperCase().trim();
        const id = normalizarID(nombreCompleto);
        mapaDnisLocal[id] = m.dni_estudiante;
      });
      
      setDnis(mapaDnisLocal); 
      console.log("✅ Conexión establecida: DNIs cargados por identidad construida.");
    }
   };
   sincronizarDNIs();
 }, []);

 const cargarDatos = useCallback(async () => {
  if (!grado || !area || !bimestre) return;
  setLoading(true);

  try {
    // 1. Limpieza de Grado y Sección
    const partes = grado.split(" ");
    const numGrado = partes[0].trim().replace("°", ""); // Solo el número: "1"
    const letraSeccion = partes[1]?.trim() || "A";

    const { data: docenteData, error } = await supabase
      .from('docente_asignaciones')
      .select(`usuarios:id_usuario (nombre_completo)`)
      .eq('grado', numGrado)
      .eq('seccion', letraSeccion)
      .eq('area', area)
      .maybeSingle();

     if (docenteData) {
        setNombreDocenteAsignado(docenteData.nombre_docente.toUpperCase());
     } else {
       setNombreDocenteAsignado("POR ASIGNAR");
    }

    // 2. FUENTE DE VERDAD: Matrículas
    // Eliminamos el .order si sospechamos de la columna, o aseguramos el nombre exacto
    const { data: matriculados, error: matError } = await supabase
        .from('matriculas')
        .select('dni_estudiante, apellido_paterno, apellido_materno, nombres, genero')
        .eq('grado', `${numGrado}°`) // Buscamos el valor exacto ej: "1°"
        .eq('seccion', letraSeccion)
        .eq('anio_lectivo', 2026)
        .order('apellido_paterno', { ascending: true }); // Asegúrate que 'apellido_paterno' exista tal cual

    if (matError) throw matError;

    // 3. Procesamiento de identidades
    const nombresFull = [];
    const dniToId = {};
    const mapaGeneros = {};
    const mapaDnisLocal = {};

    matriculados?.forEach(m => {
      const nombreCompleto = `${m.apellido_paterno} ${m.apellido_materno}, ${m.nombres}`.toUpperCase().trim();
      const idEst = normalizarID(nombreCompleto);

     // Llenamos los mapas usando la llave correcta
     mapaDnisLocal[idEst] = m.dni_estudiante; 
     dniToId[m.dni_estudiante] = nombreCompleto;
     mapaGeneros[nombreCompleto] = m.genero; 
     mapaGeneros[idEst] = m.genero;
     nombresFull.push(nombreCompleto);
    });

    // 2. Actualizamos los estados de React
    setAlumnos(nombresFull);
    setGeneros(mapaGeneros);
    setDnis(mapaDnisLocal);

    // 4. Cargar Notas
    const { data: califData, error: califError } = await supabase
       .from('calificaciones')
       .select('*')
       .eq('grado', `${numGrado}°`) // Buscamos coincidencia exacta
       .eq('seccion', letraSeccion)
       .eq('area', area)
       .eq('bimestre', parseInt(bimestre));

    if (califError) throw califError;

   const nuevasNotas = {};
   const nuevosGeneros = { ...mapaGeneros }; // Empezamos con los de matrícula

   califData?.forEach(reg => {
    // Intentamos buscar por DNI primero (es lo más seguro)
    let nombreKey = dniToId[reg.dni_estudiante];
    
    // Si no hay DNI coincidente, buscamos por nombre normalizado
    if (!nombreKey) {
        const idDb = normalizarID(reg.nombre_estudiante);
        // Buscamos en nuestro array de alumnos cuál coincide con este ID normalizado
        nombreKey = nombresFull.find(n => normalizarID(n) === idDb);
    }

    if (nombreKey) {
        // Asignar género si viene en la tabla calificaciones y no estaba en matriculas
        if (reg.genero && !nuevosGeneros[nombreKey]) {
            nuevosGeneros[nombreKey] = reg.genero;
        }

        // Mapeo de notas
        for (let c = 1; c <= 4; c++) {
            for (let d = 1; d <= 4; d++) {
                const valor = reg[`c${c}_d${d}`];
                if (valor) {
                    // IMPORTANTE: Usar normalizarID para la llave del estado 'notas'
                    nuevasNotas[`${normalizarID(nombreKey)}-${c-1}-${d}`] = valor;
                 }
              }
          }
       }
   });

    setGeneros(nuevosGeneros);
    setNotas(nuevasNotas);

   } catch (error) {
     console.error("Error en la vinculación:", error);
   } finally {
     setLoading(false);
   }
  }, [grado, area, bimestre]);

    useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);
  
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
    const alumnosParaExportar = (typeof matriculados !== 'undefined' ? matriculados : alumnosOrdenados);
    const alumnosValidos = alumnosParaExportar.filter(a => a.nombre || a.nombres);
    if (alumnosValidos.length === 0) return;

    // Estadísticas (Ya confirmadas como perfectas)
    const nFinales = alumnosValidos.map(a => {
        const nombreFull = a.nombre || `${a.apellido_paterno} ${a.apellido_materno}, ${a.nombres}`.toUpperCase();
        return calcularLogroBimestral(nombreFull);
    });
    
    const totalRegistros = 20; 
    const stats = {
        AD: nFinales.filter(n => n === 'AD').length,
        A: nFinales.filter(n => n === 'A').length,
        B: nFinales.filter(n => n === 'B').length,
        C: nFinales.filter(n => n === 'C').length
    };

    const borderThin = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const estiloBase = { font: { sz: 8 }, border: borderThin, alignment: { vertical: "center", horizontal: "center" } };
    
    // Estilos de Cabecera
    const estiloVerdeOscuro = { ...estiloBase, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, fill: { fgColor: { rgb: "00A859" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
    const estiloNaranjaLogro = { ...estiloBase, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, fill: { fgColor: { rgb: "F4A300" } } };
    const estiloAzulResumen = { ...estiloBase, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 8 }, fill: { fgColor: { rgb: "64740B" } } };

    const rows = [];
    const colLogroIdx = 3 + (competencias.length * 5); 

    // Encabezados
    rows.push([{ v: "REGISTRO AUXILIAR 2026", s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center" } } }]);
    const filaInfo = Array(colLogroIdx + 6).fill({ v: "", s: {} });
    filaInfo[0] = { v: `ÁREA: ${area.toUpperCase()}`, s: { font: { bold: true, sz: 8 } } };
    filaInfo[8] = { v: `GRADO: ${grado}`, s: { font: { bold: true, sz: 8 } } };
    const docenteFinal = nombreDocenteAsignado || (perfilUsuario?.nombre_completo || "").toUpperCase();
    filaInfo[colLogroIdx - 4] = { v: `DOCENTE: ${docenteFinal}`, s: { font: { bold: true, sz: 8 } } };
    rows.push(filaInfo);
    rows.push([]); 

    const h1 = [{ v: "N°", s: estiloVerdeOscuro }, { v: "SEXO", s: estiloVerdeOscuro }, { v: "APELLIDOS Y NOMBRES", s: estiloVerdeOscuro }];
    competencias.forEach(c => { h1.push({ v: c.toUpperCase(), s: estiloVerdeOscuro }, "", "", "", ""); });
    h1.push({ v: "LOGRO", s: estiloNaranjaLogro }, { v: "", s: {} }, { v: "RESUMEN ESTADÍSTICO", s: estiloAzulResumen }, "", "", "");
    rows.push(h1);

    const h2 = [{ v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }];
    competencias.forEach(() => ["D1", "D2", "D3", "D4", "PROM"].forEach(t => h2.push({ v: t, s: estiloVerdeOscuro })));
    h2.push({ v: "", s: estiloNaranjaLogro }, { v: "", s: {} }, { v: "NIVELES", s: estiloAzulResumen }, { v: "NOTAS", s: estiloAzulResumen }, { v: "CANT.", s: estiloAzulResumen }, { v: "%", s: estiloAzulResumen });
    rows.push(h2);

    // CUERPO CON MEJORAS DE COLOR
    alumnosValidos.forEach((alumno, idx) => {
        const nombreFull = alumno.nombre || `${alumno.apellido_paterno} ${alumno.apellido_materno}, ${alumno.nombres}`.toUpperCase().trim();
        const idEst = normalizarID(nombreFull);
        
        // Mejora 1: Color por Sexo (Azul para H, Fucsia para M)
        const valSexo = (alumno.sexo || alumno.genero || generos[idEst] || generos[nombreFull] || "-").toUpperCase();
        const colorSexo = valSexo === 'M' ? "FF00FF" : (valSexo === 'H' ? "0000FF" : "000000");

        const row = [
            { v: idx + 1, s: estiloBase },
            { v: valSexo, s: { ...estiloBase, font: { sz: 8, bold: true, color: { rgb: colorSexo } } } },
            { v: nombreFull, s: { ...estiloBase, alignment: { horizontal: "left" } } }
        ];

        // Notas de competencias
        competencias.forEach((_, cIdx) => {
            [1, 2, 3, 4].forEach(d => {
                const val = notas[`${idEst}-${cIdx}-${d}`] || "-";
                const colorNota = val === 'AD' ? "00B050" : val === 'A'  ? "0070C0" : val === 'C'  ? "FF0000" : "000000";
                row.push({ 
                v: val, s: {  ...estiloBase, 
                font: { sz: 8, color: { rgb: colorNota } }  } 
                });
    
                });
                const p = calcularPromedio(nombreFull, cIdx);
                const colorPromedioFinal = p === 'AD' ? "00B050" : p === 'A' ? "0070C0" : p === 'C' ? "FF0000" : "000000";
           row.push({ 
                v: p, 
                s: { ...estiloBase, 
                fill: { fgColor: { rgb: "DCFCE7" } }, 
                font: { bold: true, sz: 8, color: { rgb: colorPromedioFinal } } } });
                });
        // Mejora 2: Logro Final con C en Rojo
        const lf = calcularLogroBimestral(nombreFull);
        row.push({ 
            v: lf, 
            s: { 
                ...estiloBase, 
                fill: { fgColor: { rgb: "FEF08A" } }, 
                font: { bold: true, sz: 8, color: { rgb: lf === 'AD' ? "00B050": lf === 'A'  ? "0070C0": lf === 'C'  ? "FF0000" : "000000" } } 
            }
        });
        row.push({ v: "", s: {} }); 

        // Resumen Estadístico (Manteniendo el éxito previo)
        if (idx < 4) {
            const item = [{ n: "DESTACADO", k: "AD", c: "00CC00" }, { n: "LOGRADO", k: "A", c: "2563EB" }, { n: "EN PROCESO", k: "B", c: "FFFF00" }, { n: "EN INICIO", k: "C", c: "FF0000" }][idx];
            row.push(
                { v: item.n, s: { ...estiloBase, fill: { fgColor: { rgb: item.c } }, font: { bold: true, sz: 8, color: { rgb: item.k === 'B' ? "000000" : "FFFFFF" } } } },
                { v: item.k, s: { ...estiloBase, font: { bold: true, sz: 8 } } },
                { v: stats[item.k] || 0, s: estiloBase },
                { v: `${(((stats[item.k] || 0) / totalRegistros) * 100).toFixed(0)}%`, s: estiloBase }
            );
        } else if (idx === 4) {
            const estiloTotal = { ...estiloBase, font: { bold: true, sz: 8 }, fill: { fgColor: { rgb: "E0F2FE" } } };
            row.push({ v: "TOTAL", s: estiloTotal }, { v: "", s: estiloTotal }, { v: totalRegistros, s: estiloTotal }, { v: "100%", s: estiloTotal });
        }
        rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // Merges y Alturas (Configuración estable)
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: colLogroIdx + 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, { s: { r: 1, c: 8 }, e: { r: 1, c: 13 } },
        { s: { r: 1, c: colLogroIdx - 4 }, e: { r: 1, c: colLogroIdx + 1 } },
        { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
        { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } }, { s: { r: 3, c: colLogroIdx }, e: { r: 4, c: colLogroIdx } },
        { s: { r: 3, c: colLogroIdx + 2 }, e: { r: 3, c: colLogroIdx + 5 } },
        { s: { r: 9, c: colLogroIdx + 2 }, e: { r: 9, c: colLogroIdx + 3 } }
    ];

    let currCol = 3;
    competencias.forEach(() => {
        ws['!merges'].push({ s: { r: 3, c: currCol }, e: { r: 3, c: currCol + 4 } });
        currCol += 5;
    });

    ws['!cols'] = [{ wch: 4 }, { wch: 4 }, { wch: 32 }, ...Array(competencias.length * 5).fill({ wch: 4 }), { wch: 6 }, { wch: 2 }, { wch: 15 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];

    ws['!rows'] = [];
    ws['!rows'][0] = { hpt: 30 }; 
    ws['!rows'][3] = { hpt: 28 }; 
    ws['!rows'][4] = { hpt: 22 }; 

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "REGISTRO");
    XLSX.writeFile(wb, `Registro_Auxiliar_2026_${grado}_${area}.xlsx`);
  };

   const handleGuardarTodo = async () => {
    // 1. PREVENCIÓN DE DOBLE CLIC Y VALIDACIÓN
    if (!grado || !area || !bimestre || loading) return; 
    setLoading(true);
    const t0 = performance.now(); 

    try {
      // --- MEJORA: OBTENER EL USUARIO ANTES DE EMPEZAR ---
      const { data: { user } } = await supabase.auth.getUser();
      const correoResponsable = user?.email || 'usuario_desconocido';
      // --------------------------------------------------

      const [numGrado, letraSeccion] = grado.split(" ");
      const seccionFinal = letraSeccion?.trim() || "A";
      const areaNormalizada = area.toUpperCase().trim();

      const batchCalificaciones = [];
      const batchMatriculas = [];
      const batchAsistencia = [];

      alumnos.forEach((nombre) => {
        const nombreLimpio = (nombre || "").toUpperCase().trim();
        const idEst = normalizarID(nombreLimpio);
        const dni = dnis[idEst] ? dnis[idEst].toString().trim() : null;
        const gen = generos[nombreLimpio] || null; 

        if (!dni) {
          console.warn(`Registro omitido: No se encontró DNI para ${nombreLimpio}`);
          return; 
        }

        batchCalificaciones.push({
          dni_estudiante: dni,
          nombre_estudiante: nombreLimpio,
          grado: numGrado,
          seccion: seccionFinal,
          area: areaNormalizada,
          bimestre: parseInt(bimestre),
          genero: gen,
          promedio_c1: calcularPromedio(nombre, 0),
          promedio_c2: calcularPromedio(nombre, 1),
          promedio_c3: calcularPromedio(nombre, 2),
          promedio_c4: calcularPromedio(nombre, 3),
          logro_bimestral: calcularLogroBimestral(nombre),
          ...Object.fromEntries(
            Array.from({ length: 16 }, (_, i) => {
              const c = Math.floor(i / 4) + 1;
              const d = (i % 4) + 1;
              return [`c${c}_d${d}`, notas[`${idEst}-${c - 1}-${d}`] || null];
            })
          )
        });

        batchMatriculas.push({ 
          dni_estudiante: dni, 
          genero: gen, 
          grado: numGrado, 
          seccion: seccionFinal 
        });

        batchAsistencia.push({ 
          dni_estudiante: dni, 
          genero: gen, 
          grado: numGrado, 
          seccion: seccionFinal,
        });
      });

      // 2. EJECUCIÓN ATÓMICA (BATCH)
      const results = await Promise.all([
        supabase.from('calificaciones').upsert(batchCalificaciones, { onConflict: 'dni_estudiante,area,bimestre' }),
        supabase.from('matriculas').upsert(batchMatriculas, { onConflict: 'dni_estudiante' }),
        supabase.from('asistencia').upsert(batchAsistencia, { onConflict: 'dni_estudiante,grado,seccion' })
      ]);

      const errorResult = results.find(r => r.error);
      if (errorResult) throw errorResult.error;

      // 3. AUDITORÍA UNIFICADA (CORREGIDA)
      const t1 = performance.now();
      const duracion = Math.round(t1 - t0);

     // Definimos un mensaje dinámico basado en los datos reales
     const descripcionReal = `Sincronización: ${batchCalificaciones.length} alumnos - Área: ${areaNormalizada} - Bimestre: ${bimestre}`;

     await supabase.from('auditoria').insert([{
         accion: 'UPDATE', 
         modulo: 'Calificaciones', // Nombre del módulo específico
         usuario_responsable: correoResponsable,
         descripcion: descripcionReal, // <--- Descripción dinámica y real
         duracion_ms: duracion,
         fecha_hora: new Date().toISOString()
      }]);

      setMensaje({ texto: "¡DATOS SINCRONIZADOS EXITOSAMENTE!", tipo: 'success' });
      setShowConfirm(false);
      
      setTimeout(() => setMensaje(null), 3000);

    } catch (error) {
      console.error("Error crítico:", error);
      alert("❌ Error al procesar: " + error.message);
      setMensaje({ texto: "Error: " + error.message, tipo: 'error' });
    } finally {
      setLoading(false);
    }
    };

  const getColorNota = (nota) => {
    if (nota === 'C') return 'text-red-600';
    if (nota === 'A') return 'text-blue-600';
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
      <div className="bg-slate-600 border-b border-emerald-600 rounded-b-[2.5rem] p-4 md:p-6 shadow-sm z-40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
     {/* SECCIÓN IZQUIERDA: Ícono, Título y Selectores */}
     <div className="flex items-start md:items-center gap-4">
      {/* Contenedor del ícono con más espacio (padding mejorado) */}
      <div className="bg-green-600 p-3.5 rounded-[1.5rem] text-white shadow-lg shadow-green-100 flex-shrink-0">
        <FileSpreadsheet className="w-7 h-7" />
        </div>
        <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-black text-green-400 tracking-tighter leading-none">
          Registro 2026
        </h1>
        {/* Selectores con mejor espaciado y responsividad */}
        <div className="flex flex-wrap gap-2">
          <select 
            value={grado} 
            onChange={(e) => setGrado(e.target.value)} 
            disabled={esDocente || esEstudiante} 
            className="bg-green-50 border-slate-100 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all">
            {["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select 
            value={area} 
            onChange={(e) => setArea(e.target.value)} 
            disabled={esDocente || esEstudiante} 
            className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all">
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
      <div className="flex bg-gray-50 p-1.5 rounded-[1.25rem] overflow-x-auto">
        {[1, 2, 3, 4].map(n => (
          <button 
            key={n} 
            onClick={() => setBimestre(n)} 
            className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${
              bimestre === n ? 'bg-slate-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
            }`}>
            {n}° BIM
          </button>
        ))}
      </div>
      {/* Botones de Acción con mejor tamaño en móvil */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        {!esEstudiante && ( //Ocultar el botón Excel para estudiantes.
        <button 
          onClick={exportarExcel} 
          className="bg-gray-900 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-100 flex-1 sm:flex-none">
          <Download className="w-4 h-4" /> 
          <span className="inline">EXCEL</span>
       </button>
        )}
        {!esEstudiante && (
          <button 
            onClick={() => setShowConfirm(true)} 
            disabled={loading} 
            className="bg-gray-900 hover:bg-slate-800 text-white px-7 py-4 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:bg-slate-400 flex-1 sm:flex-none">
            {loading ? (
            <Loader2 className="w-2 h-2 animate-spin" />
            ) : (
           <Save className="w-4 h-4 text-green-100" />
            )} 
            <span>GUARDAR</span>
         </button>
          )}
        </div>
      </div>
     </div>
    </div>
      {/* TABLA: SOLUCIÓN AL DESPLAZAMIENTO */}
      <div className="p-4 flex-1">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-[1.5rem] overflow-hidden">
          {/* Contenedor con scroll horizontal SOLAMENTE */}
          <div className="overflow-x-auto custom-scrollbar shadow-xl rounded-lg">
            <table className="w-max md:w-full border-collapse table-auto">
            <thead>
           <tr className="bg-slate-600 text-white text-[9px] uppercase font-bold h-10">
         {/* N° - Ancho fijo w-7 coincide con left-7 de los nombres */}
       <th rowSpan="2" className="p-1 w-10 sticky left-0 z-50 bg-emerald-700 border-r border-b border-green-500 text-center">
      N°
    </th>
    {/* SEXO - Solo escritorio */}
    <th rowSpan="2" className="hidden md:table-cell p-1 w-8 sticky left-7 z-50 bg-pink-700 border-r border-b border-green-500 text-center">
     SEXO
      </th>
       {/* APELLIDOS Y NOMBRES - Desplazamiento coordinado */}
        <th rowSpan="2" className="w-[100px] md:w-[300px] sticky left-7 md:left-15 z-40 bg-slate-600 border-r border-b border-slate-400 text-center px-1 shadow-[3px_0_3px_-2px_rgba(0,0,0,0.3)]">
         <div className="text-[10px] md:text-[10px] leading-tight whitespace-normal md:whitespace-nowrap flex items-center justify-center h-full">
        APELLIDOS Y NOMBRES
      </div>
    </th>
    {competencias.map((c, i) => (
    <th key={i} colSpan="5" className="p-1 border-r border-b border-slate-400 bg-slate-600 text-center min-w-[60px] text-[8px]">
      {c}
       </th>
        ))}
       <th rowSpan="2" className="p-0.5 w-10 sticky right-0 z-50 bg-yellow-400 text-slate-800 font-black border-l border-b border-yellow-500 text-center text-[9px]">
      LOGRO
    </th>
  </tr>
  <tr className="bg-slate-800 text-white text-[9px] text-center uppercase h-7">
    {competencias.map((_, i) => (
      <React.Fragment key={i}>
       {/* Columnas D1-D4 más anchas en escritorio */}
        <th className="w-8 border-r border-green-600/50">D1</th>
        <th className="w-8 border-r border-green-600/50">D2</th>
        <th className="w-8 border-r border-green-600/50">D3</th>
        <th className="w-8 border-r border-green-600/50">D4</th>
        <th className="w-8 bg-emerald-500 font-bold border-r border-green-600">PROM</th>
      </React.Fragment>
    ))}
  </tr>
  </thead>
  <tbody className={`text-[10px] ${perfilUsuario?.rol_id === 6 ? 'pointer-events-none' : ''}`}>
   {alumnosOrdenados
    .filter(({ nombre }) => {
      const rolUsuario = perfilUsuario?.rol_id;
      if (rolUsuario === 1 || rolUsuario === 3) return true;
      const idFila = normalizarID(nombre);
      const idUsuario = normalizarID(perfilUsuario?.nombre_completo);
      return idFila.includes(idUsuario) || idUsuario.includes(idFila);
      })
      .map(({ nombre, originalIdx }, displayIdx) => {
      const nombreEst = (nombre || "").toUpperCase().trim();
      const idUnico = normalizarID(nombreEst);
      const generoActual = generos[nombreEst] || "";
      return (
        <tr key={originalIdx} className="border-b border-slate-200 hover:bg-green-50/50 h-8">
          {/* NÚMERO DE ORDEN */}
          <td className="text-center sticky left-0 z-20 bg-green-200 font-bold border-r border-slate-300 text-gray-600 w-6 text-[10px]">
            {displayIdx + 1}
          </td>
          {/* COLUMNA SEXO */}
          <td className="hidden md:table-cell p-0 sticky left-7 z-20 bg-gray-200 border-r border-slate-300 w-8">
            <select
              disabled={esEstudiante}
              value={generoActual}
               onChange={(e) => setGeneros(prev => ({ ...prev, [nombreEst]: e.target.value }))}
               className={`w-full h-full text-center font-bold outline-none appearance-none bg-transparent ${
                generoActual === 'H' ? 'text-blue-600' :
                generoActual === 'M' ? 'text-pink-500' : 'text-gray-400'
               }`}>
               <option value="">-</option>
              <option value="M">M</option>
              <option value="H">H</option>
             </select>
           </td>
          {/* COLUMNA NOMBRE - Sincronizada con left-7 y altura ajustada */}
        <td className="p-0 sticky left-7 md:left-15 z-30 bg-white border-r border-slate-200 min-w-[80px] md:min-w-[250px] h-8 shadow-[3px_0_3px_-2px_rgba(0,0,0,0.1)]">
      <div
     contentEditable={!esEstudiante}
     suppressContentEditableWarning={true}
      onBlur={(e) => {
      if (esEstudiante) return;
      const next = [...alumnos];
      next[originalIdx] = e.currentTarget.innerText;
      setAlumnos(next);
      {/* TEX TAREA: interlineado de móviles y centrado vertical de nombres en escritorio */}
     }}
     className="w-full h-full px-1.5 md:pl-5 md:pr-2 outline-none font-bold text-slate-700 uppercase bg-transparent cursor-text overflow-hidden text-[8px] md:text-[9px] leading-[1.4] md:leading-normal whitespace-normal md:whitespace-nowrap flex items-center justify-start">
    {nombre || ""}
     </div>
      </td>
        {competencias.map((_, cIdx) => (
          <React.Fragment key={cIdx}>
            {[1, 2, 3, 4].map(dIdx => (
              <td key={dIdx} className="p-0 border-r border-slate-200 w-7">
                 <select
                    disabled={esEstudiante}
                     value={notas[`${idUnico}-${cIdx}-${dIdx}`] || ""}
                      onChange={(e) => setNotas(prev => ({ ...prev, [`${idUnico}-${cIdx}-${dIdx}`]: e.target.value }))}
                       className={`w-full h-7 text-center font-bold outline-none appearance-none bg-green-50/50 text-[9px] ${getColorNota(notas[`${idUnico}-${cIdx}-${dIdx}`])}`}>
                       <option value="">-</option>
                       <option value="AD">AD</option>
                       <option value="A">A</option>
                       <option value="B">B</option>
                       <option value="C">C</option>
                  </select>
                </td>
              ))}
             <td className={`text-center font-black bg-green-100 border-r border-slate-200 text-[9px] w-8 ${getColorNota(calcularPromedio(nombre, cIdx))}`}>
             {calcularPromedio(nombre, cIdx)}
              </td>
               </React.Fragment>
                ))}
                 <td className={`text-center font-black bg-yellow-200 sticky right-0 z-20 border-l border-yellow-300 text-[9px] w-10 ${getColorNota(calcularLogroBimestral(nombre))}`}>
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
              <button onClick={handleGuardarTodo} className="flex-1 py-4 bg-slate-900 hover:bg-slate-400 text-white font-bold rounded-2xl text-xs uppercase">Sí, Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistroCompetencias;