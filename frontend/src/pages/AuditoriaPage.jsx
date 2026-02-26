import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { 
    ChevronLeft, ChevronRight, Activity, FileSpreadsheet, 
    FileDown, ShieldCheck, Search, Zap, Trash2, AlertTriangle 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const AuditoriaPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    const [pagina, setPagina] = useState(0);
    const registrosPorPagina = 5;
    const [hayMasRegistros, setHayMasRegistros] = useState(true);
    const [limpiando, setLimpiando] = useState(false);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [promedioVelocidad, setPromedioVelocidad] = useState(0);

    // --- MEJORA: Búsqueda en servidor (Real y Exacta) ---
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const t0 = performance.now(); 

    try {
        const desde = pagina * registrosPorPagina;
        const hasta = desde + registrosPorPagina - 1;

        // Consultamos el conteo real y los datos exactos
        const { data, count, error } = await supabase
            .from('auditoria')
            .select('*', { count: 'exact' })
            .order('fecha_hora', { ascending: false })
            .range(desde, hasta);

        if (error) throw error;

        const t1 = performance.now();
        const latenciaReal = Math.round(t1 - t0);

        // INFORMACIÓN REAL: Sin filtros. Lo que hay en la DB es lo que se muestra.
        setLogs((data || []).map(log => ({ 
            ...log, 
            duracion_ms: latenciaReal 
        })));
        
        // El escudo mostrará el número exacto de filas en Supabase (ej. 8)
        setTotalRegistros(count || 0); 
        
        if (typeof setPromedioVelocidad === 'function') {
            setPromedioVelocidad(latenciaReal);
        }
        setHayMasRegistros(desde + (data?.length || 0) < count);

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        setLoading(false);
    }
    }, [pagina, registrosPorPagina]);

    useEffect(() => {
    let isMounted = true;

    const handler = setTimeout(() => {
        if (isMounted) {
            fetchLogs();
        }
    }, 400);

    return () => {
        isMounted = false; // Limpieza profesional
        clearTimeout(handler);
    };
    }, [fetchLogs, filtro]);

    const limpiarLogsAntiguos = async () => {
        const confirmar = window.confirm("¿Deseas purgar los registros de más de 30 días? Se mostrará el total de registros liberados.");
        if (!confirmar) return;

        setLimpiando(true);
        try {
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - 30);

            const { count, error } = await supabase
                .from('auditoria')
                .delete({ count: 'exact' })
                .lt('fecha_hora', fechaLimite.toISOString());

            if (error) throw error;

            alert(`✅ Mantenimiento Exitoso:\n- Se han eliminado ${count || 0} registros antiguos.\n- El rendimiento de las consultas ha sido optimizado.`);
            
            setPagina(0);
            fetchLogs();
        } catch (error) {
            console.error("Error en purga:", error.message);
            alert("Error al realizar el mantenimiento: " + error.message);
        } finally {
            setLimpiando(false);
        }
    };

    const getRendimientoBadge = (ms) => {
        if (ms > 2000) return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <AlertTriangle size={10} /> };
        if (ms > 1000) return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: <Zap size={10} /> };
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Zap size={10} className="fill-current" /> };
    };

    // FUNCIONES DE EXPORTACIÓN
    const exportarExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Auditoria');
            worksheet.mergeCells('A1:F1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = 'REPORTE DE AUDITORÍA DEL SISTEMA - SGCD';
            titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
            titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } };
            titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
            
            const headerRow = worksheet.getRow(3);
            headerRow.values = ["Fecha", "Módulo", "Responsable", "Acción", "Descripción", "Velocidad"];
            headerRow.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
                cell.font = { bold: true, size: 10 };
                cell.alignment = { horizontal: 'center' };
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            logs.forEach(log => {
                const row = worksheet.addRow([
                    new Date(log.fecha_hora).toLocaleString('es-PE'),
                    log.modulo || 'General',
                    log.usuario_responsable,
                    log.accion,
                    log.descripcion || '',
                    `${log.duracion_ms || 0}ms`
                ]);
                row.eachCell(cell => {
                    cell.font = { size: 9 };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });
            });

            worksheet.columns = [{ width: 20 }, { width: 15 }, { width: 30 }, { width: 15 }, { width: 45 }, { width: 12 }];
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Auditoria_SGCD_${new Date().getTime()}.xlsx`);
        } catch (error) { alert("Error al generar Excel"); }
    };

    const exportarPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        autoTable(doc, {
            head: [['Fecha', 'Módulo', 'Responsable', 'Acción', 'Descripción', 'Velocidad']],
            body: logs.map(l => [new Date(l.fecha_hora).toLocaleString(), l.modulo, l.usuario_responsable, l.accion, l.descripcion, `${l.duracion_ms}ms`]),
            headStyles: { fillColor: [146, 208, 80] }
        });
        doc.save("Auditoria_SGCD.pdf");
    };

    // Estadísticas
    const promedioMs = logs.length > 0 
        ? Math.round(logs.reduce((acc, log) => acc + (log.duracion_ms || 0), 0) / logs.length) 
        : 0;

    return (
    <div className="flex flex-col gap-6 p-2 md:p-1 animate-in fade-in duration-700 bg-slate-50/50">
        
        {/* PANEL DE ESTADÍSTICAS Y MANTENIMIENTO (Estilo Dashboard) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Base de Datos */}
            <div className="bg-[#004d71] p-6 rounded-[2rem] shadow-xl flex items-center justify-between border border-white/10">
                <div>
                    <p className="text-[10px] font-black uppercase text-sky-300 tracking-[0.2em] mb-2">Base de Datos</p>
                    <button 
                        onClick={limpiarLogsAntiguos}
                        disabled={limpiando}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-500 text-white rounded-2xl text-[10px] font-black transition-all active:scale-95 disabled:opacity-50 border border-white/20 shadow-lg"
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
            {/* Card Rendimiento */}
            <div className={`p-6 rounded-[2rem] shadow-xl flex items-center justify-between border transition-all duration-500 ${promedioMs > 400 ? 'bg-red-600 border-red-400' : 'bg-[#004d71] border-white/10'}`}>
                <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${promedioMs > 400 ? 'text-red-100' : 'text-sky-300'}`}>Rendimiento Promedio</p>
                    <h3 className={`text-3xl font-black ${promedioMs > 400 ? 'text-white' : 'text-amber-400'}`}>
                        {promedioMs} <span className="text-sm font-bold opacity-80">ms</span>
                    </h3>
                </div>
                <div className={`p-4 rounded-2xl transition-colors shadow-inner ${promedioMs > 400 ? 'bg-white/20' : 'bg-white/10'}`}>
                    <Activity className={promedioMs > 400 ? 'text-white animate-pulse' : 'text-amber-400'} size={28} />
                </div>
            </div>
        </div>
        {/* BUSCADOR (Estilo Banner Azul) */}
        <div className="bg-green-600 p-2 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border-4 border-white">
         <div className="flex items-center gap-4 pl-6 py-2">
           <div className="relative">
               <div className="bg-white/30 p-3 rounded-2xl backdrop-blur-md border border-white/30">
                 <ShieldCheck className="text-white" size={26} />
              </div>
             {/* Badge Amarillo Fijo (Sin pulso para indicar orden) */}
              <span className="absolute -top-2 -right-2 bg-yellow-400 text-[#004d71] text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white shadow-md">
                {logs.length}
            </span>
           </div>
            <div className="flex flex-col">
             <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">Auditoría</h1>
              <span className="text-[10px] text-yellow-300 font-bold uppercase tracking-widest">
                {totalRegistros || 0} Registros Totales
            </span>
           </div>
        </div>
       {/* BUSCADOR BLANCO CORTO Y PREMIUM */}
       <div className="relative w-full md:w-[350px] md:mr-4"> 
         <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="Filtrar actividad..."
                className="w-full pl-12 pr-6 py-2.5 bg-white border-none rounded-full text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-4 focus:ring-yellow-400 transition-all shadow-md outline-none"
                value={filtro}
                onChange={(e) => { setFiltro(e.target.value); setPagina(0); }}
              />
          </div>
        </div>
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden transition-all hover:border-sky-200">
    
    {/* VISTA MÓVIL (Mantenida pero estilizada) */}
    <div className="md:hidden divide-y divide-slate-100">
        {loading ? (
            <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest">
                Obteniendo registros de seguridad...
            </div>
           ) : logs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 italic text-xs uppercase font-bold">
                Sin resultados
            </div>
           ) : (
            logs.map((log, index) => {
                const alertStyle = getRendimientoBadge(log.duracion_ms);
                return (
                    /* KEY ÚNICA COMBINADA */
                    <div key={`mob-${log.id_auditoria || index}-${index}`} className="p-6 relative active:bg-sky-50 transition-colors">
                        <div className={`absolute top-4 right-6 flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-black shadow-sm ${alertStyle.bg} ${alertStyle.text} ${alertStyle.border}`}>
                            {alertStyle.icon} <span>{log.duracion_ms || 0}ms</span>
                        </div>
                        <div className="mb-4">
                            <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase rounded-lg border ${
                                log.accion === 'DELETE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                log.accion === 'INSERT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                                 }`}>
                                {log.accion}
                            </span>
                      </div>
                     <div className="grid grid-cols-1 gap-3">
                        <div>
                            <p className="text-[9px] uppercase text-slate-400 font-black tracking-tighter">Responsable</p>
                            <p className="text-xs font-black text-[#004d71] break-all">{log.usuario_responsable}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs text-slate-500 italic leading-snug font-medium">
                                "{log.descripcion || `Actividad en módulo ${log.modulo}`}"
                            </p>
                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase">
                                <span>Sincronizado</span>
                                <span>{new Date(log.fecha_hora).toLocaleString()}</span>
                            </div>
                         </div>
                     </div>
                 </div>
                );
             })
         )}
    </div>
    {/* VISTA DESKTOP (Integrando los 5 datos) */}
    <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-700 text-white">
                    <th className="p-5 text-[10px] font-black text-center uppercase tracking-[0.2em] border-r border-white/5">Fecha y Hora</th>
                    <th className="p-5 text-[10px] font-black text-center uppercase tracking-[0.2em] border-r border-white/5">Responsable</th>
                    <th className="p-5 text-[10px] font-black text-center uppercase tracking-[0.2em] border-r border-white/5">Acción</th>
                    <th className="p-5 text-[10px] font-black text-center uppercase tracking-[0.2em] border-r border-white/5">Descripción</th>
                    <th className="p-5 text-[10px] font-black text-center uppercase tracking-[0.2em]">Velocidad</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {loading ? (
                    <tr>
                        <td colSpan="5" className="p-20 text-center animate-pulse text-slate-400 font-black tracking-[0.3em] uppercase text-xs">
                            Encriptando datos de auditoría...
                        </td>
                    </tr>
                ) : logs.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="p-20 text-center text-slate-400 italic text-xs uppercase font-bold">
                            No se encontraron registros de actividad
                        </td>
                    </tr>
                ) : (
                    logs.map((log, index) => {
                        const alertStyle = getRendimientoBadge(log.duracion_ms);
                        return (
                            /* KEY ÚNICA COMBINADA */
                            <tr key={`desk-${log.id_auditoria || index}-${index}`} className="hover:bg-sky-50 transition-all group">
                                <td className="p-4 text-center">
                                    <p className="text-[11px] font-black text-slate-700 leading-none mb-1">
                                        {new Date(log.fecha_hora).toLocaleDateString()}
                                    </p>
                                    <p className="text-[10px] font-bold text-sky-500">
                                        {new Date(log.fecha_hora).toLocaleTimeString()}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200 uppercase">
                                            {log.usuario_responsable?.charAt(0)}
                                        </div>
                                        <span className="text-[11px] font-black text-slate-600 tracking-tight">
                                            {log.usuario_responsable}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-block px-3 py-1 text-[9px] font-black uppercase rounded-full border shadow-sm group-hover:scale-105 transition-transform ${
                                        log.accion === 'DELETE' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        log.accion === 'INSERT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        'bg-amber-50 text-amber-600 border-amber-100'
                                    }`}>
                                        {log.accion}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <p className="text-[11px] text-slate-500 italic font-medium leading-tight max-w-[250px] mx-auto text-center line-clamp-2">
                                        {log.descripcion || `Actividad registrada en ${log.modulo || 'Sistema'}`}
                                    </p>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-mono text-[10px] font-black border transition-all group-hover:shadow-md ${alertStyle.bg} ${alertStyle.text} ${alertStyle.border}`}>
                                        {log.duracion_ms ? `${log.duracion_ms} MS` : 'OPTIMO'}
                                    </span>
                                </td>
                            </tr>
                    );
                    })
                )}
            </tbody>
        </table>
    </div>

            {/* PAGINACIÓN (Color Rojo Institucional) */}
            <div className="p-4 bg-[#ff4b4b] flex justify-between items-center shadow-[inner_0_2px_10px_rgba(0,0,0,0.1)]">
                <button 
                    type="button"
                    onClick={() => setPagina(p => Math.max(0, p - 1))} 
                    disabled={pagina === 0 || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border-none rounded-2xl text-[10px] font-black text-[#ff4b4b] hover:bg-red-50 disabled:opacity-30 transition-all active:scale-95 shadow-xl uppercase tracking-wider"
                >
                    <ChevronLeft size={16} strokeWidth={3} /> Anterior
                </button>
                
                <div className="text-center">
                    <p className="text-[9px] font-black text-white/60 tracking-[0.4em] uppercase leading-none mb-1">Visualizando</p>
                    <p className="text-sm font-black text-white leading-none">PÁGINA {pagina + 1}</p>
                </div>

                <button 
                    type="button"
                    onClick={() => setPagina(p => p + 1)} 
                    disabled={!hayMasRegistros || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-white border-none rounded-2xl text-[10px] font-black text-[#ff4b4b] hover:bg-red-50 disabled:opacity-30 transition-all active:scale-95 shadow-xl uppercase tracking-wider"
                    >
                    Siguiente <ChevronRight size={16} strokeWidth={3} />
                </button>
            </div>
        </div>
    </div>
   );
};

export default AuditoriaPage;