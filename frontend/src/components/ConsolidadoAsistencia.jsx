import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabaseClient';
import { Search, Filter, FileSpreadsheet, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
      area: ''
  });

  const opcionesGradoSeccion = [
    { g: '1', s: 'A' }, { g: '1', s: 'B' }, { g: '1', s: 'C' },
    { g: '2', s: 'A' }, { g: '2', s: 'B' }, { g: '2', s: 'C' },
    { g: '3', s: 'A' }, { g: '3', s: 'B' },
    { g: '4', s: 'A' }, { g: '4', s: 'B' },
    { g: '5', s: 'A' }, { g: '5', s: 'B' },
  ];

  const areasConfig = {
    "MATEMÁTICA": ["RESUELVE PROBLEMAS DE CANTIDAD", "RESUELVE PROBLEMAS DE REGULARIDAD", "FORMA Y MOVIMIENTO", "GESTIÓN DE DATOS"],
    "COMUNICACIÓN": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"],
    "CIENCIA Y TECNOLOGÍA": ["INDAGA MEDIANTE MÉTODOS", "EXPLICA EL MUNDO FÍSICO", "DISEÑA SOLUCIONES"],
    "CIENCIAS SOCIALES": ["CONSTRUYE INTERPRETACIONES HISTÓRICAS", "GESTIONA RESPONSABLEMENTE EL ESPACIO Y EL AMBIENTE", "GESTIONA RESPONSABLEMENTE LOS RECURSOS ECONÓMICOS"],
    "DPCC": ["CONSTRUYE SU IDENTIDAD", "CONVIVE Y PARTICIPA DEMOCRÁTICAMENTE"],
    "ARTE Y CULTURA": ["APRECIA MANIFESTACIONES", "CREA PROYECTOS"],
    "EDUCACION FÍSICA": ["SE DESENVUELVE DE MANERA AUTÓNOMA", "ASUME UNA VIDA SALUDABLE"],
    "EPT": ["GESTIONA PROYECTOS DE EMPRENDIMIENTO"],
    "RELIGIÓN": ["CONSTRUYE SU IDENTIDAD", "ASUME LA EXPERIENCIA"],
    "INGLÉS": ["SE COMUNICA ORALMENTE", "LEE TEXTOS ESCRITOS", "ESCRIBE TEXTOS"]
  };

  const cargarDatos = useCallback(async () => {
    if (!isReady || !perfilUsuario || !seleccion.grado) return;
    
    setLoading(true);
    try {
      const gradoFmt = `${seleccion.grado}°`;
      
      // Consulta de Nómina inteligente por Rol
      let queryNomina = supabase.from('matriculas')
        .select('id_matricula, dni_estudiante, apellido_paterno, apellido_materno, nombres')
        .eq('grado', gradoFmt)
        .eq('seccion', seleccion.seccion)
        .order('apellido_paterno', { ascending: true });

      // Si es Estudiante (Rol 6), filtramos solo por su DNI
      if (Number(perfilUsuario.rol_id) === 6) {
        queryNomina = queryNomina.eq('dni_estudiante', perfilUsuario.dni_estudiante);
      }

      const { data: nomina, error: nomErr } = await queryNomina;
      if (nomErr) throw nomErr;

      // Carga de Asistencias del mes
      const { data: asistenciasDocente, error: asistErr } = await supabase
         .from('asistencia')
         .select('*')
         .eq('grado', gradoFmt)
         .eq('seccion', seleccion.seccion)
         .or(`observaciones.eq."${seleccion.area}",observaciones.eq.GENERAL`)

      const mapa = {};
      asistenciasDocente.forEach(a => {
      const dni = String(a.dni_estudiante);
      const diaNum = new Date(a.fecha + 'T00:00:00').getDate();
  
      if (!mapa[dni]) mapa[dni] = {};
      if (!mapa[dni][diaNum] || a.observaciones === 'GENERAL') {
        mapa[dni][diaNum] = a.estado;
      }
    });

      setEstudiantes(nomina || []);
      setDatos(mapa);
    } catch (err) {
      console.error("Error cargando datos:", err.message);
    } finally {
      setLoading(false);
    }
    }, [isReady, perfilUsuario, seleccion.grado, seleccion.seccion, seleccion.area]);

    // 2. ÚNICO EFECTO DE INICIALIZACIÓN (Sustituye a los 4 anteriores)
   useEffect(() => {
    const inicializarSistema = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const uId = session.user.id;

        // A. Intentamos obtener perfil (Docente/Admin)
        const { data: perfil } = await supabase.from('usuarios')
          .select('*').eq('id_usuario', uId).maybeSingle();

        // B. Intentamos obtener matrícula (Estudiante)
        const { data: matri } = await supabase.from('matriculas')
          .select('grado, seccion, dni_estudiante')
          .eq('id_usuario', uId).maybeSingle();

        let rolFinal = perfil?.rol_id || 6;
        let gradosFinales = [];
        let areasFinales = Object.keys(areasConfig);

        if (matri) {
          // Lógica Estudiante
          const g = matri.grado.replace('°', '').trim();
          const s = matri.seccion?.trim() || 'A';
          gradosFinales = [`${g}-${s}`];
          
          setPerfilUsuario({ ...perfil, rol_id: 6, dni_estudiante: matri.dni_estudiante });
          setSeleccion(prev => ({ ...prev, grado: g, seccion: s, area: areasFinales[0] }));
        } else if (perfil) {
          
          // Lógica Admin/Docente
          setPerfilUsuario(perfil);
          if ([1, 3].includes(Number(perfil.rol_id))) { 
          gradosFinales = ['1-A', '1-B', '1-C', '2-A', '2-B', '2-C', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B'];
          }
          const [initG, initS] = gradosFinales[0]?.split('-') || ['1', 'A'];
          setSeleccion(prev => ({ ...prev, grado: initG, seccion: initS, area: areasFinales[0] }));
        }

        setOpcionesPermitidas({ grados: gradosFinales, areas: areasFinales });
        setIsReady(true);
      } catch (err) {
        console.error("Error crítico de inicialización:", err);
        toast.error("Error al sincronizar acceso");
      }
    };
    inicializarSistema();
  }, []);

  // 3. EFECTO DISPARADOR DE CARGA
  useEffect(() => {
    if (isReady) cargarDatos();
  }, [isReady, cargarDatos]);

  // Memorización de días y filtrado
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
  const worksheet = workbook.addWorksheet('Consolidado');
  
  // 1. CONFIGURACIÓN DE COLUMNAS
  const totalCols = diasDelMes.length + 3;
  const ultimaLetra = worksheet.getColumn(totalCols).letter;
  worksheet.getColumn(1).width = 5;  // N°
  worksheet.getColumn(2).width = 40; // Apellidos y Nombres
  for (let i = 3; i < totalCols; i++) worksheet.getColumn(i).width = 3.5; // Días
  worksheet.getColumn(totalCols).width = 8; // Faltas

  // 2. FILA 1: TÍTULO PRINCIPAL (Estilo Idéntico al Frontend)
  worksheet.mergeCells(`A1:${ultimaLetra}1`);
  const titulo = worksheet.getCell('A1');
  titulo.value = 'CONSOLIDADO DE ASISTENCIA MENSUAL - 2026';
  titulo.font = { name: 'Arial Black', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }; // Verde Esmeralda
  titulo.alignment = { horizontal: 'center', vertical: 'middle' };
  titulo.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };

  // 3. FILA 2: SUB-ENCABEZADOS DINÁMICOS
  const bloque = Math.floor(totalCols / 4);
  const nombreMes = ["", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"][seleccion.mes];

  const secciones = [
    { t: `ÁREA: ${seleccion.area}`, s: 1, e: bloque },
    { t: `GRADO/SEC: ${seleccion.grado}° "${seleccion.seccion}"`, s: bloque + 1, e: bloque * 2 },
    { t: `MES: ${nombreMes}`, s: (bloque * 2) + 1, e: bloque * 3 },
    { t: `I.E. N° 2079 ANTONIO RAIMONDI`, s: (bloque * 3) + 1, e: totalCols }
  ];

  secciones.forEach(sec => {
    worksheet.mergeCells(2, sec.s, 2, sec.e);
    const cell = worksheet.getCell(2, sec.s);
    cell.value = sec.t;
    cell.font = { name: 'Arial Black', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    };
  });

  // 4. FILA 4 y 5: ENCABEZADOS DE DÍAS Y NÚMEROS (Con colores de fin de semana)
  const rowLetras = worksheet.getRow(4);
  const rowNumeros = worksheet.getRow(5);
  
  rowLetras.values = ["", "", ...diasDelMes.map(d => d.nombre.charAt(0))];
  rowNumeros.values = ["N°", "APELLIDOS Y NOMBRES", ...diasDelMes.map(d => d.numero), "FALTAS"];

  [4, 5].forEach(rowNum => {
    const row = worksheet.getRow(rowNum);
    row.eachCell((cell, colNum) => {
      const diaInfo = colNum > 2 && colNum < totalCols ? diasDelMes[colNum - 3] : null;
      const esFinde = diaInfo && (diaInfo.nombre.startsWith('S') || diaInfo.nombre.startsWith('D'));

      cell.font = { 
        name: 'Arial Bold', size: 8, bold: true, 
        color: { argb: esFinde ? 'FFFF0000' : (rowNum === 5 ? 'FFFFFFFF' : 'FF64748B') } 
      };
      
      if (rowNum === 5) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Azul oscuro UI
      }
      
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  // 5. LLENADO DE DATOS Y COLORES DE FIN DE SEMANA EN COLUMNAS
  const mapeoExcel = {
    'Presente': '•', 'P': '•', '.': '•',
    'Ausente': 'F', 'A': 'F', 'Falta': 'F', 'F': 'F',
    'Tardanza': 'T', 'T': 'T', 'TJ': 'TJ',
    'Justificado': 'J', 'J': 'J', 'FJ': 'FJ'
  };

  filtrados.forEach((est, index) => {
  let faltasEstudiante = 0;
  
  const asistenciaArray = diasDelMes.map(d => {
    const v = datos[est.dni_estudiante]?.[d.numero] || datos[est.id_matricula]?.[d.numero] || '';
    
    if (['F', 'A', 'Ausente', 'Falta'].includes(v)) {
      faltasEstudiante++;
    }

    return mapeoExcel[v] || v; 
  });

  const row = worksheet.addRow([
    index + 1, 
    `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`, 
    ...asistenciaArray, 
    faltasEstudiante
  ]);

  row.eachCell((cell, colNum) => {
    // ESTILO BASE Y BORDES NEGROS PROFESIONALES
    cell.font = { name: 'Arial', size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Identificar si la columna actual pertenece a un fin de semana
    const diaInfo = colNum > 2 && colNum < totalCols ? diasDelMes[colNum - 3] : null;
    if (diaInfo) {
      const nombreLimpio = diaInfo.nombre.toUpperCase();
      const esSábado = nombreLimpio.includes("SÁB");
      const esDomingo = nombreLimpio.includes("DOM");
      const esFinde = esSábado || esDomingo;

      // --- CRÍTICO: APLICAR COLOR ROJO DE FIN DE SEMANA (RÉPLICA IDÉNTICA UI) ---
      if (esFinde) {
        // Color de Fondo (bg-red-50 de la web)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF2F2' } // Rojo muy claro (pálido) para el contenido
        };
        
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FFB91C1C' } }; 
      }
    }

    if (colNum > 2 && colNum < totalCols) {
      const val = cell.value?.toString();
      
      // • Presente (P) - Negro
      if (val === '•') {
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF000000' } };
      }
      // F Falta (A) - Rojo vibrante
      else if (val === 'F') {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FFFF0000' }, bold: true };
      }
      // TJ/T Tardanza (Justificada) - Ámbar
      else if (val === 'T' || val === 'TJ') {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FFD97706' }, bold: true };
      }
      // FJ/J Justificación (Falta) - Verde Esmeralda
      else if (val === 'J' || val === 'FJ') {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF059669' }, bold: true };
      }
    }

    // Estilos de columnas de control especiales
    if (colNum === 1) { // Columna N° (Azul pizarra suave)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    }
    
    if (colNum === 2) { // Columna Nombres (Alineación izquierda)
      cell.alignment = { horizontal: 'left', indent: 1 };
    }
    
    // Columna de Faltas (Alerta roja para >= 3 faltas)
    if (colNum === totalCols) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      if (faltasEstudiante >= 3) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FFFFFFFF' }, bold: true };
       }
      }
     });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Asistencia_${seleccion.area}_${seleccion.grado}${seleccion.seccion}.xlsx`);
   };
  
   if (!isReady) return (
     <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="animate-pulse text-emerald-600 font-bold">CARGANDO CONFIGURACIÓN...</div>
    </div>
  );

  const esAdmin = perfilUsuario?.rol_id === 1;
  const esDocente = perfilUsuario?.rol_id === 3;
  const esEstudiante = perfilUsuario?.rol_id === 6;

 return (
     <div className="p-4 md:p-6 bg-slate-50 min-h-screen text-[8px] md:text-base">
       {/* TÍTULO */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800 uppercase">
            Consolidado de Asistencia
          </h1>
         <p className="text-slate-500 text-[10px] font-bold uppercase">
         Registro Auxiliar 2026 | {
        perfilUsuario?.rol_id === 1 ? 'ADMINISTRADOR' : 
        perfilUsuario?.rol_id === 3 ? 'DOCENTE' : 'ESTUDIANTE'
       }
      </p>
      </div>
      {(perfilUsuario?.rol_id === 1 || perfilUsuario?.rol_id === 3) && (
        <button 
          onClick={handleExportExcel} 
          disabled={loading || filtrados.length === 0}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
          <FileSpreadsheet size={14} /> Exportar Excel
        </button>
       )}
     </div>
    {/* FILTROS INTEGRADOS DINÁMICOS */}
    <div className="bg-emerald-700 p-4 rounded-[2rem] shadow-lg mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
        {/* GRADO/SEC SELECTOR */}
        <div className="min-w-[120px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
          <Filter size={14} className="text-emerald-600" />
          <select 
            className="bg-transparent font-black text-slate-700 outline-none text-[10px] uppercase w-full cursor-pointer"
            value={`${seleccion.grado}-${seleccion.seccion}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val && val.includes('-')) {
                const [g, s] = val.split('-');
                setSeleccion(prev => ({...prev, grado: g, seccion: s}));
              }
            }}>
            {opcionesPermitidas.grados.length > 0 ? (
              opcionesPermitidas.grados.map(opt => (
                <option key={opt} value={opt}>{opt.replace('-', '° ')}</option>
              ))
            ) : (
              <option value="">{loading ? 'CARGANDO...' : 'SIN ACCESO'}</option>
            )}
          </select>
        </div>
        {/* ÁREA SELECTOR */}
        <div className="flex-1 min-w-[150px] flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border">
          <Menu size={14} className="text-emerald-600" />
          <select 
            className="bg-transparent font-black text-green-700 outline-none text-[10px] uppercase w-full cursor-pointer" 
            value={seleccion.area} 
            onChange={(e) => setSeleccion(prev => ({...prev, area: e.target.value}))}
            >
            {opcionesPermitidas.areas.length > 0 ? (
              opcionesPermitidas.areas.map(a => <option key={a} value={a}>{a}</option>)
            ) : (
              <option value="">{loading ? 'CARGANDO...' : 'SIN ASIGNACIÓN'}</option>
            )}
          </select>
        </div>
        {/* MES SELECTOR */}
        <select 
          className="flex-1 min-w-[100px] bg-slate-100 px-3 py-2 rounded-2xl border font-black text-[11px] uppercase outline-none" 
          value={seleccion.mes} 
          onChange={(e) => setSeleccion(prev => ({...prev, mes: parseInt(e.target.value)}))}>
          {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
            <option key={i} value={i+1}>{m}</option>
          ))}
        </select>
      </div>
      {/* BÚSQUEDA */}
      <div className="relative w-full lg:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="BUSCAR ESTUDIANTE..." 
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-2xl text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-emerald-500" 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>
    </div>
    {/* TABLA DE RESULTADOS */}
    <div className="bg-white rounded-[1rem] shadow-xl border border-gray-300 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-max md:w-full border-collapse table-fixed">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="sticky left-0 top-0 z-50 w-[40px] bg-emerald-700 py-3 text-[10px] font-black border-r border-emerald-800 text-center uppercase tracking-wider">N°</th>
              <th className="bg-slate-900 py-3 px-2 text-center border-r border-slate-800 w-[120px] md:w-[250px] text-[8px] md:text-[11px] font-black uppercase tracking-wider">Apellidos y Nombres</th>
              {diasDelMes.map(dia => {
                const esFinde = dia.nombre === "Sáb" || dia.nombre === "Dom";
                return (
                  <th key={dia.numero} className="py-1 border-r border-slate-800 min-w-[43px] md:min-w-[80px] text-center bg-emerald-900">
                    <div className="flex flex-col leading-none">
                      <span className={`text-[7px] font-bold uppercase ${esFinde ? 'text-red-500' : 'text-slate-400'}`}>{dia.nombre}</span>
                      <span className="text-[10px] font-bold text-white">{dia.numero}</span>
                    </div>
                  </th>
                );
              })}
              <th className="sticky right-0 top-0 z-40 bg-red-600 py-2 text-[8px] md:text-[10px] font-black w-[50px] text-center border-l border-slate-800">FALTAS</th>
            </tr>
           </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
          {loading ? (
           <tr>
            <td colSpan={diasDelMes.length + 3} className="py-20 text-center">
             <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizando con Supabase...</span>
              </div>
             </td>
           </tr>
         ) : filtrados.length === 0 ? (
        <tr>
          <td colSpan={diasDelMes.length + 3} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px]">
            No se encontraron registros de matrícula
          </td>
         </tr>
       ) : (
       filtrados.map((est, index) => {
       const asistenciaEst = datos[est.dni_estudiante] || {};
       // 1. CÁLCULO PREVIO: Contamos las faltas antes de retornar el JSX
       let totalFaltas = 0;
        diasDelMes.forEach(dia => {
         const valorBD = asistenciaEst[dia.numero] || '';
         const res = valorBD.toString().trim().toUpperCase().charAt(0);
         if (['F', 'A'].includes(res)) totalFaltas++;
         });
        const enRiesgo = totalFaltas >= 3;
        return (
            <tr key={est.id_matricula || est.dni_estudiante} className="hover:bg-slate-50 transition-colors group">
              {/* COLUMNA N° */}
               <td className="sticky left-0 z-30 bg-emerald-100 py-1 text-center text-[8px] md:text-[11px] font-bold text-emerald-600 border-r border-slate-300">
                {(index + 1).toString().padStart(2, '0')}
                  </td>

                 {/* COLUMNA APELLIDOS Y NOMBRES */}
               <td className="bg-white py-1 px-3 text-[8px] md:text-[10px] font-semibold text-slate-700 border-r border-slate-300/80 uppercase">
              {est.apellido_paterno} {est.apellido_paterno_materno || est.apellido_materno} {est.nombres}
             </td>
             {/* COLUMNAS DE DÍAS (ASISTENCIA) - ACTUALIZADO PARA SIGESCOM 2079 */}
             {diasDelMes.map(dia => {
             const valorBD = (asistenciaEst[dia.numero] || '').toString().trim().toUpperCase();
             const esFinde = dia.nombre === "Sáb" || dia.nombre === "Dom";
             let visualChar = '-';
             if (['.', 'P', '•'].includes(valorBD)) {
             visualChar = '•'; 
             } else if (['F', 'A', 'T', 'J', 'FJ', 'TJ'].includes(valorBD)) {
             visualChar = (valorBD === 'A') ? 'F' : valorBD;
             }
             const colorClass = 
                 (valorBD === 'F' || valorBD === 'A' || valorBD === 'FJ') ? 'text-red-600 font-bold' : 
                 (valorBD === 'T' || valorBD === 'TJ') ? 'text-amber-500 font-bold' : 
                 (valorBD === 'J') ? 'text-green-600 font-bold' : 
                 (['.', 'P', '•'].includes(valorBD)) ? 'text-slate-800 font-black' : 
                 'text-slate-300';

            return (
                <td 
                  key={dia.numero} 
                    className={`text-center py-0 border-r border-slate-300/80 min-w-[32px] md:min-w-[40px] ${esFinde ? 'bg-red-50' : 'bg-white'}`}
                      >
                     <span className={`text-[10px] md:text-[11px] select-none ${colorClass}`}>
                    {visualChar}
                   </span>
                  </td>
                  );
                 })}

                  {/* COLUMNA TOTAL FALTAS (LA MEJORA) */}
                   <td className={`sticky right-0 z-30 py-1 text-center font-semibold text-[10px] md:text-[11px] border-l border-slate-200 transition-all ${
                     enRiesgo 
                     ? 'bg-red-600 text-white animate-pulse shadow-inner' 
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
                })
              )}
           </tbody>
         </table>
       </div>
     </div>
   </div>
  );
};

export default ConsolidadoAsistencia;