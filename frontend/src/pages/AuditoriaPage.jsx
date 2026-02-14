import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { 
    ChevronLeft, ChevronRight, Activity, FileSpreadsheet, 
    FileDown, ShieldCheck, Search, Zap, Trash2, AlertTriangle 
} from 'lucide-react';
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
    const [limpiando, setLimpiando] = useState(false);

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
            
        } catch (error) { 
            console.error("Error Supabase:", error.message); 
        } finally { 
            setLoading(false); 
        }
    };

    // --- NUEVO: SISTEMA DE MANTENIMIENTO ---
   const limpiarLogsAntiguos = async () => {
        const confirmar = window.confirm("¿Deseas purgar los registros de más de 30 días? Se mostrará el total de registros liberados.");
        if (!confirmar) return;

        setLimpiando(true);
        try {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 30);

            // 1. Ejecutamos la eliminación y solicitamos el conteo
            const { count, error } = await supabase
                .from('auditoria')
                .delete({ count: 'exact' }) // Esto nos devuelve cuántas filas se borraron
                .lt('fecha_hora', fechaLimite.toISOString());

            if (error) throw error;

            // 2. Notificación profesional del espacio liberado
            alert(`✅ Mantenimiento Exitoso:\n- Se han eliminado ${count || 0} registros antiguos.\n- El rendimiento de las consultas ha sido optimizado.`);
            
            setPagina(0); // Reiniciamos a la primera página por seguridad
            fetchLogs();
        } catch (error) {
            console.error("Error en purga:", error.message);
            alert("Error al realizar el mantenimiento: " + error.message);
        } finally {
            setLimpiando(false);
        }
    };

    // --- NUEVO: LÓGICA DE ALERTAS DE RENDIMIENTO ---
    const getRendimientoBadge = (ms) => {
        if (ms > 500) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertTriangle size={10} /> }; // Crítico
        if (ms > 200) return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Zap size={10} /> }; // Lento
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Zap size={10} className="fill-current" /> }; // Óptimo
    };

    // FUNCIONES DE EXPORTACIÓN (Intactas)
    const exportarExcel = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Auditoria');
        
        // 1. Título con estilo compacto
        worksheet.mergeCells('A1:F1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'REPORTE DE AUDITORÍA DEL SISTEMA - SGCD';
        titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 25;

        // 2. Encabezados
        const headerRow = worksheet.getRow(3);
        headerRow.values = ["Fecha", "Módulo", "Responsable", "Acción", "Descripción", "Velocidad"];
        
        headerRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
            cell.font = { bold: true, size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        // 3. Datos con control de alineación
        logs.forEach(log => {
            const row = worksheet.addRow([
                new Date(log.fecha_hora).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
                log.modulo || 'General',
                log.usuario_responsable,
                log.accion,
                log.descripcion || '',
                `${log.duracion_ms || 0}ms`
            ]);

            row.eachCell((cell, colNumber) => {
                cell.font = { size: 9 };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                
                // Centramos todo excepto la descripción
                if (colNumber === 5) {
                    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                } else {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            });
        });

        // 4. AJUSTE DE COLUMNAS EQUILIBRADO (Evita el efecto "estirado")
        const columnWidths = [18, 12, 27, 12, 40, 10]; // Anchos fijos sugeridos para evitar estiramiento excesivo

        worksheet.columns.forEach((column, i) => {
            column.width = columnWidths[i];
            
        });

        // 5. Exportación
        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Auditoria_SGCD_${new Date().getTime()}.xlsx`);

        } catch (error) {
           console.error("Error Excel:", error);
           alert("Error al generar el reporte.");
       }
    };

    const exportarPDF = () => {
        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
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
                headStyles: { fillColor: [146, 208, 80], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold' },
                styles: { lineWidth: 0.1, fontSize: 8, valign: 'middle' }
            });
            doc.save(`Auditoria_SGCD_${new Date().toLocaleDateString()}.pdf`);
        } catch (error) {
            console.error("Error PDF:", error);
        }
    };
   
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
            {/* PANEL DE ESTADÍSTICAS Y MANTENIMIENTO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-600 p-6 rounded-3xl border border-gray-600 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Base de Datos</p>
                        <button 
                            onClick={limpiarLogsAntiguos}
                            disabled={limpiando}
                            className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-400 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl text-[10px] font-black transition-all active:scale-95 disabled:opacity-50 border border-red-500/20"
                        >
                            <Trash2 size={14} /> {limpiando ? 'PROCESANDO...' : 'Limpiar > 30 días'}
                        </button>
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
                {/* Salud de Rendimiento Dinámica */}
                <div className={`p-5 rounded-3xl border shadow-sm flex items-center justify-between transition-all duration-500 ${promedioMs > 400 ? 'bg-red-50 border-red-200' : 'bg-gray-600 border-gray-600'}`}>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${promedioMs > 400 ? 'text-red-500' : 'text-gray-300'}`}>Rendimiento Promedio</p>
                        <h3 className={`text-2xl font-black ${promedioMs > 400 ? 'text-red-600' : 'text-amber-500'}`}>{promedioMs} ms</h3>
                    </div>
                    <div className={`p-5 rounded-2xl transition-colors ${promedioMs > 400 ? 'bg-red-100' : 'bg-amber-50'}`}>
                        <Activity className={promedioMs > 400 ? 'text-red-600 animate-pulse' : 'text-amber-500'} size={20} />
                    </div>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="bg-emerald-500 p-4 md:p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 self-start md:self-center">
                    <div className="bg-white/50 p-2 rounded-xl"><ShieldCheck className="text-white" size={24} /></div>
                    <div>
                        <h1 className="text-lg font-black text-white leading-none">Auditoría de Sistema</h1>
                        <span className="text-[10px] text-white/80 font-bold uppercase tracking-widest">Página {pagina + 1}</span>
                    </div>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={16} />
                    <input 
                        type="text" 
                        placeholder="Buscar por usuario o acción..."
                        className="w-full pl-11 py-2 md:py-2.5 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-yellow-400 shadow-inner"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL DE REGISTROS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                {/* --- VISTA MÓVIL (Con Alertas de Rendimiento) --- */}
                <div className="md:hidden divide-y divide-gray-100">
                    {loading ? (
                        <div className="p-10 text-center animate-pulse text-gray-400 font-black">Cargando registros...</div>
                    ) : logsFiltrados.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 italic text-xs">Sin resultados en esta página</div>
                    ) : (
                        logsFiltrados.map((log) => {
                            const alertStyle = getRendimientoBadge(log.duracion_ms);
                            return (
                                <div key={`mob-audit-${log.id}-${log.fecha_hora}`} className="p-5 relative active:bg-gray-50 transition-colors">
                                    {/* Badge de Rendimiento Móvil */}
                                    <div className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black ${alertStyle.bg} ${alertStyle.text} ${alertStyle.border}`}>
                                        {alertStyle.icon}
                                        <span>{log.duracion_ms || 0}ms</span>
                                    </div>

                                    <div className="flex justify-between items-start mb-3">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-lg border border-amber-100">
                                            <ShieldCheck size={10} />
                                            {log.accion}
                                        </span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[9px] uppercase text-gray-400 font-bold tracking-tight">Responsable</p>
                                            <p className="text-xs font-black text-gray-700 break-all">{log.usuario_responsable}</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-[9px] uppercase text-gray-400 font-bold mb-1">Descripción</p>
                                            <p className="text-xs text-gray-500 italic leading-snug">{log.descripcion || 'Sin descripción'}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 font-medium">{new Date(log.fecha_hora).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* --- VISTA DESKTOP (Tabla con Semáforo) --- */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-600">
                                <th className="p-5 text-[10px] font-black text-gray-300 text-center uppercase">Fecha y Hora</th>
                                <th className="p-5 text-[10px] font-black text-gray-300 text-center uppercase">Responsable</th>
                                <th className="p-5 text-[10px] font-black text-gray-300 text-center uppercase">Acción</th>
                                <th className="p-5 text-[10px] font-black text-gray-300 text-center uppercase">Descripción</th>
                                <th className="p-5 text-[10px] font-black text-gray-300 text-center uppercase">Velocidad</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {!loading && logsFiltrados.map((log) => {
                                const alertStyle = getRendimientoBadge(log.duracion_ms);
                                return (
                                    <tr key={`desk-audit-${log.id}-${log.fecha_hora}`} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-5 text-xs font-bold text-gray-600 text-center">{new Date(log.fecha_hora).toLocaleString()}</td>
                                        <td className="p-5 text-xs font-black text-gray-700">{log.usuario_responsable}</td>
                                        <td className="p-5 text-center">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-full border border-amber-100">
                                                <ShieldCheck size={12} />
                                                {log.accion}
                                            </span>
                                        </td>
                                        <td className="p-5 text-xs text-gray-500 italic">{log.descripcion}</td>
                                        <td className="p-5 text-center">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg font-mono text-[10px] font-bold border ${alertStyle.bg} ${alertStyle.text} ${alertStyle.border}`}>
                                                {alertStyle.icon}
                                                {log.duracion_ms || 0}ms
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CONTROLES DE PAGINACIÓN LÓGICA */}
            <div className="p-3 bg-red-500 border-t border-gray-100 rounded-b-2xl flex justify-between items-center shadow-lg">
                <button 
                    type="button"
                    onClick={() => setPagina(p => Math.max(0, p - 1))} 
                    disabled={pagina === 0 || loading}
                    className="flex items-center gap-1 px-5 py-2.5 bg-white border-none rounded-2xl text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all active:scale-95 shadow-md"
                >
                    <ChevronLeft size={16} /> Anterior
                </button>

                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-orange-100 tracking-tighter uppercase">Visualizando</span>
                    <span className="text-xs font-black text-white">PÁGINA {pagina + 1}</span>
                </div>

                <button 
                    type="button"
                    onClick={() => setPagina(p => p + 1)} 
                    disabled={!hayMasRegistros || loading}
                    className="flex items-center gap-1 px-5 py-2.5 bg-white border-none rounded-2xl text-xs font-black text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all active:scale-95 shadow-md"
                >
                    Siguiente <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default AuditoriaPage;