import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

const OrdenMerito = ({ seleccionInicial = "1° A" }) => {
  const [loading, setLoading] = useState(true);
  
  const partesIniciales = seleccionInicial.split(' ');
  const [gradoSeleccionado, setGradoSeleccionado] = useState(partesIniciales[0] || "1°");
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(partesIniciales[1] || "A");
  
  const [bimestre, setBimestre] = useState(1);
  const [modoAlcance, setModoAlcance] = useState('seccion');
  const [areaSeleccionada, setAreaSeleccionada] = useState('TODAS');

  const [alumnosMatriculados, setAlumnosMatriculados] = useState([]);
  const [calificacionesData, setCalificacionesData] = useState([]);

  const opcionesGradoSeccion = [
    "1° A", "1° B", "1° C",
    "2° A", "2° B", "2° C",
    "3° A", "3° B", "4° A",
    "4° B", "5° A", "5° B",
  ];

  // Las 10 áreas curriculares estándar
  const listaAreas = [
    "TODAS",
    "MATEMÁTICA",
    "COMUNICACIÓN",
    "CIENCIA Y TECNOLOGÍA",
    "CIENCIAS SOCIALES",
    "DPCC",
    "ARTE Y CULTURA",
    "EDUCACION FÍSICA",
    "EPT",
    "RELIGIÓN",
    "INGLÉS"
  ];

  const combinacionActual = `${gradoSeleccionado} ${seccionSeleccionada}`;

  const manejarCambioGradoSeccion = (e) => {
    const valor = e.target.value;
    const partes = valor.split(' ');
    const nuevaSeccion = partes.pop();
    const nuevoGrado = partes.join(' ');
    setGradoSeleccionado(nuevoGrado);
    setSeccionSeleccionada(nuevaSeccion);
    setModoAlcance('seccion');
  };

  useEffect(() => {
    const fetchDatosOrdenMerito = async () => {
      setLoading(true);
      try {
        let queryMatriculas = supabase
          .from('matriculas')
          .select('dni_estudiante, apellido_paterno, apellido_materno, nombres, grado, seccion')
          .eq('grado', gradoSeleccionado);

        if (modoAlcance === 'seccion') {
          queryMatriculas = queryMatriculas.eq('seccion', seccionSeleccionada);
        }

        const { data: matriculas, error: errorMat } = await queryMatriculas;
        if (errorMat) throw errorMat;

        setAlumnosMatriculados(matriculas || []);

        const dnis = matriculas?.map(m => String(m.dni_estudiante).trim()) || [];
        
        if (dnis.length > 0) {
          let queryCalificaciones = supabase
            .from('calificaciones')
            .select('*')
            .eq('bimestre', parseInt(bimestre))
            .eq('grado', gradoSeleccionado)
            .in('dni_estudiante', dnis);

          // Si se seleccionó un área específica, filtramos por el área correspondiente en la base de datos
          if (areaSeleccionada !== 'TODAS') {
            queryCalificaciones = queryCalificaciones.eq('area', areaSeleccionada);
          }

          const { data: calificaciones, error: errorCal } = await queryCalificaciones;

          if (errorCal) throw errorCal;
          setCalificacionesData(calificaciones || []);
        } else {
          setCalificacionesData([]);
        }

      } catch (error) {
        console.error('Error al cargar datos para orden de mérito:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDatosOrdenMerito();
  }, [gradoSeleccionado, seccionSeleccionada, bimestre, modoAlcance, areaSeleccionada]);

  const rankingCalculado = useMemo(() => {
    const escalaNotas = { "AD": 4, "A": 3, "B": 2, "C": 1, "": 0, "-": 0 };
    const inversaLetras = { 4: "AD", 3: "A", 2: "B", 1: "C" };

    const promedioALetra = (promedioNum) => {
      if (!promedioNum || promedioNum === 0) return '-';
      const redondeado = Math.round(promedioNum);
      return inversaLetras[redondeado] || 'C';
    };

    const promediosAlumnos = alumnosMatriculados.map(alumno => {
      const dniEst = String(alumno.dni_estudiante).trim();
      const nombreCompleto = `${alumno.apellido_paterno || ''} ${alumno.apellido_materno || ''}, ${alumno.nombres || ''}`.trim();
      
      const notasEstudiante = calificacionesData.filter(c => String(c.dni_estudiante).trim() === dniEst);

      let sumaTotalNotas = 0;
      let totalIndicadoresValidos = 0;

      notasEstudiante.forEach(reg => {
        for (let c = 1; c <= 4; c++) {
          for (let d = 1; d <= 4; d++) {
            const valorLetra = reg[`c${c}_d${d}`];
            const valorNumerico = escalaNotas[valorLetra];
            if (valorNumerico > 0) {
              sumaTotalNotas += valorNumerico;
              totalIndicadoresValidos++;
            }
          }
        }
      });

      const puntajePromedio = totalIndicadoresValidos > 0 ? sumaTotalNotas / totalIndicadoresValidos : 0;

      return {
        dni: dniEst,
        nombre: nombreCompleto,
        seccion: alumno.seccion,
        puntaje: puntajePromedio,
        letraPromedio: promedioALetra(puntajePromedio),
        evaluado: totalIndicadoresValidos > 0
      };
    });

    promediosAlumnos.sort((a, b) => b.puntaje - a.puntaje);

    let contadorPuesto = 1;
    return promediosAlumnos.map((alumno) => {
      const puestoAsignado = alumno.puntaje > 0 ? contadorPuesto++ : '-';
      return {
        ...alumno,
        ordenMerito: puestoAsignado
      };
    });
  }, [alumnosMatriculados, calificacionesData]);

  const renderizarIndicadorPuesto = (puesto) => {
    return (
      <span className="font-black text-xs text-slate-700">
        {puesto !== '-' ? `${puesto}°` : '-'}
      </span>
    );
  };

  return (
    <div className="w-full min-h-full bg-slate-100/60 p-4 md:p-8">
      {/* Controles superiores estilizados */}
      <div className="bg-slate-600 rounded-3xl p-6 border border-slate-600 shadow-lg mb-6 flex flex-col gap-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-green-400 font-black text-xs tracking-widest uppercase mb-1">
              <Trophy className="w-5 h-5" /> Cuadro de Rendimiento Académico
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Orden de Mérito y Puestos</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={combinacionActual}
              onChange={manejarCambioGradoSeccion}
              className="bg-white border border-slate-300 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-2xl outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              {opcionesGradoSeccion.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-600">
              <button
                onClick={() => setModoAlcance('seccion')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  modoAlcance === 'seccion' ? 'bg-white text-slate-700 shadow-md' : 'text-slate-300 hover:text-white'
                }`}
              >
                POR SECCIÓN
              </button>
              <button
                onClick={() => setModoAlcance('grado')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                  modoAlcance === 'grado' ? 'bg-white text-slate-700 shadow-md' : 'text-slate-300 hover:text-white'
                }`}
              >
                GRADO GLOBAL
              </button>
            </div>

            <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-600">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setBimestre(num)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${
                    bimestre === num ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {num}° BIM
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selector de Áreas */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-600/60">
          <div className="flex items-center gap-2 text-slate-200 text-xs font-black uppercase tracking-wider w-full sm:w-auto">
            <BookOpen className="w-5 h-5 text-green-500" /> Filtrar por Área:
          </div>
          <select
            value={areaSeleccionada}
            onChange={(e) => setAreaSeleccionada(e.target.value)}
            className="w-full sm:w-auto flex-1 bg-slate-800 border border-slate-600 text-white font-bold text-xs px-4 py-2.5 rounded-2xl outline-none shadow-sm cursor-pointer hover:bg-slate-800/80 transition-colors"
          >
            {listaAreas.map(area => (
              <option key={area} value={area}>
                {area === 'TODAS' ? '⭐ TODAS LAS ÁREAS (Promedio General)' : area}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Ranking Profesional */}
      <div className="bg-slate-100 rounded-3xl shadow-md border border-slate-300 overflow-hidden mb-12">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-700" />
            <span className="text-xs font-black text-pink-600 uppercase tracking-wider">
              {modoAlcance === 'seccion' ? `Ranking de la Sección ${seccionSeleccionada} (${gradoSeleccionado})` : `Ranking General del Grado ${gradoSeleccionado}`} 
              {areaSeleccionada !== 'TODAS' && <span className="text-emerald-600 font-extrabold"> — Área: {areaSeleccionada}</span>}
            </span>
          </div>
          <span className="text-[10px] font-bold text-pink-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-300">
            Total Evaluados: {rankingCalculado.filter(a => a.puntaje > 0).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculando orden de mérito...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-600 border-b border-slate-600 text-[11px] font-black text-white">
                  <th className="p-4 text-center w-28 bg-emerald-700">PUESTO</th>
                  <th className="p-4">ESTUDIANTE</th>
                  <th className="p-4 text-center">SECCIÓN</th>
                  <th className="p-4 text-center">EQUIVALENTE</th>
                  <th className="p-4 text-right pr-8 bg-pink-600">PROMEDIO (4 - 1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rankingCalculado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      No hay registros de calificaciones disponibles para este filtro.
                    </td>
                  </tr>
                ) : (
                  rankingCalculado.map((alumno, idx) => (
                    <tr key={alumno.dni || idx} className="hover:bg-slate-50/90 transition-colors">
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 text-slate-800 font-black text-xs shadow-2xs">
                          {renderizarIndicadorPuesto(alumno.ordenMerito)}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">{alumno.nombre}</td>
                      <td className="p-4 text-center font-bold text-slate-600">
                        <span className="bg-slate-100 px-3 py-1 rounded-xl text-[10px] border border-slate-200">{alumno.seccion}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-xl font-black text-[11px] ${
                          alumno.letraPromedio === 'AD' ? 'bg-emerald-100 text-emerald-500 border border-emerald-200' :
                          alumno.letraPromedio === 'A' ? 'bg-blue-100 text-blue-500 border border-blue-200' :
                          alumno.letraPromedio === 'B' ? 'bg-amber-100 text-amber-500 border border-amber-200' :
                          alumno.letraPromedio === 'C' ? 'bg-rose-100 text-rose-500 border border-rose-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {alumno.letraPromedio}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-8 font-mono font-black text-pink-600 text-sm">
                        {alumno.puntaje > 0 ? alumno.puntaje.toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdenMerito;