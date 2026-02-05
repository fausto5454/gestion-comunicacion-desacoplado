import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../config/supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileDown, RefreshCcw, LayoutDashboard, PieChart as PieIcon } from 'lucide-react';
import { toPng } from 'html-to-image';

const IGAEstadistica = () => {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const chartRef = useRef(null);
    const [filtros, setFiltros] = useState({
        bimestre: '1', grado: '1°', seccion: 'A', area: 'MATEMÁTICA'
    });

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

    const stats = useMemo(() => {
        const filtered = allData.filter(d => 
            d.bimestre.toString() === filtros.bimestre && d.grado === filtros.grado &&
            d.seccion === filtros.seccion && d.area === filtros.area
        );
        const count = (nota) => filtered.filter(d => d.logro_bimestral === nota).length;
        const total = filtered.length;

        const dataArr = [
            { name: 'DESTACADO (AD)', cant: count('AD'), color: '#16a34a' },
            { name: 'LOGRADO (A)', cant: count('A'), color: '#2563eb' },
            { name: 'PROCESO (B)', cant: count('B'), color: '#eab308' },
            { name: 'INICIO (C)', cant: count('C'), color: '#dc2626' }
        ];

        return {
            estudiantes: filtered,
            total,
            chartData: dataArr,
            resumen: dataArr.map(d => ({ ...d, percent: total > 0 ? ((d.cant / total) * 100).toFixed(0) : 0 }))
        };
    }, [allData, filtros]);

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

    // 3. EXPORTACIÓN A EXCEL CORREGIDA (GÉNERO COMBINADO Y ESTILOS)
   const exportarExcelCompleto = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte IGA');

        // 1. TÍTULO PRINCIPAL (B1 a J1)
        worksheet.mergeCells('B1:J1'); 
        const titleCell = worksheet.getCell('B1');
        titleCell.value = 'REPORTE CONSOLIDADO IGA 2026';
        titleCell.font = { bold: true, size: 14, name: 'Calibri' };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // 2. FILA DE FILTROS (Fila 2)
        worksheet.mergeCells('B2:C2');
        worksheet.getCell('B2').value = `ÁREA: ${filtros?.area || ''}`;
        worksheet.mergeCells('D2:E2');
        worksheet.getCell('D2').value = `GRADO: ${filtros?.grado || ''}`;
        worksheet.getCell('G2').value = `SECCIÓN: ${filtros?.seccion || ''}`;
        worksheet.mergeCells('I2:J2');
        worksheet.getCell('J2').value = `BIMESTRE: ${filtros?.bimestre || ''}`;

        worksheet.getRow(2).eachCell(c => {
            c.font = { size: 10, bold: true, name: 'Calibri' };
            c.alignment = { horizontal: 'left' };
        });

        worksheet.addRow([]); // Espacio (Fila 3)

        // 3. ENCABEZADOS DE TABLA (Fila 4 y 5)
        const h1 = worksheet.getRow(4);
        h1.values = [null, 'N°', 'ESTUDIANTE', 'GÉNERO', null, 'AD', 'A', 'B', 'C', 'LOGRO'];
        const h2 = worksheet.getRow(5);
        h2.values = [null, null, null, 'H', 'M', null, null, null, null, null];

        for (let i = 2; i <= 10; i++) {
            [h1, h2].forEach(row => {
                const cell = row.getCell(i);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, size: 10, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });
        }

        worksheet.mergeCells('B4:B5'); // N°
        worksheet.mergeCells('C4:C5'); // ESTUDIANTE
        worksheet.mergeCells('D4:E4'); // GÉNERO
        worksheet.mergeCells('F4:F5'); // AD
        worksheet.mergeCells('G4:G5'); // A
        worksheet.mergeCells('H4:H5'); // B
        worksheet.mergeCells('I4:I5'); // C
        worksheet.mergeCells('J4:J5'); // LOGRO

        // 4. DATOS
        let countH = 0; let countM = 0;
        (stats?.estudiantes || []).forEach((est, i) => {
            const genero = est.genero?.toUpperCase(); 
            if (genero === 'M') countM++; if (genero === 'H') countH++;

            const row = worksheet.addRow([
                null, i + 1, est.nombre_estudiante, 
                genero === 'H' ? '1' : '', genero === 'M' ? '1' : '', 
                est.logro_bimestral === 'AD' ? '1' : '', est.logro_bimestral === 'A' ? '1' : '',
                est.logro_bimestral === 'B' ? '1' : '', est.logro_bimestral === 'C' ? '1' : '',
                est.logro_bimestral
            ]);

            row.eachCell((c, colNum) => {
                if (colNum >= 2) {
                    c.font = { size: 10, name: 'Calibri' };
                    c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                    c.alignment = { horizontal: colNum === 3 ? 'left' : 'center' };
                }
            });
        });

        // 5. FILA TOTAL (AJUSTE: Combinación B y C corregida)
        const totalRowIndex = worksheet.lastRow.number + 1;
        worksheet.mergeCells(`B${totalRowIndex}:C${totalRowIndex}`); // Aquí se combinan B y C
        const totalRow = worksheet.getRow(totalRowIndex);
        
        // Asignamos el valor 'TOTAL' a la celda B (que ahora abarca B y C)
        totalRow.getCell(2).value = 'TOTAL';
        totalRow.getCell(4).value = countH;
        totalRow.getCell(5).value = countM;
        totalRow.getCell(6).value = stats.estudiantes.filter(e => e.logro_bimestral === 'AD').length;
        totalRow.getCell(7).value = stats.estudiantes.filter(e => e.logro_bimestral === 'A').length;
        totalRow.getCell(8).value = stats.estudiantes.filter(e => e.logro_bimestral === 'B').length;
        totalRow.getCell(9).value = stats.estudiantes.filter(e => e.logro_bimestral === 'C').length;
        totalRow.getCell(10).value = stats.estudiantes.length;

        totalRow.eachCell((c, colNum) => {
            if (colNum >= 2) {
                c.font = { bold: true, size: 10 };
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                c.alignment = { horizontal: 'center' };
            }
        });

        // 6. RESUMEN (Alineado con las columnas combinadas)
        worksheet.addRow([]);
        const resRowIdx = worksheet.lastRow.number + 1;
        
        worksheet.mergeCells(`B${resRowIdx}:C${resRowIdx}`);
        worksheet.getCell(`B${resRowIdx}`).value = 'RESUMEN';
        worksheet.mergeCells(`D${resRowIdx}:E${resRowIdx}`);
        worksheet.getCell(`D${resRowIdx}`).value = 'CANTIDAD';
        worksheet.mergeCells(`F${resRowIdx}:H${resRowIdx}`);
        worksheet.getCell(`F${resRowIdx}`).value = 'PORCENTAJE';

        worksheet.getRow(resRowIdx).eachCell(c => {
            if (c.value) {
                c.font = { bold: true, size: 10 };
                c.alignment = { horizontal: 'center' };
            }
        });

        (stats?.resumen || []).forEach(r => {
            const rIdx = worksheet.lastRow.number + 1;
            worksheet.mergeCells(`B${rIdx}:C${rIdx}`);
            worksheet.getCell(`B${rIdx}`).value = r.name;
            worksheet.mergeCells(`D${rIdx}:E${rIdx}`);
            worksheet.getCell(`D${rIdx}`).value = r.cant;
            worksheet.mergeCells(`F${rIdx}:H${rIdx}`);
            worksheet.getCell(`F${rIdx}`).value = `${r.percent}%`;

            const colorHex = r.color?.replace('#', 'FF').toUpperCase() || 'FFCCCCCC';
            [`B${rIdx}`, `E${rIdx}`, `G${rIdx}`].forEach(ref => {
                const cell = worksheet.getCell(ref);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorHex } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.alignment = { horizontal: 'center' };
            });
        });

        // 7. GRÁFICO
        if (chartRef.current) {
            try {
                const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
                const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
                worksheet.addImage(imageId, {
                    tl: { col: 2, row: worksheet.lastRow.number + 2 },
                    ext: { width: 450, height: 250 }
                });
            } catch (e) { console.error("Error gráfico:", e); }
        }

        // --- AJUSTE DE ANCHOS (Reducción de columna C) ---
        worksheet.getColumn(1).width = 2;   // Margen A
        worksheet.getColumn(2).width = 5;   // N°
        worksheet.getColumn(3).width = 30;  // ESTUDIANTE (Antes era 45, ahora es más estrecha)
        worksheet.getColumn(4).width = 5;   // H
        worksheet.getColumn(5).width = 5;   // M

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Consolidado_IGA_${filtros?.area || 'Reporte'}.xlsx`);

    } catch (error) {
        console.error("Error:", error);
    
   };

        // 8. RESUMEN Y GRÁFICO (Restaurados)
        worksheet.addRow([]);
        const resHeader = worksheet.addRow(['RESUMEN', 'CANTIDAD', 'PORCENTAJE']);
        resHeader.eachCell(c => { c.font = { bold: true }; c.alignment = { horizontal: 'center' }; });

        stats.resumen.forEach(r => {
            const row = worksheet.addRow([r.name, r.cant, `${r.percent}%`]);
            const cleanColor = r.color.replace('#', 'FF').toUpperCase();
            row.eachCell((c, colNum) => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cleanColor } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                c.alignment = { horizontal: colNum === 1 ? 'left' : 'center' };
            });
        });

        // Configuración de anchos y Gráfico
        worksheet.getColumn(2).width = 35;
        worksheet.getColumn(3).width = 6;
        worksheet.getColumn(4).width = 6;

        if (chartRef.current) {
            try {
                const dataUrl = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
                const imageId = workbook.addImage({ base64: dataUrl, extension: 'png' });
                worksheet.addImage(imageId, {
                    tl: { col: 2, row: worksheet.rowCount + 2 },
                    ext: { width: 500, height: 300 }
                });
            } catch (e) { console.error(e); }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Consolidado_IGA_${filtros.area}.xlsx`);
        
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            <div className="bg-yellow-200 p-6 rounded-[2rem] shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Área Curricular</label>
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
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Bimestre</label>
                    <select value={filtros.bimestre} onChange={(e) => setFiltros({...filtros, bimestre: e.target.value})} className="w-full bg-green-600 border-none rounded-xl text-white font-bold p-3">
                        <option value="1">1° Bimestre</option><option value="2">2° Bimestre</option>
                        <option value="3">3° Bimestre</option><option value="4">4° Bimestre</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Grado / Sección</label>
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
                <button onClick={exportarExcelCompleto} className="bg-slate-900 text-white p-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg">
                    <FileDown size={18} /> EXPORTAR EXCEL + GRÁFICO
                </button>
                <div className="flex items-center gap-2 text-[12px] font-bold text-sky-600 p-3">
                    <RefreshCcw size={14} className={loading ? "animate-spin text-green-500" : ""} /> {loading ? "Sincronizando..." : "Sincronizado Realtime"}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.resumen.map((item, i) => (
                    <div key={i} className="bg-emerald-200 p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{item.name}</p>
                        <div className="flex justify-between items-end mt-2">
                            <p className="text-3xl font-black text-slate-800">{item.cant}</p>
                            <p className="text-sm font-black px-2 py-1 rounded-lg bg-slate-50" style={{color: item.color}}>{item.percent}%</p>
                        </div>
                    </div>
                ))}
            </div>

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