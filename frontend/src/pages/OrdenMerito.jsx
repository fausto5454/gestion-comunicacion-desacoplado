import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Award, Users, Loader2 } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

const OrdenMerito = ({ seleccionInicial = "1° A" }) => {
  const [loading, setLoading] = useState(true);
  
  const partesIniciales = seleccionInicial.split(' ');
  const [gradoSeleccionado, setGradoSeleccionado] = useState(partesIniciales[0] || "1°");
  const [seccionSeleccionada, setSeccionSeleccionada] = useState(partesIniciales[1] || "A");
  
  const [bimestre, setBimestre] = useState(1);
  const [modoAlcance, setModoAlcance] = useState('seccion');

  const [alumnosMatriculados, setAlumnosMatriculados] = useState([]);
  const [calificacionesData, setCalificacionesData] = useState([]);

  const opcionesGradoSeccion = [
    "1° A", "1° B", "1° C",
    "2° A", "2° B", "2° C",
    "3° A", "3° B", "4° A",
    "4° B", "5° A", "5° B",
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
          const { data: calificaciones, error: errorCal } = await supabase
            .from('calificaciones')
            .select('*')
            .eq('bimestre', parseInt(bimestre))
            .eq('grado', gradoSeleccionado)
            .in('dni_estudiante', dnis);

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
  }, [gradoSeleccionado, seccionSeleccionada, bimestre, modoAlcance]);

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
      <span className="font-black text-xs text-emerald-500">
        {puesto !== '-' ? `${puesto}°` : '-'}
      </span>
    );
  };

  return (
    <div className="w-full min-h-full bg-slate-50 p-4 md:p-8">
      {/* Controles superiores */}
      <div className="bg-slate-600 rounded-3xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-green-400 font-black text-xs tracking-widest uppercase mb-1">
            <Trophy className="w-5 h-5" /> Cuadro de Rendimiento Académico
          </div>
          <h2 className="text-xl font-black text-white">Orden de Mérito y Puestos</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={combinacionActual}
            onChange={manejarCambioGradoSeccion}
            className="bg-white border border-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-2xl outline-none shadow-sm cursor-pointer"
          >
            {opcionesGradoSeccion.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setModoAlcance('seccion')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                modoAlcance === 'seccion' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              POR SECCIÓN
            </button>
            <button
              onClick={() => setModoAlcance('grado')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
                modoAlcance === 'grado' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GRADO GLOBAL
            </button>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => setBimestre(num)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${
                  bimestre === num ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num}° BIM
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Ranking */}
      <div className="bg-slate-100 rounded-3xl shadow-sm border border-slate-300 overflow-hidden mb-12">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-[14px] font-black text-green-600 uppercase tracking-wider">
              {modoAlcance === 'seccion' ? `Ranking de la Sección ${seccionSeleccionada} (${gradoSeleccionado})` : `Ranking General del Grado ${gradoSeleccionado}`}
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border-b border-slate-400">
            Total Evaluados: {rankingCalculado.filter(a => a.puntaje > 0).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculando orden de mérito desde Supabase...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-600 border-b border-slate-200 text-[11px] font-black text-slate-100">
                  <th className="p-4 text-center w-24">PUESTO</th>
                  <th className="p-4">ESTUDIANTE</th>
                  <th className="p-4 text-center">SECCIÓN</th>
                  <th className="p-4 text-center">EQUIVALENTE</th>
                  <th className="p-4 text-right pr-6 bg-pink-600">PROMEDIO (4 - 1)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rankingCalculado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">
                      No hay registros de matrícula disponibles para este filtro.
                    </td>
                  </tr>
                ) : (
                  rankingCalculado.map((alumno, idx) => (
                    <tr key={alumno.dni || idx} className="hover:bg-slate-50/85 transition-colors">
                      <td className="p-4 text-center">
                        {renderizarIndicadorPuesto(alumno.ordenMerito)}
                      </td>
                      <td className="p-4 font-bold text-slate-800">{alumno.nombre}</td>
                      <td className="p-4 text-center font-bold text-emerald-400">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-xl text-[11px]">{alumno.seccion}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-xl font-black text-[11px] ${
                          alumno.letraPromedio === 'AD' ? 'bg-emerald-100 text-emerald-500' :
                          alumno.letraPromedio === 'A' ? 'bg-blue-100 text-blue-500' :
                          alumno.letraPromedio === 'B' ? 'bg-amber-100 text-amber-500' :
                          alumno.letraPromedio === 'C' ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {alumno.letraPromedio}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-6 font-mono font-black text-red-500 text-sm">
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