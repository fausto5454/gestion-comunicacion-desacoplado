import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ShieldCheck, Search, Clock, ChevronLeft, ChevronRight, Activity, FileSpreadsheet, FileDown } from 'lucide-react';
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
            setHayMasRegistros(data.length === registrosPorPagina);
        } catch (error) { console.error("Error:", error.message); }
        finally { setLoading(false); }
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
                <div className="bg-yellow-200/80 p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Acciones Hoy</p>
                        <h3 className="text-2xl font-black text-blue-600">{estadisticas.hoy}</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportarExcel} className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors" title="Exportar Excel">
                            <FileSpreadsheet size={20} />
                        </button>
                        <button onClick={exportarPDF} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="Exportar PDF">
                            <FileDown size={20} />
                        </button>
                    </div>
                </div>
                <div className="bg-yellow-200/80 p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Rendimiento Promedio</p>
                        <h3 className="text-2xl font-black text-amber-500">{promedioMs} ms</h3>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-2xl">
                        <Activity className="text-amber-500" size={20} />
                    </div>
                </div>
            </div>

            {/* ENCABEZADO Y BUSCADOR */}
            <div className="bg-green-300/80 p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-2xl">
                        <ShieldCheck className="text-green-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-gray-800">Auditoría de Sistema</h1>
                        <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Página {pagina + 1}</p>
                    </div>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuario o acción..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLA DE REGISTROS (Misma estructura previa) */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-300 border-b border-gray-100">
                                <th className="p-5 text-[10px] font-black uppercase text-blue-600 tracking-widest">Fecha y Hora</th>
                                <th className="p-5 text-[10px] font-black uppercase text-blue-600 tracking-widest">Responsable</th>
                                <th className="p-5 text-[10px] font-black uppercase text-blue-600 tracking-widest">Acción</th>
                                <th className="p-5 text-[10px] font-black uppercase text-blue-600 tracking-widest">Descripción</th>
                                <th className="p-5 text-[10px] font-black uppercase text-blue-600 tracking-widest">Velocidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-10 text-center animate-pulse">Cargando...</td></tr>
                            ) : logsFiltrados.map((log) => {
                                const esHoy = new Date(log.fecha_hora).toDateString() === new Date().toDateString();
                                return (
                                    <tr key={log.id} className={`${esHoy ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                                        <td className="p-5 text-xs font-bold text-gray-600">
                                            <div className="flex items-center gap-2">
                                                {esHoy && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>}
                                                {new Date(log.fecha_hora).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="p-5 text-xs font-black text-gray-700">{log.usuario_responsable}</td>
                                        <td className="p-5">
                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-black uppercase">
                                                {log.accion}
                                            </span>
                                        </td>
                                        <td className="p-5 text-xs text-gray-500 italic">{log.descripcion}</td>
                                        <td className="p-5 text-[10px] font-bold text-gray-400">
                                            {log.duracion_ms ? `${log.duracion_ms}ms` : '--'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* CONTROLES DE PAGINACIÓN */}
                <div className="p-4 bg-blue-100/50 border-t border-gray-100 flex justify-between items-center">
                    <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0 || loading} className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all">
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    <span className="text-xs font-black text-green-400 uppercase tracking-widest">Página {pagina + 1}</span>
                    <button onClick={() => setPagina(p => p + 1)} disabled={!hayMasRegistros || loading} className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all">
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditoriaPage;