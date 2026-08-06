import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../config/supabaseClient';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { FileDown, RefreshCcw, LayoutDashboard, PieChart as PieIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Chart as ChartJS, ArcElement, BarElement, Tooltip, Title, LinearScale, CategoryScale, Legend } from 'chart.js';
import {Bar, Doughnut} from 'react-chartjs-2';
import { percentageLabelPlugin } from "../utils/dashboardPlugins";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const IGAEstadistica = () => {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const chartRef = useRef(null);
    const [filtros, setFiltros] = useState({
        bimestre: '1', grado: '1°', seccion: 'A', area: 'MATEMÁTICA'
    });

    const OPCIONES_GRADO_SECCION = [
        { value: '1A', label: '1° A' }, { value: '1B', label: '1° B' }, { value: '1C', label: '1° C' },
        { value: '2A', label: '2° A' }, { value: '2B', label: '2° B' }, { value: '2C', label: '2° C' },
        { value: '3A', label: '3° A' }, { value: '3B', label: '3° B' },
        { value: '4A', label: '4° A' }, { value: '4B', label: '4° B' },
        { value: '5A', label: '5° A' }, { value: '5B', label: '5° B' },
    ];

    useEffect(() => {
        const fetchDatos = async () => {
            setLoading(true);
            
            // ¡EL SECRETO! Filtramos directamente en Supabase para evitar el límite de 1000 filas
            const { data, error } = await supabase
                .from('calificaciones')
                .select('*')
                .eq('bimestre', filtros.bimestre)
                .eq('grado', filtros.grado.trim())
                .eq('seccion', filtros.seccion.trim())
                .eq('area', filtros.area.trim());

            if (error) {
                console.error("Error obteniendo datos de Supabase:", error);
            }

            setAllData(data || []);
            setLoading(false);
        };
        
        fetchDatos();

        // Actualizamos Realtime
        const channel = supabase.channel('cambios-notas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones' }, () => {
                fetchDatos(); // Vuelve a consultar si alguien inserta una nota nueva
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
        
    }, [filtros]);

   const stats = useMemo(() => {
        const notasValidas = ['AD', 'A', 'B', 'C'];

        // 1. Descartamos a los 4 trasladados (quedan exactamente los 31 con notas)
        const estudiantesEvaluados = allData.filter(d => {
            const notaLimpia = (d.logro_bimestral || '').trim().toUpperCase();
            return notasValidas.includes(notaLimpia);
        });

        // 2. Contamos basados en los 31 activos
        const count = (nota) => estudiantesEvaluados.filter(d => 
            (d.logro_bimestral || '').trim().toUpperCase() === nota
        ).length;
        
        const total = estudiantesEvaluados.length; // ¡Ahora dará 31 inamovible!

        const dataValues = [count('AD'), count('A'), count('B'), count('C')];
        const colors = ['#05aa13', '#0b61ec', '#d1bd05', '#f82c2c'];

       return {
           estudiantes: estudiantesEvaluados, // Exporta los 31 al Excel
           total, // 31
           values: dataValues,
           colors: colors,
           resumen: [
               { name: 'DESTACADO (AD)', cant: dataValues[0], color: colors[0], percent: total > 0 ? Math.round((dataValues[0] / total) * 100) : 0 },
               { name: 'LOGRADO (A)', cant: dataValues[1], color: colors[1], percent: total > 0 ? Math.round((dataValues[1] / total) * 100) : 0 },
               { name: 'PROCESO (B)', cant: dataValues[2], color: colors[2], percent: total > 0 ? Math.round((dataValues[2] / total) * 100) : 0 },
               { name: 'INICIO (C)', cant: dataValues[3], color: colors[3], percent: total > 0 ? Math.round((dataValues[3] / total) * 100) : 0 }
           ]
       };
    }, [allData]);

    // Manejador para el selector de Grado y Sección
    const handleGradoChange = (valorCombo) => {
        const gradoNum = valorCombo.charAt(0);
        const seccionLetra = valorCombo.charAt(1);
        setFiltros(prev => ({
            ...prev,
            grado: `${gradoNum}°`,
            seccion: seccionLetra
        }));
    };

    const dataConfig = {
        labels: ['DESTACADO (AD)', 'LOGRADO (A)', 'PROCESO (B)', 'INICIO (C)'],
        datasets: [{
            label: 'Estudiantes',
            data: stats.values,
            backgroundColor: stats.colors,
            borderRadius: 10,
        }]
    };

    // 3. EXPORTACIÓN A EXCEL CORREGIDA (GÉNERO COMBINADO Y ESTILOS)
   const exportarExcelCompleto = async () => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte IGA');

        // 1. TÍTULO PRINCIPAL (B1 a J1)
        worksheet.mergeCells('B1:J1'); 
        const titleCell = worksheet.getCell('B1');
        titleCell.fill = {
             type: 'pattern',
             pattern: 'solid',
             fgColor: { argb: 'FF047857' } 
             };
        titleCell.value = 'REPORTE CONSOLIDADO IGA 2026';
        titleCell.font = {
             name: 'Calibri',
             size: 14,
             bold: true,
             color: { argb: 'FFFFFFFF' } // Texto en blanco para contraste
            };
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
            c.font = { size: 9, bold: true, name: 'Calibri' };
            c.alignment = { horizontal: 'left' };
        });

        worksheet.addRow([]); // Espacio (Fila 3)

        // 3. ENCABEZADOS DE TABLA (Fila 4 y 5)
       const h1 = worksheet.getRow(4);
       h1.values = [null, 'N°', 'APELLIDOS Y NOMBRES', 'GÉNERO', null, 'AD', 'A', 'B', 'C', 'LOGRO'];
       const h2 = worksheet.getRow(5);
       h2.values = [null, null, null, 'H', 'M', null, null, null, null, null];

       for (let i = 2; i <= 10; i++) {
          [h1, h2].forEach(row => {
          const cell = row.getCell(i);
        
          // DISEÑO PARA LA CELDA "LOGRO" (Columna 10)
          if (i === 10) {
              cell.fill = { 
                  type: 'pattern', 
                  pattern: 'solid', 
                  fgColor: { argb: 'FFD97706' } // Naranja/Ámbar vibrante del diseño
              };
              cell.font = { color: { argb: 'FFFFFFFF' }, size: 9, bold: true }; // Texto blanco
           } 
           // DISEÑO PARA EL RESTO DE CABECERAS (Verde)
           else {
               cell.fill = { 
                   type: 'pattern', 
                   pattern: 'solid', 
                   fgColor: { argb: 'FF16A34A' } 
              };
               cell.font = { color: { argb: 'FFFFFFFF' }, size: 9, bold: true };
            }

            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { 
                top: {style:'thin'}, left: {style:'thin'}, 
                bottom: {style:'thin'}, right: {style:'thin'} 
             };
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

        const estudiantesOrdenados = [...(stats?.estudiantes || [])].sort((a, b) => {
            const nombreA = (a.nombre_estudiante || '').trim().toUpperCase();
            const nombreB = (b.nombre_estudiante || '').trim().toUpperCase();
            return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
        });

         estudiantesOrdenados.forEach((est, i) => {
            const genero = est.genero?.toUpperCase(); 
            if (genero === 'M') countM++; 
            if (genero === 'H') countH++;

         const row = worksheet.addRow([
                null, 
                i + 1, // La numeración se mantiene correlativa (1, 2, 3...) tras el ordenamiento
                est.nombre_estudiante.trim().toUpperCase(),
                genero === 'H' ? 'X' : '', 
                genero === 'M' ? 'X' : '', 
                est.logro_bimestral === 'AD' ? 'X' : '', 
                est.logro_bimestral === 'A' ? 'X' : '',
                est.logro_bimestral === 'B' ? 'X' : '', 
                est.logro_bimestral === 'C' ? 'X' : '',
                est.logro_bimestral
            ]);
         
         // MAPA DE COLORES PARA LAS LETRAS (Sin relleno, solo fuente)
         const coloresLetraNota = {
               'AD': 'FF008000', // Verde oscuro profesional
               'A':  'FF0000FF', // Azul puro
               'B':  '00000000', // Ámbar/Naranja oscuro para legibilidad
               'C':  'FFFF0000'  // Rojo puro
         };

          row.eachCell((c, colNum) => {
             if (colNum >= 2) {
               c.font = { size: 9, name: 'Calibri' };
                 c.border = { 
                    top: {style:'thin'}, left: {style:'thin'}, 
                      bottom: {style:'thin'}, right: {style:'thin'} 
                   };
                 c.alignment = { 
                     horizontal: colNum === 3 ? 'left' : 'center', 
                     vertical: 'middle' 
                };

                // APLICACIÓN DEL DISEÑO A LA COLUMNA "LOGRO" (Columna 10)
                if (colNum === 10) {
                    const nota = est.logro_bimestral;

                // 1. FONDO ÁMBAR CLARO (Toda la columna sombreada bajito)
                  c.fill = {
                       type: 'pattern',
                       pattern: 'solid',
                       fgColor: { argb: 'FFFFFAEB' } // El ámbar claro exacto de Excel
                    };

                // 2. COLOR SOLO A LA LETRA (Sin relleno adicional)
                   if (coloresLetraNota[nota]) {
                          c.font = { 
                             color: { argb: coloresLetraNota[nota] }, 
                               bold: true, 
                                 size: 9, 
                                   name: 'Calibri' 
                              };
                          }
                       }
                    }
                });
          });

        // 5. FILA TOTAL (AJUSTE: Combinación B y C corregida)
        const totalRowIndex = worksheet.lastRow.number + 1;
        worksheet.mergeCells(`B${totalRowIndex}:C${totalRowIndex}`);
        const totalRow = worksheet.getRow(totalRowIndex);
        
        totalRow.getCell(2).value = 'TOTAL';
        totalRow.getCell(4).value = countH;
        totalRow.getCell(5).value = countM;
        totalRow.getCell(6).value = stats.estudiantes.filter(e => e.logro_bimestral === 'AD').length;
        totalRow.getCell(7).value = stats.estudiantes.filter(e => e.logro_bimestral === 'A').length;
        totalRow.getCell(8).value = stats.estudiantes.filter(e => e.logro_bimestral === 'B').length;
        totalRow.getCell(9).value = stats.estudiantes.filter(e => e.logro_bimestral === 'C').length;
        
        // CORRECCIÓN: Usar stats.total en lugar de medir el array de forma estática
        totalRow.getCell(10).value = stats.total;

        totalRow.eachCell((c, colNum) => {
            if (colNum >= 2) {
                c.font = { bold: true, size: 9 };
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
        worksheet.mergeCells(`D${resRowIdx}:F${resRowIdx}`);
        worksheet.getCell(`D${resRowIdx}`).value = 'CANTIDAD';
        worksheet.mergeCells(`G${resRowIdx}:J${resRowIdx}`);
        worksheet.getCell(`G${resRowIdx}`).value = 'PORCENTAJE';

        worksheet.getRow(resRowIdx).eachCell(c => {
            if (c.value) {
                c.font = { bold: true, size: 9 };
                c.alignment = { horizontal: 'center' };
            }
        });

        (stats?.resumen || []).forEach(r => {
            const rIdx = worksheet.lastRow.number + 1;
            worksheet.mergeCells(`B${rIdx}:C${rIdx}`);
            worksheet.getCell(`B${rIdx}`).value = r.name;
            worksheet.mergeCells(`D${rIdx}:F${rIdx}`);
            worksheet.getCell(`D${rIdx}`).value = r.cant;
            worksheet.mergeCells(`G${rIdx}:J${rIdx}`);
            worksheet.getCell(`G${rIdx}`).value = `${r.percent}%`;

            const colorHex = r.color?.replace('#', 'FF').toUpperCase() || 'FFCCCCCC';
            [`B${rIdx}`, `E${rIdx}`, `G${rIdx}`].forEach(ref => {
                const cell = worksheet.getCell(ref);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorHex } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
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
                   tl: { col: 1, row: 50 }, // Posición en la celda
                   ext: { width: 650, height: 280 }, // FUERZA QUE SEA CUADRADO
                   editAs: 'oneCell'
                });
            } catch (e) { console.error("Error gráfico:", e); }
        }

        // --- AJUSTE DE ANCHOS (Reducción de columna C) ---
        worksheet.getColumn(1).width = 2;   // Margen A
        worksheet.getColumn(2).width = 5;   // N°
        worksheet.getColumn(3).width = 45;  // ESTUDIANTE (Ahora es 45)
        worksheet.getColumn(4).width = 5;   // H
        worksheet.getColumn(5).width = 5;   // M
        worksheet.getColumn(6).width = 5;   //AD
        worksheet.getColumn(7).width = 5;   //A
        worksheet.getColumn(8).width = 5;   //B
        worksheet.getColumn(9).width = 5;   //C
        worksheet.getColumn(10).width = 7; //Logro  

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Consolidado_IGA_${filtros?.area || 'Reporte'}.xlsx`);

        } catch (error) {
            console.error("Error en exportación:", error);
        }
    };
    
   return (
        <div className="p-6 bg-slate-50 min-h-screen space-y-6">
            {/* PANEL DE FILTROS */}
            <div className="bg-sky-900 p-6 rounded-[2rem] shadow-sm grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="flex flex-col">
                    <label className="text-[10px] text-center font-black text-white uppercase mb-1">Área Curricular</label>
                    <select 
                        value={filtros.area} 
                        onChange={(e) => setFiltros({...filtros, area: e.target.value})} 
                        className="w-full bg-green-100 rounded-xl font-bold p-3 text-[12px] text-green-700 uppercase soutline-none"
                    >
                        <option value="MATEMÁTICA">Matemática</option>
                        <option value="COMUNICACIÓN">Comunicación</option>
                        <option value="ARTE Y CULTURA">Arte y Cultura</option>
                        <option value="CIENCIAS SOCIALES">Ciencias Sociales</option>
                        <option value="DPCC">DPCC</option>
                        <option value="CIENCIA Y TECNOLOGÍA">Ciencia y Tecnología</option>
                        <option value="EDUCACION FÍSICA">Educacion Física</option>
                        <option value="EPT">EPT</option>
                        <option value="RELIGIÓN">Religión</option>
                        <option value="INGLÉS">Inglés</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-[10px] text-center font-black text-white uppercase mb-1">Bimestres</label>
                    <select 
                        value={filtros.bimestre} 
                        onChange={(e) => setFiltros({...filtros, bimestre: e.target.value})} 
                        className="w-full bg-green-100 rounded-xl font-bold p-3 text-[12px] text-green-700 uppercase outline-none"
                         >
                        <option value="1">1° Bimestre</option>
                        <option value="2">2° Bimestre</option>
                        <option value="3">3° Bimestre</option>
                        <option value="4">4° Bimestre</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-[10px] text-center font-black text-white uppercase mb-1">Grado y Sección</label>
                    <div className="relative">
                        <select 
                            value={`${filtros.grado.replace('°', '')}${filtros.seccion}`}
                            onChange={(e) => handleGradoChange(e.target.value)}
                            className="w-full px-4 py-3 bg-green-100 text-[12px] rounded-xl text-sm font-bold text-green-700 outline-none appearance-none cursor-pointer"
                            >
                            {OPCIONES_GRADO_SECCION.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                            <svg className="w-3 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                </div>
                <button onClick={exportarExcelCompleto} className="bg-green-600 text-white p-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg h-[48px]">
                    <FileDown size={18} /> EXPORTAR EXCEL + GRÁFICO
                </button>
                <div className="flex items-center gap-2 text-[12px] font-bold text-sky-200 p-3">
                 <RefreshCcw size={14} className={loading ? "animate-spin text-green-500" : ""} /> {loading ? "Sincronizando..." : "Sincronizado Realtime"}
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {stats.resumen.map((item, i) => {
                        const estilosPorNivel = {
                         "DESTACADO (AD)": "bg-green-200 border-green-100 text-green-600",
                         "LOGRADO (A)": "bg-blue-200 border-blue-100 text-blue-600",
                         "PROCESO (B)": "bg-amber-200 border-amber-100 text-amber-600",
                         "INICIO (C)": "bg-red-200 border-red-100 text-red-600"
                        };
                    const estiloActual = estilosPorNivel[item.name] || "bg-white border-slate-100 text-slate-500";
                    const colorBase = estiloActual.split(' ')[2]; // Extrae el color para el porcentaje
                    return (
                        <div key={i} className={`${estiloActual.split(' ').slice(0,2).join(' ')} p-5 rounded-[2rem] border shadow-sm transition-all hover:shadow-md`}>
                            <p className={`text-[9px] font-black uppercase tracking-tighter ${estiloActual.split(' ')[2]}`}>
                                {item.name}
                            </p>
                            <div className="flex justify-between items-end mt-2">
                            <p className="text-3xl font-black text-slate-800">{item.cant}</p>
                            <p className={`text-sm font-black px-2 py-1 rounded-lg bg-white/50 shadow-sm`} style={{color: item.color}}>
                                {item.percent}%
                            </p>
                      </div>
                    </div>
                  );
                })}
             </div>
            {/* SECCIÓN DE GRÁFICOS */}
            <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border h-[400px]">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
                        <LayoutDashboard size={14} className="text-green-600"/> RENDIMIENTO: {filtros.area}
                    </h3>
                    <div className="h-[250px] w-full">
                        <Bar 
                            key={`bar-${JSON.stringify(stats.values)}`}
                            data={dataConfig}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                                    x: { 
                                        ticks: {
                                            color: (ctx) => stats.colors[ctx.index], // Callback de color corregido
                                            font: { weight: 'bold' }
                                        }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border h-auto min-h-[400px] flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 flex items-center gap-2 tracking-widest">
                    <PieIcon size={14} className="text-blue-600"/> DISTRIBUCIÓN DE LOGROS
                    </h3>
                      <div className="flex-grow flex items-center justify-center w-full">
                       <div className="w-full max-w-[270px] aspect-square relative">
                        <Doughnut 
                            key={`pie-${JSON.stringify(stats.values)}`}
                            data={dataConfig}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                cutout: '65%',
                                plugins: {
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            font: { size: 11, weight: 'bold' },
                                            generateLabels: (chart) => {
                                                const { data } = chart;
                                                return data.labels.map((label, i) => ({
                                                    text: label,
                                                    fillStyle: data.datasets[0].backgroundColor[i],
                                                    fontColor: data.datasets[0].backgroundColor[i],
                                                    index: i
                                                 }));
                                              }
                                          }
                                      }
                                   }
                                }}
                            plugins={[percentageLabelPlugin]}
                          />
                       </div>
                   </div>
               </div>
           </div> 
       </div>
    );
};

export default IGAEstadistica;