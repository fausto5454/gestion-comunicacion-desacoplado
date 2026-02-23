import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { supabase } from '../config/supabaseClient';
import { Monitor, GraduationCap, ClipboardCheck, Send, AlertTriangle, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';

const DashboardPage = ({session}) => {
    // ESTADOS DE CONTROL
    const [aula, setAula] = useState('1° A');
    const [area, setArea] = useState('MATEMÁTICA');
    const [bimestre, setBimestre] = useState(1);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalNotas: 0, aprobados: 0, totalComs: 0, urgentes: 0,
        leidos: 0, pendientes: 0,
        dataPie: [], dataFlujo: []
    });

    const aulas = ['1° A', '1° B', '1° C', '2° A', '2° B', '2° C', '3° A', '3° B', '4° A', '4° B', '5° A', '5° B'];
    const areas = ['MATEMÁTICA', 'COMUNICACIÓN', 'CIENCIA Y TECNOLOGÍA', 'DPCC', 'PERSONAL SOCIAL', 'EPT', 'RELIGIÓN', 'INGLÉS', 'ARTE Y CULTURA', 'EDUCACIÓN FÍSICA'];

    useEffect(() => {
        if (!aula || !area || !bimestre) return;

     const fetchAllData = async () => {
    // FIX: Verificar que la sesión exista antes de continuar
    if (!session?.user?.id) return;
    const userId = session.user.id;

    setLoading(true);
    try {
        const [grado, seccion] = aula.split(' ');

        const [nResponse, cResponse] = await Promise.all([
            // 1. Calificaciones (SÍ tiene columna 'area')
            supabase.from('calificaciones')
                .select('logro_bimestral')
                .eq('grado', grado)
                .eq('seccion', seccion)
                .eq('area', area)
                .eq('bimestre', bimestre),
            
            // 2. Comunicaciones (NO tiene columna 'area' - Eliminamos el filtro)
            supabase.from('comunicaciones')
                .select('*')
                .or(`remitente_id.eq.${userId},matricula_id.eq.${userId}`) // Filtro correcto por ID
             ]);

        if (cResponse.error) throw cResponse.error;

                const nData = nResponse.data;
                const cData = cResponse.data;

                if (nData) {
                    const total = nData.length;
                    const countAD = nData.filter(n => n.logro_bimestral === 'AD').length;
                    const countA  = nData.filter(n => n.logro_bimestral === 'A').length;
                    const countB  = nData.filter(n => n.logro_bimestral === 'B').length;
                    const countC  = nData.filter(n => n.logro_bimestral === 'C').length;

                    const totalC = cData?.length || 0;
                    // Simulación de lectura (puedes conectar a tu tabla de confirmaciones real)
                    const leidosCount = Math.round(totalC * 0.4); 

                    setStats({
                        totalNotas: total,
                        aprobados: countAD + countA,
                        totalComs: totalC,
                        urgentes: cData?.filter(c => c.prioridad === 'Urgente').length || 0,
                        leidos: leidosCount,
                        pendientes: totalC - leidosCount,
                        dataPie: [
                            { name: 'AD', value: countAD, color: '#10b981' },
                            { name: 'A',  value: countA,  color: '#3b82f6' },
                            { name: 'B',  value: countB,  color: '#f59e0b' },
                            { name: 'C',  value: countC,  color: '#ef4444' },
                        ].filter(item => item.value > 0),
                        dataFlujo: [
                            { name: 'Sem 1', v: Math.floor(total * 0.2) },
                            { name: 'Sem 2', v: Math.floor(total * 0.5) },
                            { name: 'Sem 3', v: total }
                        ]
                    });
                }
            } catch (err) {
                console.error("Error cargando datos:", err);
            } finally {
                // Pequeño delay para que la transición no sea brusca
                setTimeout(() => setLoading(false), 500);
            }
        };
        fetchAllData();
    }, [aula, area, bimestre]);

    return (
        <div className="p-6 space-y-6 bg-gray-200 min-h-screen relative">
        {/* CABECERA DINÁMICA CORREGIDA */}
       <header className="bg-sky-900 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4">
       {/* Título e Icono: Se alinean al centro en móvil, a la izquierda en desktop */}
        <div className="flex items-center gap-3 md:gap-4 w-full xl:w-auto justify-center md:justify-start">
          <div className="bg-[#00a859] p-2 md:p-3 rounded-xl md:rounded-2xl text-white shadow-lg shrink-0">
            <Monitor size={window.innerWidth < 768 ? 20 : 24} />
             </div>
               <div className="text-center md:text-left">
               <h1 className="text-lg md:text-xl font-black text-green-400 tracking-tight uppercase leading-tight">
                  Bienvenidos al Sistema
               </h1>
               <p className="text-[9px] md:text-[10px] text-white font-bold uppercase tracking-widest leading-none mt-1">
              I.E. 2079 Antonio Raimondi
            </p>
        </div>
    </div>
    {/* ZONA DE FILTROS: En móvil se apilan o distribuyen equitativamente */}
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 w-full xl:w-auto">
    {/* Bloque Bimestre: Scroll horizontal suave si el espacio es muy pequeño */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner w-full sm:w-auto justify-center">
            {[1, 2, 3, 4].map(b => (
                <button key={b} onClick={() => setBimestre(b)}
                    className={`flex-1 sm:flex-none px-1 md:px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                        bimestre === b ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}>
                    {b}° BIM
                </button>
            ))}
        </div>
        {/* Contenedor de Selectores: Dos columnas en móviles pequeños, fila en desktop */}
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            {/* Selector Aula */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 md:px-3 py-2 hover:bg-white transition-all shadow-sm">
                <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mr-1 md:mr-2 border-r pr-1 md:pr-2 border-slate-200">Aula</span>
                <select 
                    value={aula} 
                    onChange={e => setAula(e.target.value)} 
                    className="bg-transparent border-none font-bold text-[10px] md:text-xs focus:ring-0 outline-none cursor-pointer text-slate-700 w-full sm:w-auto min-w-[40px]"
                     >
                    {aulas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            {/* Selector Área */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 md:px-2 py-2 hover:bg-white transition-all shadow-sm">
                <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mr-1 md:mr-2 border-r pr-1 md:pr-2 border-slate-200">Área</span>
                <select 
                    value={area} 
                    onChange={e => setArea(e.target.value)} 
                    className="bg-transparent border-none font-bold text-[10px] md:text-[11px] uppercase focus:ring-0 outline-none cursor-pointer text-slate-700 w-full sm:w-auto max-w-[120px] md:max-w-[180px] truncate"
                    >
                    {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </div>
        </header>
          {/* TARJETAS KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card label="Progreso Registro" value={stats.totalNotas} color="border-emerald-500" icon={<ClipboardCheck size={20} className="text-emerald-500" />} />
                <Card label="Efectividad AD/A" value={`${stats.totalNotas > 0 ? Math.round((stats.aprobados/stats.totalNotas)*100) : 0}%`} color="border-blue-500" icon={<GraduationCap size={20} className="text-blue-500" />} />
                <Card label="Comunicaciones" value={stats.totalComs} color="border-purple-500" icon={<MessageSquare size={20} className="text-purple-500" />} />
                <Card label="Alertas Críticas" value={stats.urgentes} color="border-rose-500" icon={<AlertTriangle size={20} className="text-rose-500" />} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SALUD ACADÉMICA (PIE CHART) */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <h3 className="font-black text-slate-700 text-xs mb-8 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Salud Académica - {area}
                    </h3>
                    <div className="h-72">
                        <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={stats.dataPie} 
                                    innerRadius={70} 
                                    outerRadius={105} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    stroke="none"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '11px', fontWeight: '900' }}>
                                                {`${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        );
                                    }}
                                    >
                                    {stats.dataPie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                {/* TASA DE LECTURA CON ALERTAS DINÁMICAS */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <h3 className="font-black text-slate-700 text-xs mb-8 uppercase tracking-widest flex items-center gap-2">
                             <Send size={14} className="text-purple-500" /> Seguimiento de Padres
                        </h3>
                        <div className="space-y-10">
                            <ProgressItem 
                                label="Leídos / Confirmados" 
                                current={stats.leidos} 
                                total={stats.totalComs} 
                                color="bg-emerald-500" 
                            />
                            <ProgressItem 
                                label="Sin Confirmar (Pendientes)" 
                                current={stats.pendientes} 
                                total={stats.totalComs} 
                                // CAMBIO DINÁMICO DE COLOR: Si hay muchos pendientes (>50%), se pone rojo
                                color={stats.pendientes > (stats.totalComs / 2) ? "bg-rose-500" : "bg-slate-200"} 
                            />
                        </div>
                    </div>
                    <div className={`mt-6 p-4 rounded-2xl border border-dashed transition-colors ${stats.pendientes > (stats.totalComs/2) ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Estado de Gestión:</p>
                        <p className="text-[11px] font-bold text-slate-600 leading-tight">
                            {stats.pendientes > (stats.totalComs / 2) 
                                ? "⚠️ Atención prioritaria: Gran cantidad de padres no han leído los comunicados." 
                                : "✅ La mayoría de padres están informados correctamente."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
// COMPONENTES AUXILIARES
const Card = ({ label, value, color, icon }) => (
    <div className={`bg-white p-6 rounded-[2.2rem] shadow-sm border-b-[6px] ${color} flex flex-col items-center justify-center text-center transition-all hover:-translate-y-2 hover:shadow-lg`}>
        <div className="mb-2 p-3 bg-slate-50 rounded-2xl">{icon}</div>
        <p className="text-4xl font-black text-slate-800 tracking-tighter">{value}</p>
        <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{label}</p>
    </div>
);
const ProgressItem = ({ label, current, total, color }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
                <span className="text-xs font-black text-slate-800">{Math.round(percentage)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner border border-slate-50">
                <div 
                    className={`${color} h-full rounded-full transition-all duration-1000 ease-in-out`} 
                    style={{ width: `${percentage}%` }}
                 />
             </div>
         </div>
     );
 };

 export default DashboardPage;