import React, { useState, useEffect, useCallback } from 'react';
import { Download, Users, FileCheck, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

const ResumenEstadistico = ({ 
  estudiantes = [], 
  asistencia = [],
  trasladados = [], 
  fechaConsulta, 
  onExport 
}) => {
  const fechaHoyISO = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Lima' });
  const hoy = new Date();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoyISO);
  const fKey = fechaSeleccionada;
  const superClean = (val) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();
  const fechaHoyStr = new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-PE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Lima'
  }).toUpperCase();

  const [datosResumen, setDatosResumen] = useState([]);
  const [loading, setLoading] = useState(true);

  const generarDatosSecciones = useCallback(() => {
  const seccionesConfig = [
     { id: 1, turno: 'MAÑANA', sec: '1 A' }, { id: 2, turno: 'MAÑANA', sec: '1 B' },
     { id: 3, turno: 'MAÑANA', sec: '1 C' }, { id: 4, turno: 'MAÑANA', sec: '2 A' },
     { id: 5, turno: 'MAÑANA', sec: '2 B' }, { id: 6, turno: 'MAÑANA', sec: '2 C' },
     { id: 7, turno: 'TARDE', sec: '3 A' }, { id: 8, turno: 'TARDE', sec: '3 B' },
     { id: 9, turno: 'TARDE', sec: '4 A' }, { id: 10, turno: 'TARDE', sec: '4 B' },
     { id: 11, turno: 'TARDE', sec: '5 A' }, { id: 12, turno: 'TARDE', sec: '5 B' },
   ];

   // Función de limpieza ultra-agresiva
   const superClean = (val) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().trim();

   return seccionesConfig.map(s => {
    // 1. Filtrar estudiantes de la sección
    const todosEnSeccion = estudiantes?.filter(e => {
      const dbSec = superClean(e.grado_seccion || `${e.grado}${e.seccion}`);
      return dbSec === superClean(s.sec);
    }) || [];

    const trasladosSec = todosEnSeccion.filter(e => 
      ['Trasladado', 'Retirado'].includes(e.estado_estudiante)
    ).length;

    const matriculadosSec = todosEnSeccion.length;
    const enAula = matriculadosSec - trasladosSec;

    // 2. CONTEO DE ASISTENCIA (Punto de falla)
   const asistenciasHoy = todosEnSeccion.filter(e => {
   if (!Array.isArray(asistencia)) return false;

   return asistencia.some(a => {
    const dniMatch = String(e.dni_estudiante).trim() === String(a.dni_estudiante).trim();
    
    // Simplificamos el match de fecha para evitar errores de formato ISO
    const fechaDB = String(a.fecha || "").split('T')[0];
    const fechaMatch = fechaDB === fKey;

    // Si tu tabla de asistencia tiene 'grado' y 'seccion' separados:
    const seccionDB = superClean(`${a.grado}${a.seccion}`);
    const seccionMatch = seccionDB === superClean(s.sec);

       return dniMatch && fechaMatch && seccionMatch && a.estado === 'P';
     });
    }).length;

      return { ...s, matriculadosSec, trasladosSec, enAula, asistenciasHoy };
    });
   }, [estudiantes, asistencia, trasladados, fKey]);

  const totalMatriculados = datosResumen.reduce((acc, curr) => acc + curr.matriculadosSec, 0);
  const totalEnAula = datosResumen.reduce((acc, curr) => acc + curr.enAula, 0);
  const totalAsistencias = datosResumen.reduce((acc, curr) => acc + curr.asistenciasHoy, 0);
  const totalFaltas = totalEnAula - totalAsistencias;

  useEffect(() => {
     setLoading(true); 
     const data = generarDatosSecciones();
     setDatosResumen(data);
     setLoading(false);
  }, [generarDatosSecciones]);

 const handleExportResumen = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumen de Asistencia');
 
  // 1. COLUMNAS (Anchos profesionales ajustados al diseño)
  worksheet.columns = [
    { width: 5 },  // A: N°
    { width: 12 }, // B: TURNO
    { width: 12 }, // C: SECCIÓN
    { width: 22 }, // D: ESTUDIANTES MATRICULADOS
    { width: 22 }, // E: TRASLADADOS SIAGIE
    { width: 22 }, // F: ESTUDIANTES EN AULA
    { width: 25 }  // G: FECHA (ASISTENCIA)
  ];

  // 2. TÍTULO (B2:G2)
  worksheet.mergeCells('B2:G2');
  const title = worksheet.getCell('B2');
  title.value = 'ASISTENCIA NIVEL SECUNDARIA 2026';
  title.font = { name: 'Arial Black', size: 18, bold: true, underline: true };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  
  const headerRow = worksheet.getRow(4);
  headerRow.values = ['N°', 'TURNO', 'SECCIÓN', 'ESTUDIANTES MATRICULADOS', 'TRASLADADOS SIAGIE', 'ESTUDIANTES EN AULA', fechaHoyStr];
  headerRow.height = 35;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008000' } }; // Verde oscuro
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // 4. CONFIGURACIÓN DE SECCIONES (Maestra)
  const seccionesConfig = [
    { n: 1, turno: 'MAÑANA', grado: '1°', seccion: 'A' }, { n: 2, turno: 'MAÑANA', grado: '1°', seccion: 'B' },
    { n: 3, turno: 'MAÑANA', grado: '1°', seccion: 'C' }, { n: 4, turno: 'MAÑANA', grado: '2°', seccion: 'A' },
    { n: 5, turno: 'MAÑANA', grado: '2°', seccion: 'B' }, { n: 6, turno: 'MAÑANA', grado: '2°', seccion: 'C' },
    { n: 7, turno: 'TARDE', grado: '3°', seccion: 'A' }, { n: 8, turno: 'TARDE', grado: '3°', seccion: 'B' },
    { n: 9, turno: 'TARDE', grado: '4°', seccion: 'A' }, { n: 10, turno: 'TARDE', grado: '4°', seccion: 'B' },
    { n: 11, turno: 'TARDE', grado: '5°', seccion: 'A' }, { n: 12, turno: 'TARDE', grado: '5°', seccion: 'B' }
  ];

  let mTotalAula = 0, mTotalAsis = 0, tTotalAula = 0, tTotalAsis = 0;
  let tMat = 0, tTras = 0, tAula = 0, tAsis = 0;

  seccionesConfig.forEach((item, index) => {
   const rowNum = 5 + index;
   const row = worksheet.getRow(rowNum);

  const dataSeccion = datosResumen.find(d => 
      superClean(d.sec) === superClean(`${item.grado}${item.seccion}`)
    ) || { matriculadosSec: 0, trasladosSec: 0, enAula: 0, asistenciasHoy: 0 };

  // 2. Asignamos valores a la fila
  row.values = [
    item.n, 
    item.turno, 
    `${item.grado} ${item.seccion}`, // Columna C
    dataSeccion.matriculadosSec,     // Columna D (Frontend: 35, 34...)
    dataSeccion.trasladosSec,       // Columna E (Frontend: 0, 1...)
    dataSeccion.enAula,             // Columna F (Frontend: 35, 33...)
    dataSeccion.asistenciasHoy      // Columna G (Frontend: 54, 27...)
  ];

  // 3. Aplicamos estilos (Aquí es donde fallaba por las variables no definidas)
  row.eachCell((cell, colNum) => {
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };

    if (colNum === 1) { // N°
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDEBF7' } }; 
      cell.font = { bold: true };
    } 
    else if (colNum === 3) { // SECCIÓN
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    }
    else if (colNum === 7) {
      const faltas = dataSeccion.enAula - dataSeccion.asistenciasHoy;
      if (faltas >= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF176' } };
        cell.font = { color: { argb: 'FF000000' }, bold: true };
      }
    }
   });

    // Acumuladores para totales
   tMat += dataSeccion.matriculadosSec; 
   tTras += dataSeccion.trasladosSec; 
   tAula += dataSeccion.enAula; 
   tAsis += dataSeccion.asistenciasHoy;

  if (item.turno === 'MAÑANA') { 
     mTotalAula += dataSeccion.enAula; 
     mTotalAsis += dataSeccion.asistenciasHoy; 
   } else { 
     tTotalAula += dataSeccion.enAula; 
     tTotalAsis += dataSeccion.asistenciasHoy; 
   }
  });

  // 5. MERGE TURNO (Fijo según tu estructura de 12 filas)
  worksheet.mergeCells('B5:B10'); // Mañana (1° a 2°)
  worksheet.mergeCells('B11:B16'); // Tarde (3° a 5°)

  // 6. FILA TOTAL (Fila 17)
  const totalRowIndex = 17;
  worksheet.mergeCells(`A${totalRowIndex}:C${totalRowIndex}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'TOTAL';
  
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.getCell(4).value = tMat;
  totalRow.getCell(5).value = tTras;
  totalRow.getCell(6).value = tAula;
  totalRow.getCell(7).value = tAsis;

  totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
    if (colNum <= 7) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFBF00' } }; // Ambar
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }
  });

  // 7. CUADROS RESUMEN INFERIORES
  // Mañana (Fila 19)
  worksheet.mergeCells('D19:E19');
  worksheet.getCell('D19').value = 'Turno Mañana';
  worksheet.getCell('F19').value = mTotalAula;
  worksheet.getCell('G19').value = mTotalAsis;

  ['D19', 'F19', 'G19'].forEach(ref => {
    const cell = worksheet.getCell(ref);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FF00' } }; // Verde Neón
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // Tarde (Fila 20)
  worksheet.mergeCells('D20:E20');
  worksheet.getCell('D20').value = 'Turno Tarde';
  worksheet.getCell('F20').value = tTotalAula;
  worksheet.getCell('G20').value = tTotalAsis;

  ['D20', 'F20', 'G20'].forEach(ref => {
    const cell = worksheet.getCell(ref);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB7DEE8' } }; // Azul Claro
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // 8. EXPORTAR
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Resumen_Asistencia_Final_2026.xlsx`);
  };

  if (loading) return (
    <div className="p-10 text-center font-bold flex flex-col items-center gap-2">
      <Loader2 className="animate-spin text-green-600" size={40} />
      Sincronizando con base de datos real...
    </div>
  );

  const opcionesFecha = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const fechaTextoLegible = new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-PE', opcionesFecha);

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
      {/* CABECERA DINÁMICA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">RESUMEN ESTADÍSTICO</h1>
          <div className="flex flex-col md:flex-row gap-4 mb-2 items-center justify-between w-full">
           {/* ÚNICO SELECTOR CON BRANDING */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-300 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-tight">
          <span className="text-[#007BFF]">SIGESCOM</span>
          <span className="text-[#22c55e]"> 2079</span>
          <span className="text-slate-700"> | FECHA:</span>
          </span>
       <input 
      type="date" 
      value={fechaSeleccionada}
      onChange={(e) => setFechaSeleccionada(e.target.value)}
      className="outline-none text-blue-600 font-bold text-sm bg-transparent cursor-pointer"/>
    </div>
    </div>
    </div>
    <button 
    onClick={handleExportResumen}
    className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
    {/* Asegúrate de tener Lucide React o cambiar el icono por un <span> */}
     <span className="font-bold">📥 EXPORTAR RESUMEN EXCEL</span>
     </button>
      </div>
      {/* TARJETAS DE ESTADO (Compactas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        <StatCard title="MATRÍCULA TOTAL" value={totalMatriculados} icon={<Users />} color="bg-slate-800" border="border-blue-400" />
        <StatCard title="ASISTENCIAS" value={totalAsistencias} icon={<FileCheck />} color="bg-emerald-600" border="border-green-300" />
        <StatCard title="FALTAS" value={totalFaltas} icon={<AlertTriangle />} color="bg-rose-600" border="border-red-300" />
        <StatCard title="% ASISTENCIA" value={`${totalEnAula > 0 ? ((totalAsistencias/totalEnAula)*100).toFixed(1) : 0}%`} icon={<TrendingUp />} color="bg-blue-600" border="border-blue-300" />
      </div>
      {/* TABLA MAESTRA AJUSTADA */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="mt-0 shadow-lg rounded-xl overflow-x-auto">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead className="bg-[#008000] text-white uppercase font-black tracking-tighter">
              <tr>
                <th className="p-2 border border-green-800 w-10">N°</th>
                <th className="p-2 border border-green-800">TURNO</th>
                <th className="p-2 border border-green-800 bg-[#fbbf24] text-black">SECCIÓN</th>
                <th className="p-2 border border-green-800">MATRICULADOS</th>
                <th className="p-2 border border-green-800">TRASLADADOS</th>
                <th className="p-2 border border-green-800 bg-[#fbbf24] text-black">EN AULA</th>
                <th className="p-2 border border-green-800 bg-blue-50 text-blue-900 italic font-black">{fechaHoyStr}</th>
              </tr>
            </thead>
            <tbody className="font-bold text-slate-700">
              {datosResumen.map((s, index) => {
                const faltas = s.enAula - s.asistenciasHoy;

                const esFinTurnoMañana = index === 5;
                
                // Lógica de Semáforo Quirúrgica
                let colorClase = "bg-[#FFF176] text-gray-900"; // Amarillo Intermedio (0 faltas)
                let extraClase = "";

                if (faltas === 1) colorClase = "bg-[#FFBF00] text-gray-900"; // Ámbar
                else if (faltas === 2) colorClase = "bg-[#FF8C00] text-white"; // Naranja
                else if (faltas >= 3) {
                  colorClase = "bg-yellow-300/50 text-slate-600";
                }

                return (
                  <tr key={index} className={`hover:bg-slate-50 transition-colors ${esFinTurnoMañana ? 'border-b-2 border-slate-500' : 'border-b border-slate-200'}`}>
                    <td className="p-1 border bg-slate-50 text-slate-400 text-[10px] font-medium">{index + 1}</td>
                    {/* Manteniendo lógica de rowSpan intacta para diseño original */}
                    {index === 0 && (
                      <td rowSpan={6} className="p-2 border font-black bg-white text-blue-700 border-r-2 uppercase [writing-mode:vertical-lr] rotate-180">
                        Mañana
                      </td>
                    )}
                    {index === 6 && (
                      <td rowSpan={6} className="p-2 border font-black bg-white text-blue-700 border-r-2 uppercase [writing-mode:vertical-lr] rotate-180">
                        Tarde
                      </td>
                    )}
                    <td className="p-1.5 border bg-[#C6EFCE] text-green-800 font-black">{s.sec}</td>
                    <td className="p-1.5 border group-hover:bg-white">{s.matriculadosSec}</td>
                    <td className="p-1.5 border text-red-500 group-hover:bg-white">{s.trasladosSec}</td>
                    <td className="p-1.5 border font-black bg-slate-50/50">{s.enAula}</td>
                    
                    {/* Columna de Asistencia con Semáforo Dinámico */}
                    <td className={`p-1.5 border font-black text-xs transition-all duration-300 ${colorClase} ${extraClase}`}>
                      {s.asistenciasHoy}
                    </td>
                  </tr>
                );
              })}

              {/* FILA TOTAL (Resaltada) */}
              <tr className="bg-[#fbbf24] font-black text-black text-xs uppercase shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
               <td colSpan={3} className="p-3 border text-right pr-6 tracking-widest">TOTAL GENERAL</td>
                <td className="p-3 border">{totalMatriculados}</td>
                  {/* CAMBIA EL 0 POR LA VARIABLE CALCULADA ABAJO */}
                  <td className="p-3 border">
                  {datosResumen.reduce((acc, curr) => acc + curr.trasladosSec, 0)}
                  </td>
                  <td className="p-3 border underline decoration-2">{totalEnAula}</td>
                  <td className="p-3 border bg-[#f97316] text-white text-sm shadow-inner">
                  {totalAsistencias}
                 </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Sub-componente StatCard con bordes estilizados
const StatCard = ({ title, value, icon, color, border }) => (
  <div className={`${color} p-4 rounded-2xl shadow-lg text-white flex items-center justify-between border-b-4 ${border} transform hover:scale-[1.02] transition-transform`}>
    <div>
      <p className="text-[10px] font-black opacity-70 uppercase tracking-tighter">{title}</p>
      <p className="text-2xl font-black leading-none">{value}</p>
    </div>
    <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
      {React.cloneElement(icon, { size: 20 })}
    </div>
  </div>
);

export default ResumenEstadistico;