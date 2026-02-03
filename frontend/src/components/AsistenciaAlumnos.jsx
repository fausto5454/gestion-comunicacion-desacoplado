import React, { useState, useEffect } from 'react';
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
        .from('asistencia')
        .select('id_auxiliar, estado')
        .eq('fecha', fecha)
        .eq('area', areaSeleccionada)
        .in('id_auxiliar', idsMatricula);

      if (error) throw error;
      if (data && data.length > 0) {
        const guardada = { ...init };
        data.forEach(reg => { guardada[reg.id_auxiliar] = reg.estado; });
        setAsistencia(guardada);
      } else {
        setAsistencia(init);
      }
    } catch (e) {
      setAsistencia(init);
    }
  };

 const fetchNomina = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matriculas')
        .select('*')
        .eq('grado', parseInt(grado)) // Uso del estado local
        .eq('seccion', seccion.trim()) // Uso del estado local
        .eq('anio_lectivo', 2026)
        .eq('estado_estudiante', 'Activo')
        .order('apellido_paterno', { ascending: true });

      if (error) throw error;
      if (data) {
        setEstudiantes(data);
        const init = {};
        data.forEach(est => init[est.id_matricula] = 'Presente');
        await fetchAsistenciaExistente(data, init);
      }
    } catch (err) {
      toast.error("Error al cargar nómina");
    } finally {
      setLoading(false);
    }
  };

  // El efecto se dispara cada vez que cambies el grado o la sección en el select
  useEffect(() => {
    if (grado && seccion) fetchNomina();
  }, [grado, seccion, fecha, areaSeleccionada]);

  const exportarExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asistencia');

  // 1. Título con Formato (Tamaño 14, Negrita)
  worksheet.mergeCells('B3:F3'); // Ajustado según tu imagen
  const titleCell = worksheet.getCell('B3');
  titleCell.value = 'REGISTRO DE ASISTENCIA DE ESTUDIANTES';
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // 2. Cabecera de Datos (Tamaño 10)
  worksheet.getCell('B5').value = `ÁREA: ${areaSeleccionada}`;
  worksheet.getCell('D5').value = `FECHA: ${fecha}`;
  worksheet.getCell('F5').value = `GRADO: ${grado}° ${seccion}`;
  
  const presentes = Object.values(asistencia).filter(v => v === 'Presente').length;
  const ausentes = Object.values(asistencia).filter(v => v === 'Ausente').length;
  worksheet.getCell('B6').value = `RESUMEN: Total: ${estudiantes.length}   Presentes: ${presentes}   Ausentes: ${ausentes}`;

  // Estilo para filas de información
  ['B5', 'D5', 'B6'].forEach(ref => {
    worksheet.getCell(ref).font = { size: 10, bold: true };
  });

  // 3. Encabezados de la Tabla (Fila 8)
  const headerRow = worksheet.getRow(8);
  headerRow.values = [null, 'N°', 'ESTUDIANTE', 'ESTADO', 'ÁREA', 'FECHA']; // El null es para la columna A vacía
  
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } };
      cell.font = { size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }
  });

  // 4. Datos de Estudiantes
  estudiantes.forEach((est, i) => {
    const row = worksheet.addRow([
      null,
      i + 1,
      `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`,
      asistencia[est.id_matricula] || 'Presente',
      areaSeleccionada,
      fecha
    ]);

    row.eachCell((cell, colNumber) => {
      if (colNumber > 1) {
        cell.font = { size: 10 };
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        
        // Centrar todas las columnas excepto "Estudiante"
        cell.alignment = colNumber === 3 ? { horizontal: 'left' } : { horizontal: 'center' };
      }
    });
  });

  // 5. Anchos de columna
  worksheet.getColumn(2).width = 6;  // N°
  worksheet.getColumn(3).width = 45; // Estudiante
  worksheet.getColumn(4).width = 15; // Estado
  worksheet.getColumn(5).width = 30; // Área
  worksheet.getColumn(6).width = 15; // Fecha

 // 6. Descarga del archivo
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Asistencia_${areaSeleccionada}_${grado}${seccion}.xlsx`);
  
  toast.success("Excel profesional generado con éxito");
};

  const exportarPDF = () => {
  const doc = new jsPDF();
  const total = estudiantes.length;
  const presentes = Object.values(asistencia).filter(v => v === 'Presente').length;
  const ausentes = Object.values(asistencia).filter(v => v === 'Ausente').length;

  // --- CABECERA ESTILO EXCEL ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REGISTRO DE ASISTENCIA DE ESTUDIANTES", 105, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`ÁREA: ${areaSeleccionada}`, 14, 25);
  doc.text(`FECHA: ${fecha}`, 80, 25);
  doc.text(`GRADO Y SECCIÓN: ${grado}° "${seccion}"`, 140, 25);

  // Fila de resumen
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 30, 182, 8, 'F');
  doc.setTextColor(0);
  doc.text(`RESUMEN: Total: ${total} | Presentes: ${presentes} | Ausentes: ${ausentes}`, 16, 35);

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
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const records = estudiantes.map(est => ({
        id_auxiliar: est.id_matricula,
        fecha: fecha,
        area: areaSeleccionada,
        estado: asistencia[est.id_matricula],
        id_usuario: user?.id 
      }));
      const { error } = await supabase.from('asistencia').upsert(records, { onConflict: 'id_auxiliar, fecha, area' });
      if (error) throw error;
      toast.success("Registro actualizado");
    } catch (err) {
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2rem]">
      <Loader2 className="animate-spin text-green-600 mb-4" size={40} />
      <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Sincronizando nómina...</p>
    </div>
  );

  return (
    <div className="bg-emerald-900 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 md:p-8 bg-slate-50/80 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-3 md:gap-5 w-full lg:w-auto">
          <div className="hidden sm:block bg-slate-900 p-4 rounded-3xl text-white shadow-lg">
            <Bookmark size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg md:text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none mb-2">Asistencia</h2>
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
        <table className="w-full border-collapse border border-gray-300 min-w-[450px]">
          <thead>
            <tr className="bg-gray-500">
              <th className="border border-gray-300 px-3 py-2 text-left text-[10px] font-black text-green-400 bg-emerald-800 uppercase w-10">N°</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-[10px] font-black text-green-400 uppercase tracking-wider">Apellidos y Nombres</th>
              <th className="border border-gray-300 px-2 py-2 text-center text-[10px] font-black text-green-400 bg-emerald-800 uppercase w-40">Estado</th>
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
      
                // Configuración de colores solo para el TEXTO y el BORDE cuando está activo
                 const activeStyle = {
                   'P': 'text-slate-900 border-slate-900 bg-slate-50', // Negro
                   'A': 'text-red-600 border-red-600 bg-red-50',     // Rojo
                   'T': 'text-amber-500 border-amber-500 bg-amber-50', // Amber
                   'J': 'text-green-600 border-green-600 bg-green-50'  // Verde
                 };

               return (
               <button
                key={letra}
                 onClick={() => setAsistencia(p => ({...p, [est.id_matricula]: valorReal}))}
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

      {/* FOOTER RESPONSIVO */}
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