import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { Search, Filter, FileSpreadsheet, Menu, Clock } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const obtenerTurnoActual = () => {
  const ahora = new Date();
  const hora = ahora.getHours();
  const minutos = ahora.getMinutes();
  const tiempoDecimal = hora + minutos / 60;

  // Mañana: 07:30 a 13:00
  if (tiempoDecimal >= 7.5 && tiempoDecimal < 13) {
    return 'MAÑANA';
   } 
  // Tarde: 13:00 a 18:50 (margen hasta 18:30 + cierre)
  else if (tiempoDecimal >= 13 && tiempoDecimal <= 18.8) {
    return 'TARDE';
   }
  // Valor por defecto si está fuera de rango escolar
  return 'MAÑANA'; 
  };

const ConsolidadoAsistencia = () => {
  const [datos, setDatos] = useState({});
  const [estudiantes, setEstudiantes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [opcionesPermitidas, setOpcionesPermitidas] = useState({ grados: [], areas: [] });
  
const [seleccion, setSeleccion] = useState({ 
      grado: '', 
      seccion: '', 
      mes: new Date().getMonth() + 1,
      area: '',
      turno: obtenerTurnoActual() 
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const turnoReal = obtenerTurnoActual();
      if (turnoReal !== seleccion.turno) {
        setSeleccion(prev => ({ ...prev, turno: turnoReal }));
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [seleccion.turno]);

  // 1. MEJORA: REAL-TIME SUBSCRIPTION
  useEffect(() => {
    if (!isReady || !seleccion.grado) return;

    const channel = supabase
      .channel('cambios-asistencia')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'asistencia' }, 
        () => {
          cargarDatos(); // Recarga cuando un docente o auxiliar guarde
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isReady, seleccion.grado, seleccion.seccion]);

  const cargarDatos = useCallback(async () => {
  if (!isReady || !perfilUsuario || !seleccion.grado) return;
  
  setLoading(true);
  try {
    const gradoFmt = `${seleccion.grado}°`;
    const anio = 2026;

    const mesFmt = String(seleccion.mes).padStart(2, '0');
    const primerDia = `${anio}-${mesFmt}-01`;
    const ultimoDia = `${anio}-${mesFmt}-${new Date(anio, seleccion.mes, 0).getDate()}`;
    
    // 1. Cargar nómina (Independencia visual: siempre aparecen los nombres)
    const { data: nomina } = await supabase.from('matriculas')
      .select('dni_estudiante, apellido_paterno, apellido_materno, nombres')
      .eq('grado', gradoFmt).eq('seccion', seleccion.seccion)
      .order('apellido_paterno', { ascending: true });
       setEstudiantes(nomina || []);

    // 2. Cargar TODAS las asistencias del turno
    const { data: registrosDocentes, error: asistErr } = await supabase //
      .from('asistencia')
      .select('dni_estudiante, fecha, estado, observaciones')
      .eq('grado', gradoFmt)
      .eq('seccion', seleccion.seccion)
      .eq('turno', seleccion.turno)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia);

   if (asistErr) throw asistErr;
      const nuevoMapa = {};
   if (registrosDocentes) {
   registrosDocentes.forEach(reg => {
      const dni = reg.dni_estudiante;
      const diaNum = new Date(reg.fecha + 'T12:00:00').getDate();
   if (!nuevoMapa[dni]) nuevoMapa[dni] = {};

      const simbolo = reg.estado === 'P' ? '•' : reg.estado;
      const esGeneral = reg.observaciones === 'GENERAL';
      if (!nuevoMapa[dni][diaNum] || esGeneral) {
         nuevoMapa[dni][diaNum] = simbolo;
     }
   });
  }
  setDatos(nuevoMapa);

  } finally {
    setLoading(false);
  }
  }, [isReady, perfilUsuario, seleccion.grado, seleccion.seccion, seleccion.turno, seleccion.mes]);

    useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);
  
  useEffect(() => {
    const inicializarSistema = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        
        const { data: perfil } = await supabase.from('usuarios').select('*').eq('id_usuario', session.user.id).maybeSingle();
        setPerfilUsuario(perfil);
        
        const gradosFinales = ['1-A', '1-B', '1-C','2-A', '2-B', '2-C', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B'];
        
        setOpcionesPermitidas({ grados: gradosFinales});
        const [initG, initS] = gradosFinales[0].split('-');
        setSeleccion(prev => ({ ...prev, grado: initG, seccion: initS[0] }));
        setIsReady(true);
    };
    inicializarSistema();
  }, []);

  useEffect(() => { if (isReady) cargarDatos(); }, [isReady, cargarDatos]);

  const diasDelMes = useMemo(() => {
    const anio = 2026;
    const numDias = new Date(anio, seleccion.mes, 0).getDate();
    const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return Array.from({ length: numDias }, (_, i) => {
      const diaNum = i + 1;
      const fecha = new Date(anio, seleccion.mes - 1, diaNum, 12, 0, 0);
      return { numero: diaNum, nombre: nombresDias[fecha.getDay()] };
    });
  }, [seleccion.mes]);

  const filtrados = useMemo(() => {
    return estudiantes.filter(e => {
      const nombreCompleto = `${e.apellido_paterno} ${e.apellido_materno} ${e.nombres}`.toLowerCase();
      return nombreCompleto.includes(searchTerm.toLowerCase());
    });
  }, [estudiantes, searchTerm]);

  const handleExportExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Consolidado General');
  
  const totalCols = diasDelMes.length + 3; 
  const ultimaLetra = worksheet.getColumn(totalCols).letter;

  // 1. TÍTULO PRINCIPAL (Fila 1)
  worksheet.mergeCells(`A1:${ultimaLetra}1`);
  const titulo = worksheet.getCell('A1');
  titulo.value = 'SISTEMA DE GESTIÓN DE COMUNICACIÓN ESCOLAR - SIGESCOM 2079';
  titulo.font = { name: 'Arial Black', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; 
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 25;

  // 2. SUB-ENCABEZADOS (Fila 2)
  const bloque = Math.floor(totalCols / 4);
  const nombreMes = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][seleccion.mes];
  const secciones = [
    { t: `GRADO/SEC: ${seleccion.grado} "${seleccion.seccion}"`, s: 1, e: bloque },
    { t: `TURNO: ${seleccion.turno}`, s: bloque + 1, e: bloque * 2 },
    { t: `MES: ${nombreMes} - 2026`, s: (bloque * 2) + 1, e: bloque * 3 },
    { t: `I.E. N° 2079 ANTONIO RAIMONDI`, s: (bloque * 3) + 1, e: totalCols }
  ];

  secciones.forEach(sec => {
    worksheet.mergeCells(2, sec.s, 2, sec.e);
    const cell = worksheet.getCell(2, sec.s);
    cell.value = sec.t;
    cell.font = { name: 'Arial Black', size: 9, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // 3. CABECERA DE DÍAS (Fila 4)
  const row4 = worksheet.getRow(4);
  row4.values = [null, null, ...diasDelMes.map(d => d.nombre.charAt(0))];
  row4.height = 18;
  row4.eachCell((cell, colNum) => {
    if (colNum > 2 && colNum < totalCols) {
      const diaInfo = diasDelMes[colNum - 3];
      const esFinde = diaInfo.nombre.startsWith('S') || diaInfo.nombre.startsWith('D');
      
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; 
      cell.font = { 
        name: 'Arial Black', size: 8, bold: true, 
        color: { argb: esFinde ? 'FFFF0000' : 'FF64748B' } 
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    }
  });

  // 4. CABECERA PRINCIPAL (Fila 5)
  const row5 = worksheet.getRow(5);
  row5.values = ["N°", "APELLIDOS Y NOMBRES", ...diasDelMes.map(d => d.numero), "FALTAS"];
  row5.height = 22;

  row5.eachCell((cell, colNum) => {
    let bgColor = 'FF1E293B'; 
    if (colNum === 1) bgColor = 'FF064E3B'; 
    if (colNum === totalCols) bgColor = 'FFDC2626';

    const diaInfo = colNum > 2 && colNum < totalCols ? diasDelMes[colNum - 3] : null;
    const esFinde = diaInfo && (diaInfo.nombre.startsWith('S') || diaInfo.nombre.startsWith('D'));

    cell.font = { 
        name: 'Arial Bold', size: 8, bold: true, 
        color: { argb: esFinde ? 'FFFF0000' : 'FFFFFFFF' } 
    };

    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // 5. CUERPO DE DATOS
  const mapeoExcel = { 'Presente': '•', 'P': '•', '.': '•', 'F': 'F', 'A': 'F' };

  filtrados.forEach((est, index) => {
    let faltasCount = 0;
    const asistenciaArray = diasDelMes.map(d => {
      const v = datos[est.dni_estudiante]?.[d.numero] || '';
      if (v === 'F' || v === 'A') faltasCount++;
      return mapeoExcel[v] || v;
    });

    const row = worksheet.addRow([index + 1, `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`, ...asistenciaArray, faltasCount]);
    row.height = 18;

    row.eachCell((cell, colNum) => {
      const diaInfo = colNum > 2 && colNum < totalCols ? diasDelMes[colNum - 3] : null;
      const esFinde = diaInfo && (diaInfo.nombre.startsWith('S') || diaInfo.nombre.startsWith('D'));

      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };

      if (colNum === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      if (colNum === 2) cell.alignment = { horizontal: 'left', indent: 1 };
      
      if (esFinde) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FFB91C1C' } };
      }

      if (colNum > 2 && colNum < totalCols) {
        if (cell.value === 'F') cell.font = { name: 'Arial', size: 9, color: { argb: 'FFFF0000' }, bold: true };
        if (cell.value === '•') cell.font = { name: 'Arial', size: 9, color: { argb: 'FF000000' }, bold: true };
      }

      // --- CORRECCIÓN DE LA ALERTA AQUÍ (Dentro de eachCell) ---
      if (colNum === totalCols) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cell.font = { name: 'Arial', size: 8, color: { argb: 'FF000000' }, bold: true }; 

        if (faltasCount >= 3) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
          cell.font = { name: 'Arial', size: 9, color: { argb: 'FFFFFFFF' }, bold: true };
        }
      }
    });
  });

  // 6. AJUSTE DE ANCHOS
  worksheet.getColumn(1).width = 5;
  worksheet.getColumn(2).width = 40;
  for (let i = 3; i < totalCols; i++) worksheet.getColumn(i).width = 3.5;
  worksheet.getColumn(totalCols).width = 8;
    
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Consolidado_${seleccion.grado}${seleccion.seccion}_${nombreMes}.xlsx`);
  };

  if (!isReady) return <div className="h-screen flex items-center justify-center font-bold text-emerald-600">SINCRONIZANDO...</div>;

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen text-[8px] md:text-base">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase">Consolidado General de Asistencia</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase">
            Registro Auxiliar 2026 | {perfilUsuario?.rol_id === 1 ? 'ADMINISTRADOR' : 'AUXILIAR'}
          </p>
        </div>
        <button onClick={handleExportExcel} className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all">
          <FileSpreadsheet size={14} /> Exportar Excel
        </button>
      </div>
     
      <div className="bg-emerald-700 p-4 rounded-[2rem] shadow-lg mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {/* SELECTOR DE TURNO (MEJORA) */}
          <div className="min-w-[100px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
            <Clock size={14} className="text-emerald-600" />
            <select 
              className="bg-transparent font-black text-slate-700 outline-none text-[10px] uppercase w-full cursor-pointer"
              value={seleccion.turno}
              onChange={(e) => setSeleccion(prev => ({...prev, turno: e.target.value}))}>
              <option value="MAÑANA">MAÑANA</option>
              <option value="TARDE">TARDE</option>
            </select>
          </div>

          <div className="min-w-[100px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
            <Filter size={14} className="text-emerald-600" />
            <select 
              className="bg-transparent font-black text-slate-700 outline-none text-[10px] uppercase w-full cursor-pointer"
              value={`${seleccion.grado}-${seleccion.seccion}`}
              onChange={(e) => {
                const [g, s] = e.target.value.split('-');
                setSeleccion(prev => ({...prev, grado: g, seccion: s}));
              }}>
              {opcionesPermitidas.grados.map(opt => (
                <option key={opt} value={opt}>{opt.replace('-', '° ')}</option>
              ))}
            </select>
          </div>
          <select 
            className="flex-1 min-w-[100px] bg-slate-100 px-3 py-2 rounded-2xl border font-black text-[11px] uppercase outline-none" 
            value={seleccion.mes} 
            onChange={(e) => setSeleccion(prev => ({...prev, mes: parseInt(e.target.value)}))}>
            {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
              <option key={i} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
      
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="BUSCAR..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <div className="bg-white rounded-[1rem] shadow-xl border border-gray-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-max md:w-full border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 top-0 z-50 w-[40px] bg-emerald-700 py-3 text-[10px] font-black border-r border-emerald-800 text-center uppercase">N°</th>
                <th className="bg-slate-900 py-3 px-2 text-center border-r border-slate-800 w-[120px] md:w-[250px] text-[8px] md:text-[11px] font-black uppercase">Apellidos y Nombres</th>
               {diasDelMes.map(dia => {
               const esFinde = dia.nombre === "Sáb" || dia.nombre === "Dom";

              return (
               <th 
                key={dia.numero} 
                 className={`py-1 border-r border-slate-800 min-w-[43px] md:min-w-[80px] text-center ${esFinde ? 'bg-emerald-900' : 'bg-emerald-900'}`}>
                <div className="flex flex-col leading-none">
                 <span className={`text-[7px] font-bold uppercase ${esFinde ? 'text-red-500' : 'text-slate-400'}`}>
                 {dia.nombre}
                 </span>
                 <span className="text-[10px] font-bold text-white">
                 {dia.numero}
                 </span>
                  </div>
                  </th>
                   );
                 })}
                <th className="sticky right-0 top-0 z-40 bg-red-600 py-2 text-[8px] md:text-[10px] font-black w-[50px] text-center border-l border-slate-800">FALTAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtrados.map((est, index) => {
                const asistenciaEst = datos[est.dni_estudiante] || {};
                  let totalFaltas = 0;
                  let totalTardanzas = 0;
                  diasDelMes.forEach(dia => {
                  const valorBD = (asistenciaEst[dia.numero] || '').toString().toUpperCase().trim();
                  if (['F'].includes(valorBD)) {
                  totalFaltas++;
                  }
                 if (['T'].sort().includes(valorBD)) {
                 totalTardanzas++;
                 }
                });
                const enRiesgo = totalFaltas >= 3;
                
                return (
                  <tr key={est.dni_estudiante} className="hover:bg-slate-50 transition-colors">
                    <td className="sticky left-0 z-30 bg-emerald-100 py-1 text-center text-[8px] md:text-[11px] font-bold text-emerald-600 border-r border-slate-300">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="bg-white py-1 px-3 text-[9px] md:text-[10px] font-semibold text-slate-700 border-r border-slate-300/80 uppercase">
                      {est.apellido_paterno} {est.apellido_materno} {est.nombres}
                    </td>
                    {diasDelMes.map((dia) => {
                    const fechaAnalizar = new Date(2026, seleccion.mes - 1, dia.numero);
                    const esFinDeSemana = fechaAnalizar.getDay() === 0 || fechaAnalizar.getDay() === 6;
                    const weekendClass = esFinDeSemana ? 'bg-red-50 text-red-500 font-medium' : '';
                    const valorBD = (asistenciaEst[dia.numero] || '').toString().toUpperCase().trim();
                    let visualChar = '-';
                    if (['.', 'P', '•'].includes(valorBD)) {
                    visualChar = '•';
                    } else if (['F', 'T', 'J', 'FJ', 'TJ'].includes(valorBD)) {
                    visualChar = valorBD;
                    }

                  const colorClass = 
                      (valorBD === 'F' || valorBD === 'FJ') ? 'text-red-600 font-bold text-[11px]' : 
                      (valorBD === 'T' || valorBD === 'TJ') ? 'text-amber-500 font-bold text-[11px]' : 
                      (valorBD === 'J') ? 'text-green-600 font-bold text-[11px]' : 
                      (['.', 'P', '•'].includes(valorBD)) ? 'text-slate-800 font-black text-[12px]' : 
                      'text-slate-300 text-[11px]';
              return (
                <td 
                  key={dia.numero} 
                   className={`border border-gray-200 text-center w-6 h-7 text-[10px] ${weekendClass} ${colorClass}`}>
                   {visualChar}
                   </td>
                    );
                    })}
                    <td className={`sticky right-0 z-30 py-1 text-center font-semibold text-[10px] md:text-[11px] border-l border-slate-200 transition-all duration-300 ${
                     enRiesgo 
                       ? 'bg-red-600 text-white animate-pulse shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' 
                       : 'bg-red-100 text-slate-600' 
                       }`}>
                    {totalFaltas}
                    {enRiesgo && (
                    <div className="text-[6px] leading-none mt-0.5 uppercase font-bold">
                     Seguimiento
                    </div>
                     )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsolidadoAsistencia;