import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../config/supabaseClient';
import * as XLSX from 'xlsx'; // Importación para Excel
import { Download } from 'lucide-react';

const DashboardPage = ({ userEmail }) => {
    const [statsData, setStatsData] = useState({
        usuarios: 0,
        mensajes: 0,
        alertas: 0,
        documentos: 0,
        grafico: [],
        rawMessages: [] // Guardamos los datos para exportar
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const { count: userCount } = await supabase
                    .from('usuarios')
                    .select('*', { count: 'exact', head: true });

                const { data: comunicaciones } = await supabase
                    .from('comunicaciones')
                    .select('fecha_envio, prioridad, archivo_url, titulo, estado');

                if (comunicaciones) {
                    const totalMsgs = comunicaciones.length;
                    const alertasHoy = comunicaciones.filter(m => {
                        const hoy = new Date().toISOString().split('T')[0];
                        const fechaMsg = new Date(m.fecha_envio).toISOString().split('T')[0];
                        return m.prioridad === 'Urgente' && hoy === fechaMsg;
                    }).length;

                    const totalDocs = comunicaciones.filter(m => m.archivo_url !== null).length;
                    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
                    const hoy = new Date();
                    const ultimos7Dias = {};

                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(hoy.getDate() - i);
                        ultimos7Dias[d.toISOString().split('T')[0]] = { 
                            name: diasSemana[d.getDay()], 
                            mensajes: 0 
                        };
                    }

                    comunicaciones.forEach(m => {
                        const fecha = new Date(m.fecha_envio).toISOString().split('T')[0];
                        if (ultimos7Dias[fecha]) ultimos7Dias[fecha].mensajes += 1;
                    });

                    setStatsData({
                        usuarios: userCount || 0,
                        mensajes: totalMsgs,
                        alertas: alertasHoy,
                        documentos: totalDocs,
                        grafico: Object.values(ultimos7Dias),
                        rawMessages: comunicaciones
                    });
                }
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    // FUNCIÓN PARA EXPORTAR A EXCEL
    const exportarExcel = () => {
        const dataParaExcel = statsData.rawMessages.map(m => ({
            Fecha: new Date(m.fecha_envio).toLocaleString(),
            Asunto: m.titulo,
            Prioridad: m.prioridad,
            Estado: m.estado,
            Tiene_Adjunto: m.archivo_url ? 'SÍ' : 'NO'
        }));

        const ws = XLSX.utils.json_to_sheet(dataParaExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte Comunicaciones");
        XLSX.writeFile(wb, `Reporte_Sistema_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const stats = [
        { label: 'Usuarios Activos', value: statsData.usuarios.toString(), icon: "👥", color: 'bg-blue-500' },
        { label: 'Mensajes Enviados', value: statsData.mensajes.toLocaleString(), icon: "📩", color: 'bg-green-600' },
        { label: 'Documentos', value: statsData.documentos.toString(), icon: "📄", color: 'bg-purple-500' },
        { label: 'Alertas Hoy', value: statsData.alertas.toString(), icon: "🔔", color: 'bg-amber-500' },
    ];

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* CABECERA */}
            <div className="bg-yellow-300/80 p-6 rounded-3xl border border-green-200/50 shadow-sm relative overflow-hidden flex justify-between items-center">
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 leading-tight">Bienvenido al Sistema</h1>
                    <p className="text-xs md:text-sm text-green-600 font-bold tracking-widest mt-1">Panel de control • Gestión de comunicaciones</p>
                </div>
                <button 
                    onClick={exportarExcel}
                    className="relative z-10 flex items-center gap-2 bg-green-600 hover:bg-white text-white px-4 py-2 rounded-2xl text-xs font-black shadow-sm transition-all active:scale-95 uppercase tracking-wider"
                >
                    <Download size={14} /> Exportar Excel
                </button>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-green-200/30 rounded-full blur-3xl"></div>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-emerald-200 p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center hover:shadow-md transition-all group">
                        <div className={`${stat.color} w-14 h-14 rounded-2xl text-white flex items-center justify-center text-2xl group-hover:rotate-6 transition-transform shadow-lg shadow-gray-200`}>
                            {stat.icon}
                        </div>
                        <div className="ml-5">
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">{stat.label}</p>
                            <p className="text-3xl font-black text-gray-800 leading-none mt-1">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>
            {/* GRÁFICO Y SIDEBAR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-sky-100 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-800">Flujo de Actividad</h2>
                            <p className="text-xs text-gray-400 font-bold">Interacciones del sistema por semana</p>
                        </div>
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-4 py-1.5 rounded-full uppercase tracking-tighter">Últimos 7 días</span>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statsData.grafico}>
                                <defs>
                                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} itemStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="mensajes" stroke="#16a34a" strokeWidth={4} fillOpacity={1} fill="url(#colorMsg)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-sky-100 p-8 rounded-3xl shadow-sm border border-gray-100 h-full">
                        <h2 className="text-xl font-black text-gray-800 mb-6">Información</h2>
                        <div className="space-y-4">
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 transition-hover hover:bg-blue-50">
                                <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest">Estado de Conexión</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                    <p className="text-sm font-bold text-gray-700">Usuario Conectado</p>
                                </div>
                            </div>
                            <div className="p-5 border border-gray-100 rounded-2xl hover:border-green-200 transition-colors">
                                <p className="text-[10px] text-gray-400 font-black mb-2 uppercase tracking-widest">Correo Institucional</p>
                                <p className="text-sm font-bold text-gray-600 break-all">{userEmail}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;