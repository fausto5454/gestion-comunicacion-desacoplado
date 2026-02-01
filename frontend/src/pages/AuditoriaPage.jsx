import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ChevronLeft, ChevronRight, Activity, FileSpreadsheet, FileDown, ShieldCheck, Search  } from 'lucide-react';
// Importaciones para exportación
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AuditoriaPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [pagina, setPagina] = useState(0);
    const registrosPorPagina = 10;
    const [hayMasRegistros, setHayMasRegistros] = useState(true);

    useEffect(() => { fetchLogs(); }, [pagina]);

    const fetchLogs = async () => {
    setLoading(true);
    try {
        const desde = pagina * registrosPorPagina;
        const hasta = desde + registrosPorPagina - 1;

        const { data, error } = await supabase
            .from('auditoria')
            .select('*')
            .order('fecha_hora', { ascending: false })
            .range(desde, hasta);

        if (error) throw error;

        setLogs(data || []);
        // RECTIFICACIÓN: Si usas una variable 'logsFiltrados' para el render, 
        // asegúrate de que se actualice o de renderizar directamente 'logs'.
        setHayMasRegistros(data.length === registrosPorPagina);
        
    } catch (error) { 
        console.error("Error Supabase:", error.message); 
    } finally { 
        setLoading(false); 
    }
   };

    // FUNCIONES DE EXPORTACIÓN
   const exportarExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Auditoria');

            // 1. Título con diseño (Celda combinada A1:F1)
            worksheet.mergeCells('A1:F1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = 'REPORTE DE AUDITORÍA DEL SISTEMA - SGCD';
            titleCell.font = { name: 'Arial', size: 14, bold: true };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

            // 2. Encabezados (Fila 3)
            const headerRow = worksheet.getRow(3);
            headerRow.values = ["Fecha", "Módulo", "Responsable", "Acción", "Descripción", "Velocidad"];
            
            // Estilo de Encabezados: Verde, Bordes y Texto Negro
            headerRow.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
                cell.font = { bold: true, color: { argb: 'FF000000' } };
                cell.alignment = { horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
            });

            // 3. Datos con Bordes
            logs.forEach(log => {
                const row = worksheet.addRow([
                    new Date(log.fecha_hora).toLocaleString(),
                    log.modulo || 'Sistema',
                    log.usuario_responsable,
                    log.accion,
                    log.descripcion,
                    `${log.duracion_ms || 0}ms`
                ]);
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' }
                    };
                });
            });

            // Ajuste de columnas
            worksheet.columns.forEach(col => col.width = 20);

            // 4. Descarga
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Auditoria_SGCD.xlsx`);
        } catch (error) {
            console.error("Error Excel:", error);
            alert("Error al exportar Excel. Revisa la consola.");
        }
    };

   const exportarPDF = () => {
    try {
        // 'l' para horizontal (A4: 297mm de ancho)
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Configuración de Título: Centrado y Negrita
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("REPORTE DE AUDITORÍA DEL SISTEMA - SGCD", pageWidth / 2, 15, { align: 'center' });
        
        autoTable(doc, {
            startY: 25,
            head: [['Fecha', 'Módulo', 'Responsable', 'Acción', 'Descripción', 'Velocidad']],
            body: logs.map(log => [
                new Date(log.fecha_hora).toLocaleString(),
                log.modulo || 'Sistema',
                log.usuario_responsable,
                log.accion,
                log.descripcion,
                `${log.duracion_ms || 0}ms`
            ]),
            // Estilo de encabezados: Verde, texto negro, centrado y negrita
            headStyles: { 
                fillColor: [146, 208, 80], 
                textColor: [0, 0, 0],
                halign: 'center',
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [0, 0, 0]
            },
            // Estilo general de la tabla con bordes negros finos
            styles: { 
                lineWidth: 0.1, 
                lineColor: [0, 0, 0], 
                fontSize: 8,
                valign: 'middle'
            },
            // Centrar contenido de columnas específicas (opcional, para mayor orden)
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'center' },
                3: { halign: 'center' },
                5: { halign: 'center' }
            }
        });
        
        doc.save(`Auditoria_SGCD_${new Date().toLocaleDateString()}.pdf`);
     } catch (error) {
        console.error("Error PDF:", error);
        alert("Error al exportar PDF. Revisa la consola.");
     }
  };
   
    // Estadísticas y Filtros (Manteniendo tu estructura)
    const estadisticas = logs.reduce((acc, log) => {
        const esHoy = new Date(log.fecha_hora).toDateString() === new Date().toDateString();
        if (esHoy) acc.hoy += 1;
        acc.totalMs += (log.duracion_ms || 0);
        return acc;
    }, { hoy: 0, totalMs: 0 });

    const promedioMs = logs.length > 0 ? Math.round(estadisticas.totalMs / logs.length) : 0;
    const logsFiltrados = logs.filter(log => 
        log.usuario_responsable?.toLowerCase().includes(filtro.toLowerCase()) ||
        log.accion?.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700">
        {/* PANEL DE ESTADÍSTICAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-yellow-200 p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Acciones Hoy</p>
                  <h3 className="text-2xl font-black text-blue-500">{estadisticas.hoy}</h3>
                    </div>
                      <div className="flex gap-4">
                    <button onClick={exportarExcel} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="Exportar Excel">
                <FileSpreadsheet size={20} />
             </button>
            <button onClick={exportarPDF} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="Exportar PDF">
        <FileDown size={20} />
     </button>
    </div>
     </div>
      <div className="bg-yellow-200 p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
         <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Rendimiento Promedio</p>
          <h3 className="text-2xl font-black text-amber-500">{promedioMs} ms</h3>
            </div>
              <div className="bg-amber-50 p-5 rounded-2xl">
                <Activity className="text-amber-500" size={20} />
              </div>
            </div>
         </div>
        {/* BUSCADOR */}
        <div className="bg-emerald-400 p-4 md:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-3 self-start md:self-center">
          <div className="bg-white/30 p-2 rounded-xl"><ShieldCheck className="text-white" size={24} /></div>
            <div>
              <h1 className="text-lg font-black text-white leading-none">Auditoría de Sistema</h1>
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Página {pagina + 1}</span>
                  </div>
                   </div>
                    <div className="relative w-full md:w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={16} />
                    <input 
                    type="text" 
                  placeholder="Buscar..."
                className="w-full pl-11 py-2 md:py-2.5 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-yellow-400 shadow-inner"
              value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            />
        </div>
    </div>
    {/* CONTENEDOR PRINCIPAL DE REGISTROS */}
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* --- VISTA MÓVIL (Cards) --- */}
        <div className="md:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-10 text-center animate-pulse text-gray-400 font-black">Cargando...</div>
              ) : logsFiltrados.length === 0 ? (
                <div className="p-10 text-center text-gray-400 italic text-xs">No se encontraron resultados</div>
                  ) : (
                    logsFiltrados.map((log, index) => {
                      const esHoy = log.fecha_hora && new Date(log.fecha_hora).toDateString() === new Date().toDateString();

                    return (
                  <div key={`card-${log.id || index}`} className={`p-4 ${esHoy ? 'bg-blue-50/20' : ''} active:bg-gray-50 transition-colors`}>
                 <div className="flex justify-between items-start mb-3">
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">
              <ShieldCheck size={10} /> {/* Aquí se usa el icono que causaba error */}
             {log.accion}
            </span>
           <span className="text-[10px] text-gray-400 font-medium">
            {log.fecha_hora ? new Date(log.fecha_hora).toLocaleString() : '---'}
            </span>
             </div>
              <div className="space-y-2">
                <div>
                 <p className="text-[9px] uppercase text-gray-400 font-bold tracking-tight">Responsable</p>
                  <p className="text-xs font-black text-gray-700 break-all">{log.usuario_responsable}</p>
                    </div>
                    <div>
                   <p className="text-[9px] uppercase text-gray-400 font-bold tracking-tight">Descripción</p>
                <p className="text-xs text-gray-500 italic">{log.descripcion || 'Sin descripción'}</p>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
  {/* --- VISTA DESKTOP (Tabla) --- */}
  <div className="hidden md:block overflow-x-auto">
     <table className="w-full text-left border-collapse">
        <thead>
           <tr className="bg-red-500">
                 <th className="p-5 text-[10px] font-black text-white text-center uppercase">Fecha y Hora</th>
                 <th className="p-5 text-[10px] font-black text-white text-center uppercase">Responsable</th>
                 <th className="p-5 text-[10px] font-black text-white text-center uppercase">Acción</th>
                 <th className="p-5 text-[10px] font-black text-white text-center uppercase">Descripción</th>
                 <th className="p-5 text-[10px] font-black text-white text-center uppercase">Velocidad</th>
           </tr>
      </thead>
    <tbody className="divide-y divide-gray-50">
    {!loading && logsFiltrados.map((log, index) => {
      const esHoy = log.fecha_hora && new Date(log.fecha_hora).toDateString() === new Date().toDateString();
        return (
         <tr key={`row-${log.id || index}`} className={`${esHoy ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
          <td className="p-5 text-xs font-bold text-gray-600 text-center">
            {log.fecha_hora ? new Date(log.fecha_hora).toLocaleString() : '---'}
              </td>
                <td className="p-5 text-xs font-black text-gray-700">{log.usuario_responsable}</td>
                  <td className="p-5 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full border border-amber-100">
                      <ShieldCheck size={12} />
                        {log.accion}
                         </span>
                          </td>
                        <td className="p-5 text-xs text-gray-500 italic">{log.descripcion}</td>
                      <td className="p-5 text-xs text-center font-mono text-gray-400">{log.duracion_ms || 0}ms</td>
                    </tr>
                    );
                })}
              </tbody>
            </table>
          {logsFiltrados.length === 0 && !loading && (
          <div className="p-10 text-center text-gray-400 text-sm italic border-t border-gray-50">
          No se encontraron registros que coincidan con la búsqueda.
          </div>
          )}
        </div>
      </div>
     {/* CONTROLES DE PAGINACIÓN */}
     <div className="p-3 bg-red-500 border-t border-gray-100 rounded-b-2xl flex justify-between items-center">
      <button 
        type="button"
          onClick={() => setPagina(p => p + 1)} 
            disabled={!hayMasRegistros || loading}
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed transition-all active:scale-95"
               >
                Siguiente <ChevronRight size={15} />
               </button>
                     <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-orange-100 tracking-tighter">VISUALIZANDO</span>
                     <span className="text-xs font-black text-white tracking-widest">PÁGINA {pagina + 1}</span>
                     </div>
               <button 
               type="button"
              onClick={() => {
              {/* Si tienes datos, permitimos avanzar */}
              if (logsFiltrados.length > 0) setPagina(pagina + 1);}}
              disabled={logsFiltrados.length < 10 || loading} 
              className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
             Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
       );
    };

    export default AuditoriaPage;