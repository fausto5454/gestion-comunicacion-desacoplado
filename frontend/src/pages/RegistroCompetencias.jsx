import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Save, FileSpreadsheet, CheckCircle2, Loader2, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import XLSX from 'xlsx-js-style';
import Swal from 'sweetalert2';

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
  const [grado, setGrado] = useState(""); 
  const [area, setArea] = useState("");
  const [bimestre, setBimestre] = useState(1);
  const [alumnos, setAlumnos] = useState([]); 
  const [notas, setNotas] = useState({});
  const [generos, setGeneros] = useState({}); // Nuevo: Estado para Género
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nombreDocenteAsignado, setNombreDocenteAsignado] = useState("");
  const [conclusiones, setConclusiones] = useState({});
  const [asistenciaReferencia, setAsistenciaReferencia] = useState({});
  const [dnis, setDnis] = useState({});
 
  const competencias = areasConfig[area] || [];
  const rolActual = Number(perfilUsuario?.rol_id || session?.user?.user_metadata?.rol_id);
  const esEstudiante = rolActual === 6;
  const esDocente = rolActual === 3;
  const esAdmin = rolActual === 1;

  const opcionesPermitidas = useMemo(() => {
    const rolActual = Number(perfilUsuario?.rol_id);
    const esAdmin = rolActual === 1;
    const esEstudiante = rolActual === 6; // Definimos el rol de estudiante
    const asignaciones = perfilUsuario?.asignaciones || [];

    // --- CASO 1: ADMINISTRADOR ---
    if (esAdmin) {
        return {
            grados: ["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"],
            areas: Object.keys(areasConfig || {})
        };
    }

    // --- CASO 2: ESTUDIANTE (Mejora integrada) ---
    if (esEstudiante && perfilUsuario?.grado) {
        // El estudiante solo puede ver su propio grado y sección
        return {
            grados: [`${perfilUsuario.grado} ${perfilUsuario.seccion}`],
            areas: Object.keys(areasConfig || {}) // El estudiante puede consultar cualquier área
        };
    }

    // --- CASO 3: DOCENTE (Lógica original restaurada) ---
    const gradosUnicos = [...new Set(asignaciones.map(a => `${a.grado} ${a.seccion}`))];
    const areasDelGrado = asignaciones
        .filter(a => `${a.grado} ${a.seccion}` === (grado || gradosUnicos[0]))
        .map(a => a.area.toUpperCase());

    return { 
        grados: gradosUnicos.length > 0 ? gradosUnicos : ["Cargando grados..."], 
        areas: areasDelGrado.length > 0 ? areasDelGrado : ["Cargando áreas..."] 
    };
    }, [perfilUsuario, grado]);
    // 3. Efectos al final
    useEffect(() => {
        if (opcionesPermitidas.grados.length > 0 && !grado) {
            setGrado(opcionesPermitidas.grados[0]);
        }
    }, [opcionesPermitidas.grados]);

   const cargarDatos = useCallback(async () => {
   if (!grado || !area || !bimestre || !perfilUsuario?.id_usuario) return;

   setLoading(true);
   try {
    const partes = grado.split(" ");
    const gradoDB = partes[0].trim();
    const seccionDB = partes[1]?.trim() || "A";
    const areaLimpia = area.toUpperCase().trim();

    // --- PASO A: OBTENCIÓN DIRECTA DEL DNI ---
    // Eliminamos el rescate por nombre; usamos el DNI que viene del perfil/login
    let dniFinal = perfilUsuario?.dni || perfilUsuario?.dni_estudiante;

    // --- PASO B: CARGAR MATRICULADOS (Sincronización de Género y DNI) ---
    let queryMat = supabase
      .from('matriculas')
      .select('dni_estudiante, apellido_paterno, apellido_materno, nombres, genero')
      .eq('grado', gradoDB)
      .eq('seccion', seccionDB);

    // Si es estudiante, filtramos la tabla de matrículas SOLO por su DNI real
    if (esEstudiante && dniFinal) {
      queryMat = queryMat.eq('dni_estudiante', dniFinal);
    } else {
      queryMat = queryMat.order('apellido_paterno', { ascending: true });
    }

    const { data: matriculados, error: matError } = await queryMat;
    if (matError) throw matError;

    // Sincronizamos la lista de alumnos y sus géneros
    const listaAlumnosFinal = [];
    const mapaDnis = {};
    const mapaGeneros = {}; // Para llenar la columna "SEXO" automáticamente

    matriculados?.forEach(m => {
      const nombreFull = `${m.apellido_paterno} ${m.apellido_materno}, ${m.nombres}`.toUpperCase().trim();
      // Usamos el DNI como ID interno para evitar errores de nombres
      listaAlumnosFinal.push(nombreFull);
      mapaDnis[nombreFull] = m.dni_estudiante;
      mapaGeneros[nombreFull] = m.genero; // Aquí se guarda "H" o "M"
    });

    setAlumnos(listaAlumnosFinal);
    setDnis(mapaDnis);
    setGeneros(mapaGeneros);

    if (matriculados?.length > 0) {
      const dnisGrupo = matriculados.map(m => m.dni_estudiante);
      const bimestreQuery = parseInt(bimestre);
      const areaQuery = area.normalize("NFC").toUpperCase().trim(); 

      const { data: califData, error } = await supabase
          .from('calificaciones')
          .select('*')
          .eq('area', areaQuery)
          .eq('bimestre', parseInt(bimestre));

      if (!califData || califData.length === 0) {
      const { data: debugData } = await supabase
          .from('calificaciones')
          .select('area')
          .limit(1);
          console.log("Área detectada en BD es exactamente:", debugData?.[0]?.area);
      }

     const nuevasNotas = {};

     if (califData && califData.length > 0) {
        matriculados.forEach(m => {
        const dniBusqueda = String(m.dni_estudiante).trim();

       const reg = califData.find(r => String(r.dni_estudiante).trim() === dniBusqueda);
        if (reg) {
          for (let c = 1; c <= 4; c++) {
            for (let d = 1; d <= 4; d++) {
              const val = reg[`c${c}_d${d}`];
                if (val) {
                nuevasNotas[`${dniBusqueda}-${c-1}-${d}`] = val;
               }
             }
           }
          console.log(`✅ Notas vinculadas para DNI: ${dniBusqueda}`);
         }
       });
      }
     setNotas(nuevasNotas);
    }
  } catch (err) {
    console.error("❌ Error en sincronización por DNI:", err.message);
  } finally {
    setLoading(false);
  }
  }, [grado, area, bimestre, perfilUsuario, esEstudiante]);

   useEffect(() => {
    if (opcionesPermitidas.areas.length > 0 && (!area || !opcionesPermitidas.areas.includes(area))) {
      setArea(opcionesPermitidas.areas[0]);
      }
    }, [opcionesPermitidas.areas, grado]);

    useEffect(() => {
    cargarDatos();
    }, [grado, area, bimestre]);

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
    // 1. Estabilización de datos iniciales
    const alumnosParaExportar = (typeof matriculados !== 'undefined' ? matriculados : alumnosOrdenados);
    const alumnosValidos = alumnosParaExportar.filter(a => a.nombre || a.nombres);
    if (alumnosValidos.length === 0) return;

    // 2. Definición de variables globales de la función (Evita ReferenceError)
    const totalRegistros = alumnosValidos.length; 
    
    const nFinales = alumnosValidos.map(a => {
        const nombreFull = (a.nombre || `${a.apellido_paterno} ${a.apellido_materno}, ${a.nombres}`).toUpperCase();
        return calcularLogroBimestral(nombreFull);
    });
    
    const stats = {
        AD: nFinales.filter(n => n === 'AD').length,
        A: nFinales.filter(n => n === 'A').length,
        B: nFinales.filter(n => n === 'B').length,
        C: nFinales.filter(n => n === 'C').length
    };

    // 3. Configuración de Estilos (Definidos antes de su uso)
    const borderThin = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    const estiloBase = { font: { sz: 8 }, border: borderThin, alignment: { vertical: "center", horizontal: "center" } };
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
    competencias.forEach(c => { 
        h1.push({ v: c.toUpperCase(), s: estiloVerdeOscuro });
        for(let i=0; i<4; i++) h1.push({ v: "", s: estiloVerdeOscuro }); 
    });
    h1.push({ v: "LOGRO", s: estiloNaranjaLogro }, { v: "", s: {} }, { v: "RESUMEN ESTADÍSTICO", s: estiloAzulResumen }, {v:"",s:estiloAzulResumen}, {v:"",s:estiloAzulResumen}, {v:"",s:estiloAzulResumen});
    rows.push(h1);

    const h2 = [{ v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }, { v: "", s: estiloVerdeOscuro }];
    competencias.forEach(() => ["D1", "D2", "D3", "D4", "PROM"].forEach(t => h2.push({ v: t, s: estiloVerdeOscuro })));
    h2.push({ v: "", s: estiloNaranjaLogro }, { v: "", s: {} }, { v: "NIVELES", s: estiloAzulResumen }, { v: "NOTAS", s: estiloAzulResumen }, { v: "CANT.", s: estiloAzulResumen }, { v: "%", s: estiloAzulResumen });
    rows.push(h2);

    // 4. Cuerpo del Excel sincronizado por DNI
    alumnosValidos.forEach((alumno, idx) => {
        const nombreFull = (alumno.nombre || `${alumno.apellido_paterno} ${alumno.apellido_materno}, ${alumno.nombres}`).toUpperCase().trim();
        // Sincronización Híbrida: Priorizar DNI para buscar notas
        const idEst = alumno.numero_dni || alumno.dni || normalizarID(nombreFull);
        
        const valSexo = (alumno.sexo || "-").toUpperCase();
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
                const colorNota = val === 'AD' ? "00B050" : val === 'A' ? "0070C0" : val === 'C' ? "FF0000" : "000000";
                row.push({ v: val, s: { ...estiloBase, font: { sz: 8, color: { rgb: colorNota } } } });
            });
            const p = calcularPromedio(nombreFull, cIdx);
            const colorProm = p === 'AD' ? "00B050" : p === 'A' ? "0070C0" : p === 'C' ? "FF0000" : "000000";
            row.push({ v: p, s: { ...estiloBase, fill: { fgColor: { rgb: "DCFCE7" } }, font: { bold: true, sz: 8, color: { rgb: colorProm } } } });
        });

        const lf = calcularLogroBimestral(nombreFull);
        row.push({ 
            v: lf, 
            s: { ...estiloBase, fill: { fgColor: { rgb: "FEF08A" } }, font: { bold: true, sz: 8, color: { rgb: lf === 'AD' ? "00B050" : lf === 'C' ? "FF0000" : "000000" } } }
        });
        row.push({ v: "", s: {} }); 

        // 5. Resumen Estadístico (Corrección de totalRegistros y stats)
        if (idx < 4) {
            const items = [
                { n: "DESTACADO", k: "AD", c: "00CC00" },
                { n: "LOGRADO", k: "A", c: "2563EB" },
                { n: "EN PROCESO", k: "B", c: "FFFF00" },
                { n: "EN INICIO", k: "C", c: "FF0000" }
            ];
            const item = items[idx];
            row.push(
                { v: item.n, s: { ...estiloBase, fill: { fgColor: { rgb: item.c } }, font: { bold: true, color: { rgb: item.k === 'B' ? "000000" : "FFFFFF" } } } },
                { v: item.k, s: { ...estiloBase, font: { bold: true } } },
                { v: stats[item.k] || 0, s: estiloBase },
                { v: `${totalRegistros > 0 ? (((stats[item.k] || 0) / totalRegistros) * 100).toFixed(0) : 0}%`, s: estiloBase }
            );
        } else if (idx === 4) {
            const estiloTotal = { ...estiloBase, font: { bold: true }, fill: { fgColor: { rgb: "E0F2FE" } } };
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
     XLSX.writeFile(wb, `Registro_Auxiliar_2026_${''}_${''}.xlsx`);
   };
 
   const handleGuardarTodo = async () => {
  if (!grado || !area || !bimestre || loading) return;
  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    const correoResponsable = user?.email || 'usuario_desconocido';

    const [numGrado, letraSeccion] = grado.split(" ");
    const seccionFinal = letraSeccion?.trim() || "A";
    const areaNormalizada = area.toUpperCase().trim();
    const bimestreInt = parseInt(bimestre);

    const batchCalificaciones = [];
    const alumnosOmitidos = [];

    // 1. PREPARACIÓN DE DATOS (Lógica de DNI)
    alumnos.forEach((nombre) => {
      const nombreKey = (nombre || "").toUpperCase().trim();
      const dni = dnis[nombreKey];

      if (!dni) {
        alumnosOmitidos.push({ nombre: nombreKey, razon: "DNI no vinculado" });
        return;
      }

      const obtenerNotasPorComp = (compIdx) => {
        return [1, 2, 3, 4]
          .map(d => notas[`${dni}-${compIdx}-${d}`])
          .filter(n => n && n !== '-' && n !== '');
      };

      const p1 = obtenerNotasPorComp(0).pop() || '-';
      const p2 = obtenerNotasPorComp(1).pop() || '-';
      const p3 = obtenerNotasPorComp(2).pop() || '-';
      const p4 = obtenerNotasPorComp(3).pop() || '-';

      const logroFinal = calcularLogroBimestral(dni);

      if (logroFinal === '-') {
        alumnosOmitidos.push({ nombre: nombreKey, razon: "Sin calificaciones" });
        return;
      }

      const registro = {
        dni_estudiante: dni,
        nombre_estudiante: nombreKey,
        grado: numGrado,
        seccion: seccionFinal,
        area: areaNormalizada,
        bimestre: bimestreInt,
        promedio_c1: p1,
        promedio_c2: p2,
        promedio_c3: p3,
        promedio_c4: p4,
        logro_bimestral: logroFinal,
        correo_electronico: correoResponsable
      };

      for (let c = 1; c <= 4; c++) {
        for (let d = 1; d <= 4; d++) {
          const val = notas[`${dni}-${c - 1}-${d}`];
          registro[`c${c}_d${d}`] = (val && val !== '-') ? val.toUpperCase() : null;
        }
      }
      batchCalificaciones.push(registro);
    });

  // 2. MODAL DE CONFIRMACIÓN PROFESIONAL
  const result = await Swal.fire({
  title: '<span style="color:#1e293b; font-weight:800; font-size:22px;">CONFIRMAR REGISTRO</span>',
  html: `
    <div style="text-align: left; font-size: 14px; color: #475569; padding: 0 10px;">
      <p style="margin-bottom: 15px;">Se enviará la información oficial de <b>${areaNormalizada}</b> al servidor central.</p>
      
      <div style="background: #f1f5f9; padding: 20px; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-weight: 500;">✅ Estudiantes listos:</span>
          <span style="font-weight: 800; color: #10b981; background: #d1fae5; padding: 4px 15px; border-radius: 50px;">${batchCalificaciones.length}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
             <span style="font-weight: 500;">⚠️ Registros omitidos:</span>
            <span style="font-weight: 800; color: #f43f5e; background: #fee2e2; padding: 4px 15px; border-radius: 50px;">${alumnosOmitidos.length}</span>
           </div>
         </div>
      
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 15px;">
          Responsable de envío: <br/> <b>${correoResponsable}</b>
        </p>
      </div>
     `,
     icon: 'question',
     iconColor: '#0f172a',
     showCancelButton: true,
     confirmButtonColor: '#0f172a',
     cancelButtonColor: '#0cad07',
     confirmButtonText: 'SÍ, GUARDAR AHORA',
     cancelButtonText: 'REVISAR',
     reverseButtons: true,
  
     // --- CONFIGURACIÓN DE REDONDEO CRÍTICA ---
     background: '#ffffff',
     borderRadius: '60px', // REDONDEO DEL CUADRO PRINCIPAL
  
    customClass: {
       popup: 'shadow-xl',
       confirmButton: 'boton-redondeado',
       cancelButton: 'boton-redondeado'
     },
  
    // Inyectamos CSS directamente para asegurar que los botones sean pastillas
    didOpen: () => {
      const confirmBtn = Swal.getConfirmButton();
      const cancelBtn = Swal.getCancelButton();
    
    // Forzamos el estilo de los botones
    if (confirmBtn) {
      confirmBtn.style.borderRadius = '50px';
      confirmBtn.style.padding = '12px 30px';
      confirmBtn.style.fontSize = '14px';
      confirmBtn.style.fontWeight = 'bold';
      confirmBtn.style.textTransform = 'uppercase';
    }
    if (cancelBtn) {
      cancelBtn.style.borderRadius = '50px';
      cancelBtn.style.padding = '12px 30px';
      cancelBtn.style.fontSize = '14px';
      cancelBtn.style.fontWeight = 'bold';
      cancelBtn.style.textTransform = 'uppercase';
     }
    }
   });

    // 3. ENVÍO A SUPABASE
    const { data, error } = await supabase
      .from('calificaciones')
      .upsert(batchCalificaciones, { onConflict: 'dni_estudiante,area,bimestre' })
      .select();

    if (error) throw error;

    // 4. MODAL DE ÉXITO DE IMPACTO
    Swal.fire({
     icon: 'success',
     title: '<span style="color:#10b981; font-weight:800">¡SINCRO EXITOSA!</span>',
     text: `Se actualizaron ${data.length} registros en la nube.`,
     timer: 2000,
     showConfirmButton: false,
     timerProgressBar: true,
     customClass: {
        popup: 'rounded-3xl' // Mantenemos la coherencia en el éxito
      }
    });

    if (typeof setShowConfirm === 'function') setShowConfirm(false);

   } catch (error) {
     console.error("Error crítico:", error);
     Swal.fire({
       icon: 'error',
       title: 'ERROR DE CARGA',
       text: error.message,
       confirmButtonColor: '#f43f5e'
    });
  } finally {
    setLoading(false);
    setTimeout(() => setMensaje(null), 5000);
  }
  };
        
  const getColorNota = (nota) => {
    if (nota === 'C') return 'text-red-600';
    if (nota === 'A') return 'text-blue-600';
    if (nota === 'AD') return 'text-green-600';
    return 'text-slate-700';
  };
 
  useEffect(() => {
  if (esEstudiante && perfilUsuario?.asignaciones?.length > 0) {
    const miAsignacion = perfilUsuario.asignaciones[0];
    setGrado(`${miAsignacion.grado} ${miAsignacion.seccion}`);
  }
  }, [esEstudiante, perfilUsuario]);

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
               disabled={esEstudiante} 
               className="bg-green-50 border-slate-100 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all">
              {opcionesPermitidas.grados.length > 0 ? (
              opcionesPermitidas.grados.map(g => <option key={g} value={g}>{g}</option>)
           ) : (
       <option value="">Cargando grados...</option>
      )}
     </select>
     <select 
      value={area} 
        onChange={(e) => setArea(e.target.value)}
          className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-3 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all">
          {opcionesPermitidas.areas.length > 0 ? (
           opcionesPermitidas.areas.map(a => <option key={a} value={a}>{a}</option>)
            ) : (
            <option value="">Cargando áreas...</option>
            )}
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
      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
     {!esEstudiante && (
      <>
        <button 
          onClick={exportarExcel} 
           className="bg-gray-900 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-100 flex-1 sm:flex-none"
            >
          <Download className="w-4 h-4" /> 
        <span className="inline">EXCEL</span>
      </button>
      <button 
         onClick={() => setShowConfirm(true)} 
          disabled={loading} 
           className="bg-gray-900 hover:bg-slate-800 text-white px-7 py-4 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-slate-200 disabled:bg-slate-400 flex-1 sm:flex-none"
            >
            {loading ? <Loader2 className="w-2 h-2 animate-spin" /> : <Save className="w-4 h-4 text-green-100" />} 
            <span>GUARDAR</span>
           </button>
           </>
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
     const rolUsuario = Number(perfilUsuario?.rol_id);
      if (rolUsuario === 1 || rolUsuario === 3) return true;
       const idFila = normalizarID(nombre);
       const idUsuario = normalizarID(perfilUsuario?.nombre_completo);
        return idFila.includes(idUsuario) || idUsuario.includes(idFila);
        })
       .map(({ nombre, originalIdx }, displayIdx) => {
     const nombreKey = (nombre || "").toUpperCase().trim();
    const dniEst = dnis[nombreKey];
    const generoActual = generos[nombreKey] || "";
    if (!dniEst) return null;
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
      // CAMBIO: Usamos dniEst en lugar de nombreEst para la máxima eficiencia
      onChange={(e) => setGeneros(prev => ({ ...prev, [dniEst]: e.target.value }))}
      className={`w-full h-full text-center font-bold outline-none appearance-none bg-transparent ${
        generoActual === 'H' ? 'text-blue-600' :
        generoActual === 'M' ? 'text-pink-500' : 'text-gray-400'
         }`}
          >
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
        {competencias.map((comp, cIdx) => (
          <React.Fragment key={cIdx}>
              {[1, 2, 3, 4].map(dIdx => {
                // 2. FILTRADO ATÓMICO: Aquí se usa el dniEst recuperado arriba
                const llaveNota = `${dniEst}-${cIdx}-${dIdx}`; 
                const notaActual = notas[llaveNota] || "";
                return (
               <td key={dIdx} className="p-0 border-r border-slate-200 w-7">
               <select
              disabled={esEstudiante}
             value={notaActual} // <--- Usa la variable definida arriba
            onChange={(e) => setNotas(prev => ({ 
            ...prev, 
            [llaveNota]: e.target.value // <--- Usa la llave definida arriba
             }))}
              className={`w-full h-7 text-center font-bold outline-none appearance-none text-[9px] ${getColorNota(notaActual)}`}
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
             <td className={`text-center font-black bg-green-100 border-r border-slate-200 text-[9px] w-8 ${getColorNota(calcularPromedio(dniEst, cIdx))}`}>
             {calcularPromedio(dniEst, cIdx)}
              </td>
               </React.Fragment>
                ))}
                 <td className={`text-center font-black bg-yellow-200 sticky right-0 z-20 border-l border-yellow-300 text-[9px] w-10 ${getColorNota(calcularLogroBimestral(dniEst))}`}>
                  {calcularLogroBimestral(dniEst)}
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