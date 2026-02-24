import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { 
  Save, FileText, FileSpreadsheet, Loader2, 
  Bookmark, Users, Calendar 
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { generarConsolidadoProfesional } from '../services/asistenciaService';

const areasConfig = {
  "MATEMÁTICA": ["RESUELVE PROBLEMAS DE CANTIDAD", "RESUELVE PROBLEMAS DE REGULARIDAD", "FORMA Y MOVIMIENTO", "GESTIÓN DE DATOS"],
  "COMUNICACIÓN": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"],
  "CIENCIA Y TECNOLOGÍA": ["INDAGA MEDIANTE MÉTODOS", "EXPLICA EL MUNDO FÍSICO", "DISEÑA SOLUCIONES"],
  "PERSONAL SOCIAL": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA", "CONSTRUYE INTERPRETACIONES HISTÓRICAS"],
  "DPCC": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA DEMOCRÁTICAMENTE"],
  "ARTE Y CULTURA": ["APRECIA MANIFESTACIONES", "CREA PROYECTOS"],
  "EDUCACION FÍSICA": ["SE DESENVUELVE DE MANERA AUTÓNOMA", "ASUME UNA VIDA SALUDABLE"],
  "EPT": ["GESTIONA PROYECTOS DE EMPRENDIMIENTO"],
  "RELIGIÓN": ["CONSTRUYE SU IDENTIDAD", "ASUME LA EXPERIENCIA"],
  "INGLÉS": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"]
};

const AsistenciaAlumnos = ({ }) => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [asistencia, setAsistencia] = useState({});
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [areaSeleccionada, setAreaSeleccionada] = useState("MATEMÁTICA");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Estos son los únicos estados oficiales para Grado y Sección
  const [grado, setGrado] = useState("1");
  const [seccion, setSeccion] = useState("A");

  // --- LÓGICA FUNCIONAL (Mantenida estrictamente) ---
  const fetchAsistenciaExistente = async (nomina, init) => {
    try {
      const idsMatricula = nomina.map(n => n.id_matricula);
      const { data, error } = await supabase
        .from('asistencia') // Tabla correcta
        .select('id_estudiante, estado')
        .in('id_estudiante', idsMatricula)
        .eq('fecha', fecha)
        .eq('observaciones', areaSeleccionada);

      if (error) throw error;

      if (data && data.length > 0) {
        const guardada = { ...init };
        data.forEach(reg => {
          guardada[reg.id_estudiante] = reg.estado;
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

  // 3. DECLARAR FUNCIÓN PRINCIPAL (Uso de useCallback para evitar bucles)
  const fetchNomina = useCallback(async () => {
    if (!grado || !seccion) return;
    setLoading(true);

    try {
      // Formateo para evitar Error 400 de Supabase
      const gradoFormateado = grado.includes('°') ? grado : `${grado}°`;

      const { data, error } = await supabase
        .from('matriculas')
        .select('id_matricula, apellido_paterno, apellido_materno, nombres, genero')
        .eq('grado', gradoFormateado)
        .eq('seccion', seccion.trim())
        .eq('anio_lectivo', 2026)
        .eq('estado_estudiante', 'Activo')
        .order('apellido_paterno', { ascending: true });

      if (error) throw error;

      if (data) {
        setEstudiantes(data);
        const init = {};
        data.forEach(est => init[est.id_matricula] = 'Presente');
        
        // Llamada segura: la función ya existe en este punto
        await fetchAsistenciaExistente(data, init);
      }
    } catch (err) {
      console.error("Error en nomina:", err);
      toast.error("Error al cargar la lista de estudiantes");
    } finally {
      setLoading(false);
    }
   }, [grado, seccion, fecha, areaSeleccionada]);

   // 4. EFECTO DISPARADOR (Llamado después de todas las definiciones)
   useEffect(() => {
     fetchNomina();
  }, [fetchNomina]);

  const exportarExcel = async () => {
  // 1. Crear instancia local (ayuda a la velocidad en descargas sucesivas)
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
  const presentes = Object.values(asistencia).filter(v => v === 'Presente').length;
  const ausentes = Object.values(asistencia).filter(v => v === 'Ausente').length;
  const tardanzas = Object.values(asistencia).filter(v => v === 'Tardanza').length;
  const justificadosCount = Object.values(asistencia).filter(v => v === 'Justificado').length;

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
    const estadoActual = asistencia[est.id_matricula] || 'Presente';
    const row = worksheet.addRow([
      null,
      i + 1,
      `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`,
      estadoActual,
      areaSeleccionada,
      fecha
    ]);

    row.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { size: 10 };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = colNumber === 3 ? { horizontal: 'left', indent: 1 } : { horizontal: 'center' };

        if (colNumber === 4) {
          const colores = {
            'Ausente': 'FFFF0000',
            'Justificado': 'FF00B050',
            'Tardanza': 'FFFFC000',
            'Presente': 'FF000000'
          };
          cell.font = { color: { argb: colores[estadoActual] || 'FF000000' }, bold: true };
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
  const presentes = Object.values(asistencia).filter(v => v === 'Presente').length;
  const ausentes = Object.values(asistencia).filter(v => v === 'Ausente').length;
  const tardanzas = Object.values(asistencia).filter(v => v === 'Tardanza').length;
  const justificado = Object.values(asistencia).filter(v => v === 'justificado').length;

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
    body: estudiantes.map((e, i) => [
      i + 1,
      `${e.apellido_paterno} ${e.apellido_materno}, ${e.nombres}`,
      asistencia[e.id_matricula] || 'Presente',
      areaSeleccionada,
      fecha
    ]),
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
        if (estado === 'Ausente') {
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
    const { data: { user } } = await supabase.auth.getUser();
    
    // VALIDACIÓN DE SEGURIDAD: Evitar guardar si no hay sesión
    if (!user) {
      toast.error("Sesión expirada. Por favor, vuelve a iniciar sesión.");
      return;
    }

    // MEJORA: Verificar si ya existen registros para preguntar antes de sobrescribir
    const { data: existente } = await supabase
      .from('asistencia')
      .select('id_asistencia')
      .eq('fecha', fecha)
      .limit(1);

    if (existente && existente.length > 0) {
      const confirmar = window.confirm("Ya existe asistencia para este día. ¿Deseas actualizar los registros?");
      if (!confirmar) return; // Si cancela, salimos de la función
    }

    // Preparación de registros
    const records = estudiantes.map(est => ({
      id_estudiante: est.id_matricula, 
      fecha: fecha,
      estado: asistencia[est.id_matricula] || 'Presente', 
      id_auxiliar: user.id, 
      observaciones: areaSeleccionada // O la columna 'area' según tu tabla
    }));

    // Upsert con restricción de conflicto
    const { error } = await supabase
      .from('asistencia')
      .upsert(records, { 
      onConflict: 'id_estudiante, fecha' // Esta línea evita el desorden de 40 alumnos en 2 días
     });

    if (error) throw error;
    toast.success("¡Asistencia guardada correctamente!");
  } catch (err) {
    console.error("Error capturado:", err);
    // Manejo específico del error de Foreign Key visto en consola
    if (err.code === '23503') {
       toast.error("Error: Algunos IDs de estudiantes no coinciden con la matrícula.");
    } else {
       toast.error("Error al guardar en la base de datos");
    }
  } finally {
    setIsSaving(false);
  }
 };

  return (
    <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 md:p-8 bg-slate-500 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-5 w-full lg:w-auto">
          <div className="hidden sm:block bg-slate-900 p-4 rounded-3xl text-white shadow-lg">
            <Bookmark size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-2xl font-black text-green-400 tracking-tighter uppercase leading-none mb-2">Asistencia</h2>
            <div className="flex flex-wrap gap-2">
                <select 
                 value={areaSeleccionada}
                 onChange={(e) => setAreaSeleccionada(e.target.value)}
                 className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[10px] md:text-[11px] font-black uppercase text-green-600 outline-none shadow-sm"
                >
                 {Object.keys(areasConfig).map(area => <option key={area} value={area}>{area}</option>)}
                </select>

              {/* MEJORA APLICADA AQUÍ: Selector Combinado */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                <span className="text-[9px] font-black text-gray-400 uppercase ml-1">Aula:</span>
                <select 
                  value={`${grado}-${seccion}`} 
                  onChange={(e) => {
                    const [nuevoGrado, nuevaSeccion] = e.target.value.split('-');
                    setGrado(nuevoGrado);
                    setSeccion(nuevaSeccion);
                  }}
                  className="text-[11px] font-black text-slate-700 bg-transparent outline-none cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].flatMap(g => 
                    ['A', 'B', 'C'].map(s => (
                      <option key={`${g}-${s}`} value={`${g}-${s}`}>
                        {g}° {s}
                      </option>
                     ))
                   )}
                </select>
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
              <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-black text-green-400 bg-pink-700 uppercase w-40">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
         {estudiantes.map((est, index) => (
          <tr key={est.id_matricula} className="hover:bg-slate-50 transition-colors">
            <td className="border border-gray-300 px-3 py-1.5 text-center text-[11px] font-bold text-slate-500 bg-emerald-100/60">
              {index + 1}
            </td>
            <td className="border border-gray-300 px-4 py-1.5">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight leading-tight block">
                {est.apellido_paterno} {est.apellido_materno}, {est.nombres}
              </span>
            </td>
            <td className="border border-gray-300 px-2 py-1.5 bg-emerald-100/60">
              <div className="flex justify-center gap-1">
                {['P', 'A', 'T', 'J'].map((letra) => {
                  const valorReal = letra === 'P' ? 'Presente' : letra === 'A' ? 'Ausente' : letra === 'T' ? 'Tardanza' : 'Justificado';
                  const isActive = asistencia[est.id_matricula] === valorReal;

                  const activeStyle = {
                    'P': 'text-slate-900 border-slate-900 bg-slate-50', 
                    'A': 'text-red-600 border-red-600 bg-red-50',     
                    'T': 'text-amber-500 border-amber-500 bg-amber-50', 
                    'J': 'text-green-600 border-green-600 bg-green-50'  
                  };
                  return (
                    <button
                      key={letra}
                      onClick={() => setAsistencia(p => ({ ...p, [est.id_matricula]: valorReal }))}
                      className={`w-7 h-7 md:w-8 md:h-8 rounded-md text-[11px] font-black transition-all duration-200 border
                        ${isActive
                          ? `${activeStyle[letra]} shadow-sm scale-110 z-10`
                          : 'bg-white border-transparent text-gray-300 hover:text-gray-400'
                         }`}
                         >
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