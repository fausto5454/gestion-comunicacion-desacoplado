import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { Search, Filter, FileText, FileSpreadsheet, ChevronDown, Menu, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs'; // Asegúrate de tener: npm install exceljs
import { saveAs } from 'file-saver';

const ConsolidadoAsistencia = () => {
  const [datos, setDatos] = useState({});
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estado de filtro fusionado
  const [seleccion, setSeleccion] = useState({ grado: '1', seccion: 'A', mes: new Date().getMonth() + 1 });

  // Opciones de grados y secciones combinadas
  const opcionesGradoSeccion = [
    { g: '1', s: 'A' }, { g: '1', s: 'B' }, { g: '1', s: 'C' },
  { g: '2', s: 'A' }, { g: '2', s: 'B' }, { g: '2', s: 'C' },
  { g: '3', s: 'A' }, { g: '3', s: 'B' },
  { g: '4', s: 'A' }, { g: '4', s: 'B' },
  { g: '5', s: 'A' }, { g: '5', s: 'B' },
  ];

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

  // ✅ Mejora 1: Generar días con nombre dinámico y corrección de zona horaria
  const diasDelMes = useMemo(() => {
  const anio = 2026;
  const numDias = new Date(anio, seleccion.mes, 0).getDate();
  const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  
  return Array.from({ length: numDias }, (_, i) => {
    const diaNum = i + 1;
    // Forzamos las 12:00:00 para evitar errores de zona horaria que cambien el día
    const fecha = new Date(anio, seleccion.mes - 1, diaNum, 12, 0, 0);
    return {
      numero: diaNum,
      nombre: nombresDias[fecha.getDay()]
     };
   });
  }, [seleccion.mes]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: nomina } = await supabase
        .from('matriculas')
        .select('id_matricula, apellido_paterno, apellido_materno, nombres')
        .eq('grado', seleccion.grado)
        .eq('seccion', seleccion.seccion)
        .order('apellido_paterno');

      setEstudiantes(nomina || []);

      const { data: asistencias } = await supabase
        .from('asistencia')
        .select('id_estudiante, fecha, estado')
        .gte('fecha', `2026-${seleccion.mes.toString().padStart(2, '0')}-01`)
        .lte('fecha', `2026-${seleccion.mes.toString().padStart(2, '0')}-31`);

      const mapa = {};
      asistencias?.forEach(a => {
        const dia = new Date(a.fecha + 'T00:00:00').getDate();
        if (!mapa[a.id_estudiante]) mapa[a.id_estudiante] = {};
        mapa[a.id_estudiante][dia] = a.estado[0];
      });
      setDatos(mapa);
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, [seleccion]);

  const filtrados = estudiantes.filter(e => 
    `${e.apellido_paterno} ${e.nombres}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Funciones de Exportación
  const handleExportExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Consolidado');
  
  // 1. Configuración de columnas (Anchos optimizados)
  const totalCols = diasDelMes.length + 3; // N° + Nombres + Días + Faltas
  const ultimaLetra = worksheet.getColumn(totalCols).letter;

  // 2. FILA 1: TÍTULO PRINCIPAL
  worksheet.mergeCells(`A1:${ultimaLetra}1`);
  const titulo = worksheet.getCell('A1');
  titulo.value = 'CONSOLIDADO DE ASISTENCIA MENSUAL - 2026';
  titulo.font = { name: 'Arial Black', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };

  // 3. FILA 2: SUB-ENCABEZADOS DINÁMICOS (ÁREA | GRADO | MES | I.E.)
  const bloque = Math.floor(totalCols / 4);
  const nombreMes = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][seleccion.mes];

  const secciones = [
    { t: `ÁREA: ${seleccion.area}`, s: 1, e: bloque },
    { t: `GRADO/SEC: ${seleccion.grado}° "${seleccion.seccion}"`, s: bloque + 1, e: bloque * 2 },
    { t: `MES: ${nombreMes}`, s: (bloque * 2) + 1, e: bloque * 3 },
    { t: `I.E. N° 2079`, s: (bloque * 3) + 1, e: totalCols }
  ];

  secciones.forEach(sec => {
    worksheet.mergeCells(2, sec.s, 2, sec.e);
    const cell = worksheet.getCell(2, sec.s);
    cell.value = sec.t;
    cell.font = { name: 'Arial', size: 9, bold: true }; // Tamaño 9 para ahorrar espacio
    cell.alignment = { horizontal: 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { bottom: { style: 'thin' } };
  });

  // 4. FILA 4: ENCABEZADOS DE TABLA
 const rowDiasNombre = worksheet.getRow(4);
  rowDiasNombre.values = ["", "", ...diasDelMes.map(d => d.nombre.charAt(0))]; 
  
  rowDiasNombre.eachCell((cell, colNum) => {
    if (colNum > 2) {
      const letraDia = cell.value;
      const esFinDeSemana = (letraDia === 'S' || letraDia === 'D');
      
      cell.font = { 
        name: 'Arial', 
        size: 7, 
        bold: true, 
        color: { argb: esFinDeSemana ? 'FFFF0000' : 'FF64748B' } // Rojo si es S o D
      };
      cell.alignment = { horizontal: 'center' };
    }
  });

  // 5. FILA 5: ENCABEZADOS DE NÚMEROS (1, 2, 3...)
  const headerRow = worksheet.getRow(5);
  headerRow.values = ["N°", "APELLIDOS Y NOMBRES", ...diasDelMes.map(d => d.numero), "FALTAS"];
  
  headerRow.eachCell((cell, colNum) => {
    // Detectar si la columna actual corresponde a un Sábado o Domingo
    const diaInfo = colNum > 2 && colNum <= (diasDelMes.length + 2) ? diasDelMes[colNum - 3] : null;
    const esFinDeSemana = diaInfo && (diaInfo.nombre.charAt(0) === 'S' || diaInfo.nombre.charAt(0) === 'D');

    cell.font = { 
      name: 'Arial', 
      size: 9, 
      bold: true, 
      color: { argb: esFinDeSemana ? 'FFFF0000' : 'FFFFFFFF' } // Texto rojo en S/D
    };
    
    cell.fill = { 
      type: 'pattern', 
      pattern: 'solid', 
      fgColor: { argb: 'FF1E2948' } 
    };
    
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { outline: { style: 'thin', color: { argb: 'FF334155' } } };
    // Ajuste de anchos
    if (colNum === 1) worksheet.getColumn(colNum).width = 5; // N°
    if (colNum === 2) worksheet.getColumn(colNum).width = 40; // Estudiante
    if (colNum > 2 && colNum < totalCols) worksheet.getColumn(colNum).width = 3.5; // Días compactos
  });

  // 6. LLENADO DE DATOS (A partir de la fila 6)
  filtrados.forEach((est, index) => {
    let faltas = 0;
    const filaAsistencia = diasDelMes.map(d => {
      const valor = datos[est.id_matricula]?.[d.numero] || '-';
      if(valor === 'A') faltas++;
      return valor;
    });

    const row = worksheet.addRow([index + 1, `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`, ...filaAsistencia, faltas]);
    
    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
      
      // CENTRADO DE N° Y ASISTENCIA
      if (colNum === 1 || colNum > 2) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

   // Descarga del archivo
   const buffer = await workbook.xlsx.writeBuffer();
   saveAs(new Blob([buffer]), `Asistencia_${seleccion.area}_${seleccion.grado}${seleccion.seccion}.xlsx`);
 };

 return (
  <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
    {/* TÍTULO */}
    <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">
          Consolidado de Asistencia - {seleccion.grado}° {seleccion.seccion}
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Registro Auxiliar 2026</p>
      </div>
      <button onClick={handleExportExcel} className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">
        <FileSpreadsheet size={14} /> Exportar Excel
      </button>
    </div>
    {/* FILTROS INTEGRADOS */}
    <div className="bg-emerald-700 p-4 rounded-[2rem] shadow-lg mb-6 flex flex-col lg:flex-row gap-4 items-center">
      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
        {/* GRADO/SEC */}
        <div className="flex-1 min-w-[120px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
          <Filter size={14} className="text-emerald-600" />
          <select className="bg-transparent font-black text-slate-700 outline-none text-[11px] uppercase w-full" 
            value={`${seleccion.grado}-${seleccion.seccion}`} 
            onChange={(e) => { const [g, s] = e.target.value.split('-'); setSeleccion({...seleccion, grado: g, seccion: s}); }}>
            {opcionesGradoSeccion.map(opt => <option key={`${opt.g}${opt.s}`} value={`${opt.g}-${opt.s}`}>{opt.g}° {opt.s}</option>)}
          </select>
        </div>
        {/* ÁREA */}
        <div className="flex-1 min-w-[150px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
          <Menu size={14} className="text-emerald-600" />
          <select className="bg-transparent font-black text-slate-700 outline-none text-[11px] uppercase w-full" 
            value={seleccion.area} onChange={(e) => setSeleccion({...seleccion, area: e.target.value})}>
            {Object.keys(areasConfig).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {/* MES */}
        <select className="flex-1 min-w-[100px] bg-slate-100 px-3 py-2 rounded-2xl border font-black text-[11px] uppercase outline-none" 
          value={seleccion.mes} onChange={(e) => setSeleccion({...seleccion, mes: parseInt(e.target.value)})}>
          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
      </div>
      {/* BÚSQUEDA */}
      <div className="relative w-full lg:flex-1 lg:max-w-xs">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input type="text" placeholder="BUSCAR ESTUDIANTE..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl text-[11px] font-bold uppercase outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
    </div>
   {/* Contenedor con scroll horizontal controlado */}
  <div className="bg-white rounded-[1rem] shadow-xl border border-gray-300 overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-max md:w-full border-collapse borde-r table-fixed">
    <thead>
    <tr className="bg-slate-900 text-white">
    {/* N°: Siempre fijo, con ancho generoso en escritorio */}
    <th className="sticky left-0 top-0 z-50 w-[40px] md:w-[40px] bg-emerald-700 py-3 text-[10px] md:text-[11px] font-black border-r border-emerald-800 text-center uppercase tracking-wider">
      N°
      </th>
      {/* ESTUDIANTE: En escritorio le damos un padding izquierdo (pl-4) para separarlo del N° */}
      <th className="bg-slate-900 py-3 px-2 md:pl-10 text-left border-r border-slate-800 w-[70px] md:w-[250px] text-[8px] md:text-[11px] font-black uppercase tracking-wider">
      Apellidos y Nombres
    </th>
   {diasDelMes.map(dia => {
    const esFinde = dia.nombre === "Sáb" || dia.nombre === "Dom";
      return (
       <th key={dia.numero} 
         className={`py-1 border-r border-slate-800 min-w-[35px] md:min-w-[50px] text-center transition-colors
          ${esFinde ? 'bg-emerald-900' : 'bg-emerald-900'}`}>
          <div className="flex flex-col leading-none">
            <span className={`text-[7px] font-bold uppercase ${esFinde ? 'text-red-500' : 'text-slate-400'}`}>
             {dia.nombre}
            </span>
           <span className="text-[10px] font-bold text-white">{dia.numero}</span>
         </div>
        </th>
       );
     })}
    {/* FALTAS: Fija a la derecha */}
    <th className="sticky right-0 top-0 z-40 bg-red-600 py-2 text-[8px] md:text-[10px] font-black w-[50px] md:w-[45px] text-center border-l border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0)]">
    FALTAS
    </th>
   </tr>
  </thead>
  <tbody className="divide-y divide-slate-100 bg-white">
  {filtrados.map((est, index) => {
    let totalFaltas = 0;
      return (
       <tr key={est.id_matricula} className="hover:bg-slate-50 transition-colors group">
        {/* N° ORDEN: Fondo sólido y texto centrado */}
         <td className="sticky left-0 z-30 bg-emerald-100 py-1 text-center text-[8px] md:text-[12px] font-bold text-emerald-600 border-r border-slate-300">
           {(index + 1).toString().padStart(2, '0')}
            </td>
             {/* NOMBRE: Ajuste de padding en escritorio (md:px-3) para vista profesional */}
            <td className="bg-white py-1 px-3 md:px-3 text-[8px] md:text-[10px] font-semibold text-slate-700 border-r border-slate-300/80 uppercase w-[120px] md:w-[320px]">
           {est.apellido_paterno} {est.apellido_materno} {est.nombres}
          </td>
        {/* CELDAS DE ASISTENCIA (Se desplazan por debajo en móvil) */}
        {diasDelMes.map(dia => {
          const res = datos[est.id_matricula]?.[dia.numero] || '-';
           if (res === 'A') totalFaltas++;
            return (
             <td key={dia.numero} className="text-center py-2 text-[11px] border-r border-slate-300/80 bg-white text-slate-400">
              {res}
               </td>
                );
                 })}
                 {/* FALTAS: Fija a la derecha con alerta roja */}
                 <td className={`sticky right-0 z-30 py-1 text-center font-black text-[8px] md:text-[13px] border-l border-slate-200 shadow-[-4px_0_8px_rgba(0,0,0,0)]
                ${totalFaltas > 3 ? 'bg-red-600 text-white' : 'bg-red-100 text-slate-500'}`}>
               {totalFaltas}
               </td>
             </tr>
             );
           })}
         </tbody>
        </table>
      </div>
     </div>
   </div>
  );
};

export default ConsolidadoAsistencia;