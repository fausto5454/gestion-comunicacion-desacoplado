import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ShieldCheck, Search, ChevronLeft, ChevronRight, Activity, FileSpreadsheet, FileDown } from 'lucide-react';
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
            setHayMasRegistros(data.length === registrosPorPagina);
        } catch (error) { console.error("Error:", error.message); }
        finally { setLoading(false); }
    };

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
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            
            {/* PANEL DE ESTADÍSTICAS COMPACTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-yellow-300/60 p-5 rounded-3xl border border-yellow-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-yellow-700 tracking-wider">Acciones Hoy</p>
                        <h3 className="text-2xl font-black text-blue-600">{logs.filter(l => new Date(l.fecha_hora).toDateString() === new Date().toDateString()).length}</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportarExcel} className="p-2 bg-white text-green-600 rounded-xl shadow-sm hover:scale-110 transition-transform"><FileSpreadsheet size={20} /></button>
                        <button onClick={exportarPDF} className="p-2 bg-white text-red-600 rounded-xl shadow-sm hover:scale-110 transition-transform"><FileDown size={20} /></button>
                    </div>
                </div>
                <div className="bg-yellow-300/60 p-5 rounded-3xl border border-yellow-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-yellow-700 tracking-wider">Rendimiento Promedio</p>
                        <h3 className="text-2xl font-black text-amber-600">0 ms</h3>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm"><Activity className="text-amber-500" size={20} /></div>
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
                        className="w-full pl-11 pr-4 py-2.5 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-yellow-400 shadow-inner"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLA / VISTA DE TARJETAS */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                {/* VISTA MÓVIL (TARJETAS) */}
                <div className="block md:hidden divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-10 text-center animate-pulse text-gray-400 font-bold">Cargando registros...</div>
                    ) : logsFiltrados.map((log) => (
                        <div key={log.id_auditoria || log.id} className="p-5 flex flex-col gap-2 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <span className="text-[10px] font-bold text-gray-400">{new Date(log.fecha_hora).toLocaleString()}</span>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded-md uppercase">{log.accion}</span>
                            </div>
                            <p className="text-sm font-black text-gray-800 break-all">{log.usuario_responsable}</p>
                            <p className="text-xs text-gray-500 italic">{log.descripcion}</p>
                        </div>
                    ))}
                </div>

                {/* VISTA ESCRITORIO (TABLA) */}
                <div className="overflow-x-auto shadow-2xl rounded-3xl border border-slate-100">
                    <table className="w-full table-fixed min-w-[800px] bg-white">
                        <thead>
                           <tr className="bg-red-500 text-white">
                             <th className="w-[20%] p-4 text-[10px] font-black uppercase tracking-wider">Fecha</th>
                             <th className="w-[25%] p-4 text-[10px] font-black uppercase tracking-wider text-center">Usuario</th>
                             <th className="w-[15%] p-4 text-[10px] font-black uppercase tracking-wider">Acción</th>
                             <th className="w-[40%] p-4 text-[10px] font-black uppercase tracking-wider text-center">Descripción</th>
                             <th className="w-[15%] p-4 text-[10px] font-black uppercase tracking-wider text-center">Velocidad</th>
                           </tr>
                        </thead>
                           <tbody className="divide-y divide-slate-100">
                            {!loading && logsFiltrados.map((log) => (
                                <tr key={log.id_auditoria || log.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="p-4 text-xs text-gray-600 font-medium">{new Date(log.fecha_hora).toLocaleString()}</td>
                                    <td className="p-4 text-xs font-bold text-gray-700">{log.usuario_responsable}</td>
                                    <td className="p-4 text-center">
                                        <span className="text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded-lg font-black group-hover:bg-amber-100 transition-colors">{log.accion}</span>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 text-center max-w-xs truncate" title={log.descripcion}>{log.descripcion}</td>
                                    <td className="p-4 text-xs text-center font-mono text-gray-400">{log.duracion_ms || 0}ms</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN COMPACTA */}
                <div className="p-4 bg-sky-200/50 border-t border-gray-100 flex justify-between items-center">
                <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0 || loading} className="flex items-center gap-1 px-4 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                <ChevronLeft size={16} /> Anterior
                    </button>
                        <span className="text-xs font-black text-green-400 tracking-widest">Página {pagina + 1}</span>
                            <button onClick={() => setPagina(p => p + 1)} disabled={!hayMasRegistros || loading} className="flex items-center gap-1 px-4 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
                                Siguiente <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
             );
         };
        export default AuditoriaPage;