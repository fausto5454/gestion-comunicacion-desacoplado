import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { BookOpen, ClipboardCheck, CheckCircle2, Loader2, GraduationCap, ChevronRight, School, LayoutGrid } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

const CalificacionesPage = ({ session }) => {
    const [loading, setLoading] = useState(false);
    const [cursosVisibles, setCursosVisibles] = useState([]);
    const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
    const [alumnos, setAlumnos] = useState([]);
    const [bimestreActivo, setBimestreActivo] = useState(1);

    const OPCIONES_GRADO_SECCION = [
        { value: '1A', label: '1° GRADO A' }, { value: '1B', label: '1° GRADO B' }, { value: '1C', label: '1° GRADO C' },
        { value: '2A', label: '2° GRADO A' }, { value: '2B', label: '2° GRADO B' }, { value: '2C', label: '2° GRADO C' },
        { value: '3A', label: '3° GRADO A' }, { value: '3B', label: '3° GRADO B' },
        { value: '4A', label: '4° GRADO A' }, { value: '4B', label: '4° GRADO B' },
        { value: '5A', label: '5° GRADO A' }, { value: '5B', label: '5° GRADO B' },
    ];

    const [filtroGrado, setFiltroGrado] = useState('');

    const AREAS_MINEDU = [
        "Matemática", "Comunicación", "Ciencia y Tecnología", "Ciencias Sociales", 
        "DPCC", "EPT", "Arte y Cultura", "Educación Física", "Religión", "Inglés", "Tutoría"
    ];

    // Carga dinámica de áreas al cambiar el grado
    useEffect(() => {
        if (filtroGrado) {
            const labelGrado = OPCIONES_GRADO_SECCION.find(g => g.value === filtroGrado)?.label;
            // Generamos las áreas específicas para ese grado seleccionado
            const nuevasAreas = AREAS_MINEDU.map((area, index) => ({
                id: `${filtroGrado}-${index}`,
                nombre: area,
                gradoLabel: labelGrado
            }));
            setCursosVisibles(nuevasAreas);
            setCursoSeleccionado(null); // Resetear curso al cambiar de grado
        }
    }, [filtroGrado]);

    const seleccionarCurso = (curso) => {
        setCursoSeleccionado(curso);
        // Simulación de carga de alumnos para la tabla
        setAlumnos([
            { id: 1, nombre: "ALVARADO RIVAS, Juan Alberto" },
            { id: 2, nombre: "CANO MENDOZA, Maria Fernanda" },
            { id: 3, nombre: "ZAVALA RIOS, Ricardo" }
        ]);
    };

    return (
        <div className="flex flex-col h-screen bg-white font-sans text-gray-900">
            <Toaster position="top-right" />
            
            {/* HEADER PROFESIONAL */}
            <header className="h-20 border-b flex justify-between items-center px-8 bg-white shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tighter text-gray-800">Registro Auxiliar</h1>
                        <p className="text-[10px] font-bold text-green-600 tracking-widest uppercase">Estructura Oficial SIAGIE 2024</p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    {[1, 2, 3, 4].map(n => (
                        <button 
                            key={n}
                            onClick={() => setBimestreActivo(n)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${
                                bimestreActivo === n ? 'bg-green-600 text-white shadow-sm scale-105' : 'text-gray-400 hover:bg-gray-200'
                            }`}
                        >
                            {n}° BIMESTRE
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* PANEL IZQUIERDO DINÁMICO */}
                <aside className="w-80 border-r bg-gray-50/50 flex flex-col shrink-0">
                    {/* SELECTOR DE GRADO */}
                    <div className="p-6 border-b bg-white">
                        <label className="text-[10px] font-black text-gray-400 tracking-widest mb-3 block">1. Seleccionar Grado</label>
                        <div className="relative group">
                            <select 
                                value={filtroGrado}
                                onChange={(e) => setFiltroGrado(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-1xl font-semibold text-gray-700 outline-none focus:border-green-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Elige Grado/Sección</option>
                                {OPCIONES_GRADO_SECCION.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>
                            <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors" size={20} />
                        </div>
                    </div>

                    {/* LISTA DE ÁREAS (Se habilita solo si hay grado seleccionado) */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 tracking-widest mb-4 px-2">2. Áreas Curriculares</p>
                        {filtroGrado ? (
                            cursosVisibles.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => seleccionarCurso(c)}
                                    className={`w-full p-4 rounded-2xl text-left border-2 transition-all group flex items-center gap-3 ${
                                        cursoSeleccionado?.id === c.id 
                                        ? 'bg-white border-green-600 shadow-xl translate-x-1' 
                                        : 'bg-transparent border-transparent text-gray-500 hover:bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                        cursoSeleccionado?.id === c.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600'
                                    }`}>
                                        <BookOpen size={18} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`font-black text-[11px] truncate ${cursoSeleccionado?.id === c.id ? 'text-gray-800' : ''}`}>
                                            {c.nombre}
                                        </p>
                                        <p className="text-[9px] font-bold opacity-50 tracking-tighter">{c.gradoLabel}</p>
                                    </div>
                                    <ChevronRight size={14} className={`shrink-0 transition-transform ${cursoSeleccionado?.id === c.id ? 'rotate-90 text-green-600' : 'text-gray-300'}`} />
                                </button>
                            ))
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl opacity-40 p-6 text-center">
                                <LayoutGrid size={32} className="mb-2 text-gray-400" />
                                <p className="text-[10px] font-bold leading-tight">Seleciona un grado para ver las áreas</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* CONTENIDO PRINCIPAL: TABLA DE NOTAS */}
                <main className="flex-1 bg-gray-50 p-10 overflow-y-auto">
                    {cursoSeleccionado ? (
                        <div className="max-w-6xl mx-auto space-y-6">
                            <div className="bg-white rounded-[2.5rem] border shadow-sm p-8 flex justify-between items-center">
                                <div className="flex items-center gap-5">
                                    <div className="w-1.5 h-12 bg-green-600 rounded-full"></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-800 tracking-tighter leading-none">{cursoSeleccionado.nombre}</h2>
                                        <p className="text-[10px] font-bold text-green-600 mt-2 uppercase tracking-widest">Nivel Secundaria • {cursoSeleccionado.gradoLabel}</p>
                                    </div>
                                </div>
                                <button className="bg-gray-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl active:scale-95">
                                    Guardar Registro
                                </button>
                            </div>

                            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <th className="px-10 py-6">Estudiante</th>
                                            <th className="px-6 py-6 text-center w-40">Logro (Nota)</th>
                                            <th className="px-10 py-6">Conclusión Descriptiva</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {alumnos.map((al, i) => (
                                            <tr key={al.id} className="hover:bg-green-50/20 transition-colors">
                                                <td className="px-10 py-5 font-bold text-xs text-gray-700 uppercase">
                                                    <span className="text-gray-300 mr-4 font-black">{i+1}</span> {al.nombre}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <select className="w-24 h-11 border-2 border-gray-100 rounded-xl text-center font-black text-sm focus:border-green-500 outline-none bg-gray-50 transition-all">
                                                        <option value="">-</option>
                                                        <option value="AD">AD</option>
                                                        <option value="A">A</option>
                                                        <option value="B">B</option>
                                                        <option value="C">C</option>
                                                    </select>
                                                </td>
                                                <td className="px-10 py-5">
                                                    <input type="text" className="w-full bg-gray-50 p-3 rounded-xl text-[11px] font-medium border border-transparent focus:border-green-100 focus:bg-white transition-all outline-none" placeholder="Evidencia del aprendizaje..." />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center bg-white p-16 rounded-[4rem] border shadow-sm max-w-sm">
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <GraduationCap size={40} className="text-green-600 opacity-40" />
                                </div>
                                <h3 className="text-sm font-black uppercase text-gray-400 tracking-[0.3em]">Gestión Académica</h3>
                                <p className="text-[11px] font-bold text-gray-400 mt-4 leading-relaxed">
                                    {filtroGrado 
                                        ? "Grado seleccionado. Ahora elija un área curricular de la lista izquierda para cargar la nómina."
                                        : "Inicie seleccionando un grado y sección en el panel lateral."}
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CalificacionesPage;