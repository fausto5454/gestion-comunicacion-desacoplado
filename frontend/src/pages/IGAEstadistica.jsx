import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../config/supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileDown, RefreshCcw, LayoutDashboard, PieChart as PieIcon, MapPin } from 'lucide-react';
import { toPng } from 'html-to-image'; // Asegúrate de instalar esta librería: npm install html-to-image

const IGAEstadistica = () => {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const chartRef = useRef(null); // Referencia para capturar el gráfico
    const [filtros, setFiltros] = useState({
        bimestre: '1', grado: '1°', seccion: 'A', area: 'MATEMÁTICA'
    });

    // 1. CONEXIÓN REALTIME CON SUPABASE
    useEffect(() => {
        const fetchDatos = async () => {
            setLoading(true);
            const { data } = await supabase.from('calificaciones').select('*');
            setAllData(data || []);
            setLoading(false);
        };
        fetchDatos();

        const channel = supabase.channel('cambios-notas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones' }, () => fetchDatos())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    // 2. LÓGICA DE DATOS Y COLORES SOLICITADOS
    const stats = useMemo(() => {
        const filtered = allData.filter(d => 
            d.bimestre.toString() === filtros.bimestre && d.grado === filtros.grado &&
            d.seccion === filtros.seccion && d.area === filtros.area
        );
        const count = (nota) => filtered.filter(d => d.logro_bimestral === nota).length;
        const total = filtered.length;

        const dataArr = [
            { name: 'DESTACADO (AD)', cant: count('AD'), color: '#16a34a' }, // Verde
            { name: 'LOGRADO (A)', cant: count('A'), color: '#2563eb' },    // Azul
            { name: 'PROCESO (B)', cant: count('B'), color: '#eab308' },    // Amarillo
            { name: 'INICIO (C)', cant: count('C'), color: '#dc2626' }      // Rojo
        ];

        return {
            estudiantes: filtered,
            total,
            chartData: dataArr,
            resumen: dataArr.map(d => ({ ...d, percent: total > 0 ? ((d.cant / total) * 100).toFixed(0) : 0 }))
        };
    }, [allData, filtros]);

    // Función auxiliar para renderizar el porcentaje dentro del gráfico
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return percent > 0 ? (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[12px] font-black">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        ) : null;
    };

    // 3. EXPORTACIÓN A EXCEL CON BORDES, RESUMEN Y GRÁFICO INTEGRADO
    const exportarExcelCompleto = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte IGA');

        worksheet.addRow(['REPORTE CONSOLIDADO IGA 2026']).font = { bold: true, size: 14 };
        worksheet.addRow([`ÁREA: ${filtros.area}`, `GRADO: ${filtros.grado}`, `SECCIÓN: ${filtros.seccion}`, `BIMESTRE: ${filtros.bimestre}`]);
        worksheet.addRow([]);

        const headerRow = worksheet.addRow(['N°', 'ESTUDIANTE', 'AD', 'A', 'B', 'C', 'LOGRO']);
        headerRow.eachCell(c => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
            c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        });

        stats.estudiantes.forEach((est, i) => {
            const row = worksheet.addRow([i + 1, est.nombre_estudiante, 
                est.logro_bimestral === 'AD' ? 'X' : '', est.logro_bimestral === 'A' ? 'X' : '',
                est.logro_bimestral === 'B' ? 'X' : '', est.logro_bimestral === 'C' ? 'X' : '',
                est.logro_bimestral
            ]);
            row.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        });

        worksheet.addRow([]);
        const rTitle = worksheet.addRow(['RESUMEN', 'CANTIDAD', 'PORCENTAJE']);
        rTitle.eachCell(c => { c.font = { bold: true }; c.border = { bottom: {style:'medium'} }; });
        
        stats.resumen.forEach(r => {
            const row = worksheet.addRow([r.name, r.cant, `${r.percent}%`]);
            row.eachCell(c => c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} });
        });

        worksheet.getColumn(2).width = 30;

        if (chartRef.current) {
            try {
                const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
                const imageId = workbook.addImage({
                    base64: dataUrl,
                    extension: 'png',
                });
                worksheet.addImage(imageId, {
                    tl: { col: 0, row: worksheet.rowCount + 1 },
                    ext: { width: 500, height: 350 }
                });
            } catch (error) {
                console.error("No se pudo generar el gráfico para el Excel", error);
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Consolidado_IGA_${filtros.area}.xlsx`);
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            {/* SELECTORES DINÁMICOS */}
            <div className="bg-green-200 p-6 rounded-[2rem] shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Área Curricular</label>
                    <select value={filtros.area} onChange={(e) => setFiltros({...filtros, area: e.target.value})} className="w-full bg-green-600 border-none rounded-xl text-white font-bold p-3">
                        <option value="MATEMÁTICA">Matemática</option>
                        <option value="COMUNICACIÓN">Comunicación</option>
                        <option value="ARTE Y CULTURA">Arte y Cultura</option>
                        <option value="PERSONAL SOCIAL">Personal Social</option>
                        <option value="DPCC">DPCC</option>
                        <option value="CIENCIA Y TECNOLOGÍA">Ciencia y Tecnología</option>
                        <option value="EDUCACIÓN FÍSICA">Educación Física</option>
                        <option value="EPT">EPT</option>
                        <option value="RELIGIÓN">Religión</option>
                        <option value="INGLÉS">Inglés</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Bimestre</label>
                    <select value={filtros.bimestre} onChange={(e) => setFiltros({...filtros, bimestre: e.target.value})} className="w-full bg-green-600 border-none rounded-xl text-white font-bold p-3">
                        <option value="1">1° Bimestre</option><option value="2">2° Bimestre</option>
                        <option value="3">3° Bimestre</option><option value="4">4° Bimestre</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Grado / Sección</label>
                    <div className="flex gap-1">
                        <select value={filtros.grado} onChange={(e) => setFiltros({...filtros, grado: e.target.value})} className="w-full bg-green-600 border-none rounded-xl text-white text-[10px] font-bold p-3">
                            <option value="1°">1° Sec</option><option value="2°">2° Sec</option>
                            <option value="3°">3° Sec</option><option value="4°">4° Sec</option>
                            <option value="5°">5° Sec</option>
                        </select>
                        <select value={filtros.seccion} onChange={(e) => setFiltros({...filtros, seccion: e.target.value})} className="w-full bg-green-600 border-none rounded-xl text-white text-[10px] font-bold p-3">
                            <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                        </select>
                    </div>
                </div>
                <button onClick={exportarExcelCompleto} className="bg-slate-900 text-white p-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg">
                    <FileDown size={18} /> EXPORTAR EXCEL + GRÁFICO
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 p-3">
                    <RefreshCcw size={14} className={loading ? "animate-spin text-green-500" : ""} /> {loading ? "Sincronizando..." : "Sincronizado Realtime"}
                </div>
            </div>

            {/* RESUMEN ESTADÍSTICO EN INTERFAZ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.resumen.map((item, i) => (
                    <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{item.name}</p>
                        <div className="flex justify-between items-end mt-2">
                            <p className="text-3xl font-black text-slate-800">{item.cant}</p>
                            <p className="text-sm font-black px-2 py-1 rounded-lg bg-slate-50" style={{color: item.color}}>{item.percent}%</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* GRÁFICOS PIECHART Y BARCHART */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-[380px]">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
                        <LayoutDashboard size={14} className="text-green-600"/> Rendimiento: {filtros.area}
                    </h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={stats.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" hide />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{borderRadius: '15px', border: 'none'}} />
                            <Bar dataKey="cant" radius={[10, 10, 0, 0]} barSize={50}>
                                {stats.chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div ref={chartRef} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 h-[380px]">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
                        <PieIcon size={14} className="text-blue-600"/> Distribución de Logros
                    </h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie 
                                data={stats.chartData} 
                                innerRadius={60} 
                                outerRadius={110} 
                                paddingAngle={5} 
                                dataKey="cant"
                                labelLine={false}
                                label={renderCustomizedLabel}
                            >
                                {stats.chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default IGAEstadistica;