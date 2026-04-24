import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { 
  Save, FileText, FileSpreadsheet, Loader2, 
  Bookmark, Users, Calendar 
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { generarConsolidadoProfesional } from '../services/asistenciaService';

const areasConfig = {
  "MATEMÁTICA": ["RESUELVE PROBLEMAS DE CANTIDAD", "RESUELVE PROBLEMAS DE REGULARIDAD", "FORMA Y MOVIMIENTO", "GESTIÓN DE DATOS"],
  "COMUNICACIÓN": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"],
  "CIENCIA Y TECNOLOGÍA": ["INDAGA MEDIANTE MÉTODOS", "EXPLICA EL MUNDO FÍSICO", "DISEÑA SOLUCIONES"],
  "CIENCIAS SOCIALES": ["CONSTRUYE INTERPRETACIONES HISTÓRICAS", "GESTIONA RESPONSABLEMENTE EL ESPACIO Y EL AMBIENTE", "GESTIONA RESPONSABLEMENTE LOS RECURSOS ECONÓMICOS"],
  "DPCC": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA DEMOCRÁTICAMENTE"],
  "ARTE Y CULTURA": ["APRECIA MANIFESTACIONES", "CREA PROYECTOS"],
  "EDUCACION FÍSICA": ["SE DESENVUELVE DE MANERA AUTÓNOMA", "ASUME UNA VIDA SALUDABLE"],
  "EPT": ["GESTIONA PROYECTOS DE EMPRENDIMIENTO"],
  "RELIGIÓN": ["CONSTRUYE SU IDENTIDAD", "ASUME LA EXPERIENCIA"],
  "INGLÉS": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"]
};

const AsistenciaAlumnos = ({ perfilUsuario, session }) => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' }));
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- CAMBIO: Estados dinámicos vinculados al perfil ---
  const [grado, setGrado] = useState(""); 
  const [seccion, setSeccion] = useState("");
  const [areaSeleccionada, setAreaSeleccionada] = useState("");

  const [asignacionesDocente, setAsignacionesDocente] = useState([]);

  const opcionesPermitidas = useMemo(() => {
    const esAdmin = Number(perfilUsuario?.rol_id) === 1;
    if (!asignacionesDocente) return { grados: [], areas: [] }; 

    if (esAdmin) {
        return {
            grados: ["1° A", "1° B", "1° C", "2° A", "2° B", "2° C", "3° A", "3° B", "4° A", "4° B", "5° A", "5° B"],
            areas: Object.keys(areasConfig || {}).map(a => a.toUpperCase())
        };
    }

   const gradosUnicos = [...new Set(asignacionesDocente.map(a => 
      `${a.grado.toString().replace('°', '')}° ${a.seccion}`
    ))];
    
    const aulaActual = `${grado.replace('°', '')}° ${seccion}`;
    const areasDocente = [...new Set(
      asignacionesDocente
        .filter(a => `${a.grado.toString().replace('°', '')}° ${a.seccion}` === aulaActual)
        .map(a => a.area.toUpperCase())
    )];

    return { grados: gradosUnicos, areas: areasDocente.length > 0 ? areasDocente : ["Seleccione Área"] };
  }, [grado, seccion, asignacionesDocente]);

  // 3. DEFINICIÓN DE FUNCIONES - Debe estar ARRIBA de los useEffect
  const cargarAlumnos = async (gradoFinal, seccionFinal) => {
    const { data, error } = await supabase
      .from('matriculas')
      .select('id_matricula, apellido_paterno, apellido_materno, nombres') 
      .eq('grado', gradoFinal)
      .eq('seccion', seccionFinal)
      .order('apellido_paterno', { ascending: true });

    if (!error) {
        setEstudiantes(data || []); // Esto guardará los objetos con los nombres de la BD
    }
  };

  // 4. EFECTOS (Al final)
  useEffect(() => {
    const fetchAsignaciones = async () => {
      if (!perfilUsuario?.id_usuario) return;
      const { data } = await supabase
        .from('docente_asignaciones')
        .select('grado, seccion, area')
        .eq('id_usuario', perfilUsuario.id_usuario);
      
      if (data) {
        setAsignacionesDocente(data);
        if (data.length > 0 && !grado) {
          setGrado(data[0].grado.toString().replace('°', ''));
          setSeccion(data[0].seccion);
          setAreaSeleccionada(data[0].area.toUpperCase());
        }
      }
    };
    fetchAsignaciones();
   }, [perfilUsuario]);

  useEffect(() => {
    if (grado && seccion && areaSeleccionada && areaSeleccionada !== "Seleccione Área") {
      const gradoConSimbolo = grado.includes('°') ? grado : `${grado}°`;
      cargarAlumnos(gradoConSimbolo, seccion);
    }
  }, [grado, seccion, areaSeleccionada]);

  const fetchAsistenciaExistente = async (nomina, init) => {
    try {
      const dnis = nomina.map(n => n.dni_estudiante);
      const { data, error } = await supabase
        .from('asistencia')
        .select('dni_estudiante, estado')
        .in('dni_estudiante', dnis)
        .eq('fecha', fecha)
        .eq('observaciones', areaSeleccionada);

      if (error) throw error;

      if (data && data.length > 0) {
        const guardada = { ...init };
        data.forEach(reg => {
          guardada[reg.dni_estudiante] = reg.estado;
        });
        setAsistencia(guardada);
      } else {
        setAsistencia(init);
      }
    } catch (e) {
      console.error("Error al recuperar asistencia previa:", e);
      setAsistencia(init);
    }
  };

  const fetchAsistenciaArea = useCallback(async () => {
  const fechaPeru = typeof fecha === 'string' 
    ? fecha.split('T')[0] 
    : new Date(fecha).toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
  
  try {
    const { data, error } = await supabase
      .from('asistencia')
      .select('*')
      .eq('grado', `${grado.toString().replace('°', '')}°`)
      .eq('seccion', seccion)
      .eq('fecha', fechaPeru);

    if (error) throw error;
    if (data) {
      const mapa = {};
      data.forEach(reg => mapa[reg.dni_estudiante] = reg.estado);
      setAsistencia(mapa);
    }
  } catch (err) {
    console.error("Error:", err);
  }
 }, [grado, seccion, fecha]);

 // 2. useEffect para Realtime
 useEffect(() => {
   const canalDocente = supabase
    .channel('realtime_docente')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencia' }, 
      () => fetchAsistenciaArea()
    )
    .subscribe();

    return () => supabase.removeChannel(canalDocente);
   }, [fetchAsistenciaArea]);

   const cargarAsistencia = async () => {
  // 1. Identificamos si es estudiante y obtenemos su DNI
  const esEstudiante = Number(perfilUsuario?.rol_id) === 3; // Suponiendo 3 = Estudiante
  const dniUsuario = perfilUsuario?.id_dni || perfilUsuario?.id_usuario;

  let query = supabase
    .from('asistencia')
    .select('*')
    .eq('grado', grado)
    .eq('seccion', seccion)
    .eq('observaciones', areaSeleccionada);

   // 2. APLICAR FILTRO INDIVIDUAL (Esto es lo que falta)
   if (esEstudiante) {
    query = query.eq('dni_estudiante', dniUsuario);
   }

   const { data, error } = await query.order('fecha', { ascending: true });

   if (!error) {
     setAsistenciaData(data || []);
   }
  };

  // --- FUNCIÓN DE CARGA DE NÓMINA (Optimizada) ---
  const fetchNomina = useCallback(async () => {
    if (!grado || !seccion || !areaSeleccionada || !perfilUsuario) return;

    setLoading(true);
    try {
        const soloNumero = grado.toString().replace(/\D/g, ''); 
        const gradoQuery = `${soloNumero}°`;
        const seccionQuery = seccion.trim().toUpperCase();

        let query = supabase
            .from('matriculas')
            .select('id_matricula, dni_estudiante, apellido_paterno, apellido_materno, nombres, genero')
            .eq('grado', gradoQuery)
            .eq('seccion', seccionQuery)
            .eq('anio_lectivo', 2026)
            .eq('estado_estudiante', 'Activo');

        // IMPORTANTE: Para el rol administrativo omitimos cualquier eq('docente_id', ...)

        const { data, error } = await query.order('apellido_paterno', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            setEstudiantes(data); // Esto llena la lista blanca
            const init = {};
            data.forEach(est => init[est.dni_estudiante] = 'Presente');
            await fetchAsistenciaExistente(data, init);
        } else {
            setEstudiantes([]);
            console.log("No hay alumnos para:", gradoQuery, seccionQuery);
        }
    } catch (err) {
        console.error("Error crítico en nomina:", err);
    } finally {
        setLoading(false);
    }
   }, [grado, seccion, areaSeleccionada, perfilUsuario, fecha]);

   // EFECTO 1: Sincronización de la Lista (Solo dispara la carga)
   useEffect(() => {
    fetchNomina();
  }, [fetchNomina]);

   // EFECTO 2: Inicialización Automática (Solo para Administradores)
   useEffect(() => {
    const esAdmin = Number(perfilUsuario?.rol_id) === 1;
    if (!esAdmin) return;

    if (!grado && opcionesPermitidas.grados.length > 0) {
        const [g, s] = opcionesPermitidas.grados[0].split(' ');
        setGrado(g.replace('°', ''));
        setSeccion(s);               
    }

    if (!areaSeleccionada && opcionesPermitidas.areas.length > 0) {
        setAreaSeleccionada(opcionesPermitidas.areas[0]);
     }
  }, [perfilUsuario, opcionesPermitidas, grado, areaSeleccionada]);

  const exportarExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asistencia');

  worksheet.getRow(6).height = 12;

  // --- CONFIGURACIÓN DE COLUMNAS (Clave para el orden visual) ---
  worksheet.getColumn(2).width = 11;   // B: N°
  worksheet.getColumn(3).width = 40;   // C: ESTUDIANTE (Más ancho para respiro)
  worksheet.getColumn(4).width = 18;   // D: ESTADO
  worksheet.getColumn(5).width = 25;   // E: ÁREA
  worksheet.getColumn(6).width = 15;   // F: FECHA

  // Título con Formato
  worksheet.mergeCells('B3:F3'); 
  const titleCell = worksheet.getCell('B3');
  titleCell.value = 'REGISTRO DE ASISTENCIA DE ESTUDIANTES';
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // --- CÁLCULOS PREVIOS ---
  const valores = Object.values(asistencia);

  const presentes = valores.filter(v => v === 'Presente' || v === 'P').length;
  const ausentes = valores.filter(v => v === 'Ausente' || v === 'F' || v === 'Falta').length;
  const tardanzas = valores.filter(v => v === 'Tardanza' || v === 'T').length;
  const justificadosCount = valores.filter(v => v === 'Justificado' || v === 'J').length;

  // Cabecera de Datos (Fila 5)
  worksheet.getCell('B5').value = `ÁREA: ${areaSeleccionada}`;
  worksheet.getCell('D5').value = `FECHA: ${fecha}`;
  worksheet.getCell('F5').value = `GRADO: ${grado}° ${seccion}`;
  ['B5', 'D5', 'F5'].forEach(ref => worksheet.getCell(ref).font = { size: 10, bold: true });

  // --- 2. FILA DE RESUMEN MEJORADA (BORDES Y ESPACIADO) ---
  worksheet.getRow(6).height = 25;
  // Modifica la función resStyle dentro de tu código:
  const resStyle = (cell, color = 'FF000000') => {
    cell.font = { bold: true, size: 11, color: { argb: color } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  
  // Bordes con un color gris suave
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },    // Gris claro
    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },   // Gris claro
    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } }, // Gris claro
    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }   // Gris claro
   };
  };
  // Aplicar valores y estilos individuales para evitar que choquen
  const cellTotal = worksheet.getCell('B6');
  cellTotal.value = `TOTAL: ${estudiantes.length}`;
  resStyle(cellTotal);
  cellTotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };

  const cellPres = worksheet.getCell('C6');
  cellPres.value = `Presentes: ${presentes}`;
  resStyle(cellPres);

  const cellAus = worksheet.getCell('D6');
  cellAus.value = `Ausentes: ${ausentes}`;
  resStyle(cellAus, 'FFFF0000');

  const cellTar = worksheet.getCell('E6');
  cellTar.value = `Tardanzas: ${tardanzas}`;
  resStyle(cellTar, 'FFFFC000');

  const cellJus = worksheet.getCell('F6');
  cellJus.value = `Justificados: ${justificadosCount}`;
  resStyle(cellJus, 'FF00B050'); 

  // --- 3. ENCABEZADOS DE LA TABLA (Fila 8) ---
  const headerRow = worksheet.getRow(8);
  headerRow.values = [null, 'N°', 'ESTUDIANTE', 'ESTADO', 'ÁREA', 'FECHA']; 
  
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } };
      cell.font = { size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }
  });

  // --- 4. DATOS DE ESTUDIANTES ---
  estudiantes.forEach((est, i) => {
  // Declaramos estadoActual (llave: dni_estudiante)
  const estadoActual = asistencia[est.dni_estudiante] || 'Presente'; 
  
  const row = worksheet.addRow([
    null,
    i + 1,
    `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`,
    estadoActual === 'Ausente' ? 'Falta' : estadoActual,
    areaSeleccionada,
    fecha
  ]);

  row.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      // 1. Tamaño de letra reducido a 8 (más pequeño como el original)
      cell.font = { name: 'Arial', size: 8 }; 
      
      // 2. RESTAURACIÓN DE BORDES: Estilo 'thin' negro para todas las celdas
      cell.border = { 
        top: { style: 'thin', color: { argb: 'FF000000' } }, 
        left: { style: 'thin', color: { argb: 'FF000000' } }, 
        bottom: { style: 'thin', color: { argb: 'FF000000' } }, 
        right: { style: 'thin', color: { argb: 'FF000000' } } 
      };

      cell.alignment = colNumber === 3 
        ? { horizontal: 'left', vertical: 'middle', indent: 1 } 
        : { horizontal: 'center', vertical: 'middle' };

      // 3. Lógica de colores (Mantenida e idéntica, pero con size 8)
      if (colNumber === 4) { // Columna ESTADO
        const valor = cell.value ? cell.value.toString().trim().toUpperCase() : '';
        const esFalta = valor === 'F' || valor === 'FALTA' || valor === 'AUSENTE';
        const esTardanza = valor === 'T' || valor === 'TARDANZA';
        const esJustificado = valor === 'J' || valor === 'JUSTIFICADO';

        if (esFalta) {
            // Usamos size 8 y bold, pero sin fondo (fill) para limpiar el diseño
            cell.font = { name: 'Arial', size: 8, color: { argb: 'FFFF0000' }, bold: true };
            cell.fill = { type: 'pattern', pattern: 'none' }; // Quitamos fondo
          } else if (esTardanza) {
            cell.font = { name: 'Arial', size: 8, color: { argb: 'FFBF9000' }, bold: true };
            cell.fill = { type: 'pattern', pattern: 'none' }; 
          } else if (esJustificado) {
            cell.font = { name: 'Arial', size: 8, color: { argb: 'FF15803D' }, bold: true };
            cell.fill = { type: 'pattern', pattern: 'none' }; 
          } else {
            cell.fill = { type: 'pattern', pattern: 'none' }; 
          }
        }
      }
    });
  });

  // --- 5. DESCARGA OPTIMIZADA ---
  try {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Asistencia_${areaSeleccionada}_${grado}${seccion}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    
    // Limpieza de memoria (Soluciona la lentitud en descargas seguidas)
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    
    toast.success("Excel generado con éxito");
  } catch (error) {
    console.error("Error al exportar:", error);
    toast.error("Error al generar el archivo");
  }
  };

  const exportarPDF = () => {
  const doc = new jsPDF();
  const total = estudiantes.length;
  const valores = Object.values(asistencia);
  const presentes = valores.filter(v => v === 'Presente' || v === 'P').length;
  const ausentes = valores.filter(v => v === 'Falta' || v === 'F' || v === 'Ausente').length;
  const tardanzas = valores.filter(v => v === 'Tardanza' || v === 'T').length;
  const justificado = valores.filter(v => v === 'Justificado' || v === 'J').length;

  // --- CABECERA ESTILO EXCEL ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REGISTRO DE ASISTENCIA DE ESTUDIANTES", 105, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`ÁREA: ${areaSeleccionada}`, 14, 25);
  doc.text(`FECHA: ${fecha}`, 80, 25);
  doc.text(`GRADO Y SECCIÓN: ${grado}° "${seccion}"`, 140, 25);

  // --- FILA DE RESUMEN CON IDENTIFICACIÓN POR COLOR ---
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 30, 182, 8, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); // Negro para el título
  doc.text(`RESUMEN: Total: ${total}  | `, 16, 35);
  
  let currentX = 58; 
  // Presentes en NEGRO
  doc.setTextColor(0, 0, 0); 
  doc.text(`Presentes: ${presentes}`, currentX, 35);
  
  currentX += 30;
  // Ausentes en ROJO FOSFORESCENTE
  doc.setTextColor(255, 0, 0);
  doc.text(` |  Ausentes: ${ausentes}`, currentX, 35);

  currentX += 30;
  // Tardanzas en ÁMBAR RESALTADO
  doc.setTextColor(255, 140, 0); 
  doc.text(` |  Tardanzas: ${tardanzas}`, currentX, 35);

  currentX += 30;
  // Justificados en VERDE RESALTADO
  doc.setTextColor(0, 200, 0); 
  doc.text(` |  Justificado: ${justificado}`, currentX, 35);

  // --- TABLA DE ASISTENCIA ---
  doc.autoTable({
  startY: 40,
  head: [['N°', 'APELLIDOS Y NOMBRES', 'ESTADO', 'ÁREA', 'FECHA']],
  body: estudiantes.map((e, i) => {
    const estadoGuardado = asistencia[e.dni_estudiante] || 'Presente';
    const estadoVisual = estadoGuardado === 'Ausente' ? 'Falta' : estadoGuardado;

    return [
      i + 1,
      `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
      estadoVisual,
      areaSeleccionada,
      fecha
    ];
   }),

    theme: 'grid',
    headStyles: {
      fillColor: [146, 208, 80], // El mismo verde #92D050 de tu Excel
      textColor: [0, 0, 0],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 25 },
      3: { cellWidth: 35 },
      4: { halign: 'center', cellWidth: 25 }
    },

    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const estado = data.cell.raw;
        if (estado === 'Ausente' || estado === 'Falta') {
          data.cell.styles.textColor = [255, 0, 0]; // Rojo Fosforescente
        } else if (estado === 'Justificado') {
          data.cell.styles.textColor = [0, 200, 0]; // Verde Intenso
        } else if (estado === 'Tardanza') {
          data.cell.styles.textColor = [255, 140, 0]; // Ámbar/Naranja Resaltado
        }
      }
    },

    didDrawPage: (data) => {
      // Pie de página con numeración
      const str = "Página " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(str, 196, 285, { align: "right" });
    }
  });
  
  doc.save(`Asistencia_${areaSeleccionada}_${grado}${seccion}.pdf`);
  toast.success("PDF generado con éxito");
 };

const guardarAsistenciaTotal = async () => {
  const marcados = Object.keys(asistencia).length;
  if (marcados < estudiantes.length) {
    const faltantes = estudiantes.length - marcados;
    if (!window.confirm(`Faltan marcar ${faltantes} alumnos. ¿Deseas guardar el resto como 'Presente' por defecto?`)) {
      return;
    }
  }

  setIsSaving(true);
  try {
    // Lógica Institucional 2079: 1° y 2° Mañana | 3°, 4° y 5° Tarde
    const soloGradoNum = parseInt(grado.toString().replace(/\D/g, ''));
    const turnoDetectado = soloGradoNum >= 3 ? 'TARDE' : 'MAÑANA';

    const gradoFmt = `${grado.toString().replace('°', '')}°`;
    const seccionFmt = seccion.trim().toUpperCase();
    const areaFmt = (areaSeleccionada || "").toUpperCase().trim();

    const records = estudiantes.map(est => {
      const dniLimpio = String(est.dni_estudiante).trim();
      const estadoVisual = asistencia[dniLimpio] || 'Presente';
      const estadoMap = { 'Presente': 'P', 'Falta': 'F', 'Tardanza': 'T', 'Justificado': 'J', 'Ausente': 'F' };

      return {
        dni_estudiante: dniLimpio,
        fecha: fecha,
        estado: estadoMap[estadoVisual] || 'P',
        observaciones: areaFmt,
        grado: gradoFmt,
        seccion: seccionFmt,
        turno: turnoDetectado
      };
    });

    // Ejecución directa del Upsert
    const { error } = await supabase
      .from('asistencia')
      .upsert(records, { 
      onConflict: 'dni_estudiante,fecha,observaciones' 
    });

    if (error) throw error;

    // ✅ ÉXITO INMEDIATO: El Toast ahora aparecerá sin interferencias
    toast.success('¡Sincronización exitosa!', {
      description: `${records.length} registros actualizados en ${areaFmt}`,
      duration: 3000,
    });

    } catch (error) {
      console.error("Error en el guardado:", error);
      toast.error(`Error de base de datos: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
   };

   const manejarCambioAsistencia = (dni, nuevoEstado) => {
     setAsistencia(prev => ({
     ...prev,
      [dni]: nuevoEstado
   }));
   }
   
   return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      {/* HEADER */}
      <div className="p-4 md:p-4 bg-slate-600 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-5 w-full lg:w-auto">
          <div className="hidden sm:block bg-pink-600 p-6 rounded-3xl text-white shadow-lg">
            <Bookmark size={24} />
            </div>
          
           {/* CONTENEDOR DE SELECTORES EN EL HEADER */}
         <div className="flex-1">
       <h2 className="text-lg md:text-2xl font-black text-green-400 tracking-tighter uppercase leading-none mb-4">Asistencia</h2>
    
       <div className="flex flex-wrap items-center gap-4">
      
        {/* SELECTOR DE AULA (Grado y Sección) */}
         <div className="relative">
           <select 
             value={`${grado.toString().replace('°', '')}° ${seccion}`}
              onChange={(e) => {
                const partes = e.target.value.split(' ');
                const soloNumero = partes[0].replace('°', '');
                setGrado(soloNumero);
                setSeccion(partes[1]);
                }}
               className="pl-5 pr-10 py-2 bg-green-50 text-gray-600 font-bold rounded-full border-none shadow-md appearance-none cursor-pointer hover:bg-green-100 transition-all text-[10px] md:text-[11px]"
               >
             {opcionesPermitidas.grados.map(g => (
            <option key={g} value={g}>{g}</option>
           ))}
         </select>
         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
             </div>
              </div>     
  
             {/* SELECTOR DE ÁREA */}
            <div className="relative">
             <select 
             disabled={Number(perfilUsuario?.rol_id) === 6} 
             value={areaSeleccionada}
             onChange={(e) => setAreaSeleccionada(e.target.value)}
            className="appearance-none bg-green-50 border-slate-100 text-green-700 text-[10px] font-bold pl-3 pr-8 py-2 rounded-xl outline-none focus:ring-2 focus:ring-green-500 transition-all w-full disabled:bg-gray-100 disabled:cursor-not-allowed">
           {opcionesPermitidas.areas.length > 0 ? (
           opcionesPermitidas.areas.map((area, index) => (
           <option key={`${area}-${index}`} value={area}>
           {area}
           </option>
           ))
            ) : (
            <option value="">Selccione Área</option>
              )}
              </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                 </svg>
                </div>
               </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full lg:w-auto justify-end">
          <button onClick={exportarExcel} className="p-2.5 text-green-600 bg-white border border-gray-100 rounded-xl hover:bg-green-50 shadow-sm transition-all active:scale-95">
          <FileSpreadsheet size={18} />
          </button>
            <button onClick={exportarPDF} className="p-2.5 text-red-600 bg-white border border-gray-100 rounded-xl hover:bg-red-50 shadow-sm transition-all active:scale-95">
             <FileText size={18} />
              </button>
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
        </div>
        {/* TABLA CON MARCO Y FILAS COMPACTAS */}
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
           {estudiantes.map((est, index) => (
           <tr key={est.dni_estudiante || index} className="hover:bg-slate-50 transition-colors">
              <td className="border border-gray-300 px-3 py-1.5 text-center text-[11px] font-bold text-emerald-600 bg-emerald-100/60">
                {index + 1}
              </td>
              <td className="border border-gray-300 px-4 py-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-tight block">
                  {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
                </span>
              </td>
              <td className="border border-gray-300 px-2 py-1.5 bg-emerald-100/60">
              <div className="flex justify-center gap-1">
               {['P', 'F', 'T', 'J'].map((letra) => {
                const valorReal = letra === 'P' ? 'Presente' : 
                     letra === 'F' ? 'Falta' : 
                     letra === 'T' ? 'Tardanza' : 'Justificado';
                   // IMPORTANTE: Asegurar que el DNI sea string para comparar correctamente
                   const estadoActual = asistencia[String(est.dni_estudiante)] || 'Presente';
                   const isActive = estadoActual === valorReal;

                        const stylesBase = {
                              'P': 'text-slate-600 border-slate-200 hover:bg-slate-100',
                              'F': 'text-red-400 border-red-100 hover:bg-red-50',
                              'T': 'text-amber-400 border-amber-100 hover:bg-amber-50',
                              'J': 'text-green-400 border-green-100 hover:bg-green-50',
                            };

                       const activeStyles = {
                              'P': '!bg-slate-600 !text-white !border-slate-700 shadow-md',
                              'F': '!bg-red-500 !text-white !border-red-600 shadow-md',
                              'T': '!bg-amber-500 !text-white !border-amber-600 shadow-md',
                              'J': '!bg-green-600 !text-white !border-green-700 shadow-md',
                            };

                        return (
                          <button
                           key={`${est.dni_estudiante}-${letra}`} 
                           disabled={perfilUsuario?.rol_id === 6}
                           onClick={() => manejarCambioAsistencia(est.dni_estudiante, valorReal)}
                           className={`w-8 h-8 rounded-md border text-[11px] font-black transition-all duration-200 ${
                           isActive ? activeStyles[letra] : `bg-white ${stylesBase[letra]}`}`}>
                        {letra}
                      </button>
                     );
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {/* FOOTER RESPONSIVO - Mantenido intacto */}
    <div className="p-6 md:p-8 bg-slate-50 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-2 text-slate-400 order-2 sm:order-1">
        <Users size={16} />
         <p className="text-[10px] font-black uppercase tracking-widest">{estudiantes.length} Alumnos en lista</p>
          </div>
           <button
           onClick={guardarAsistenciaTotal}
           disabled={isSaving}
           className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-2xl md:rounded-[2rem] font-black text-xs flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-30 order-1 sm:order-2"
           >
           {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
           GUARDAR {areaSeleccionada}
         </button>
       </div>
      </div>
     );
   };
  
  export default AsistenciaAlumnos;