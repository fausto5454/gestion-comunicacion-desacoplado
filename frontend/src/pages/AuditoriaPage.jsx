import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ShieldCheck, Search, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const AuditoriaPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('');
    
    // Estados para la paginación
    const [pagina, setPagina] = useState(0);
    const registrosPorPagina = 10;
    const [hayMasRegistros, setHayMasRegistros] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [pagina]); // Se recarga cuando cambia la página

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
            // Si el número de registros devueltos es menor al límite, no hay más
            setHayMasRegistros(data.length === registrosPorPagina);
        } catch (error) {
            console.error("Error cargando auditoría:", error.message);
        } finally {
            setLoading(false);
        }
    };

    const logsFiltrados = logs.filter(log => 
        log.usuario_responsable?.toLowerCase().includes(filtro.toLowerCase()) ||
        log.accion?.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700">
            {/* ENCABEZADO Y BUSCADOR (Igual al anterior) */}
            <div className="bg-green-300/50 p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
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

            {/* TABLA DE REGISTROS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        {/* THEAD (Igual al anterior) */}
                        <thead>
                            <tr className="bg-gray-200 border-b border-gray-100">
                                <th className="p-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Fecha y Hora</th>
                                <th className="p-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Responsable</th>
                                <th className="p-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Acción</th>
                                <th className="p-5 text-[10px] font-black uppercase text-gray-500 tracking-widest">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {/* Renderizado de logsFiltrados (Igual al anterior) */}
                            {loading ? (
                                <tr><td colSpan="4" className="p-10 text-center animate-pulse">Cargando...</td></tr>
                            ) : logsFiltrados.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50/50">
                                    <td className="p-5 text-xs font-bold text-gray-600">
                                        {new Date(log.fecha_hora).toLocaleString()}
                                    </td>
                                    <td className="p-5 text-xs font-black text-gray-700">{log.usuario_responsable}</td>
                                    <td className="p-5">
                                        <span className="text-[10px] bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-black uppercase">
                                            {log.accion}
                                        </span>
                                    </td>
                                    <td className="p-5 text-xs text-gray-500 italic">{log.descripcion}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* CONTROLES DE PAGINACIÓN */}
                <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                    <button 
                        onClick={() => setPagina(p => Math.max(0, p - 1))}
                        disabled={pagina === 0 || loading}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>

                    <span className="text-xs font-black text-green-400 uppercase tracking-widest">
                        Página {pagina + 1}
                    </span>

                    <button 
                        onClick={() => setPagina(p => p + 1)}
                        disabled={!hayMasRegistros || loading}
                        className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuditoriaPage;