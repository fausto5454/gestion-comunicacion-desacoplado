import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabaseClient';
import { ShieldCheck, Save, Loader, HelpCircle, KeyRound, X } from 'lucide-react';
import { toast } from 'sonner';

const ConfigurarSeguridad = ({ user, onComplete, onCancel, modoValidacion = false }) => {
    const [pregunta, setPregunta] = useState('');
    const [respuesta, setRespuesta] = useState('');
    const [loading, setLoading] = useState(false);
    const [preguntaGuardada, setPreguntaGuardada] = useState('');

    const preguntasFijas = [
        "¿Cuál es el nombre de tu primera mascota?",
        "¿En qué ciudad naciste?",
        "¿Cuál era el nombre de tu escuela primaria?",
        "¿Cuál es el segundo apellido de tu madre?",
        "¿Cuál es tu plato favorito?"
    ];

    const normalizarTexto = (texto) => {
        return texto
            ?.toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") || "";
    };

    useEffect(() => {
        if (modoValidacion && user) {
            const q = user.pregunta_seguridad || user.pregunta;
            setPreguntaGuardada(q);
            setPregunta(q);
        }
    }, [modoValidacion, user]);

    const handleAccion = async (e) => {
        e.preventDefault();
        
        const respuestaProcesada = normalizarTexto(respuesta);
        if (!respuestaProcesada) {
            return toast.warning("Por favor, ingresa una respuesta válida");
        }
        
        setLoading(true);
        try {
            const identificador = user.correo_electronico || user.email || user.dni_estudiante || user.dni;
            
            if (modoValidacion) {
                const { data, error } = await supabase
                    .from('usuarios')
                    .select('id_usuario, correo_electronico')
                    .or(`correo_electronico.ilike.${identificador},id_usuario.eq.${user.id_usuario || user.id}`)
                    .eq('respuesta_seguridad', respuestaProcesada)
                    .maybeSingle();

                if (error || !data) throw new Error("La respuesta no coincide con nuestros registros");
                
                toast.success("¡Identidad confirmada!", {
                    description: "Procesando el cambio de acceso..."
                });
                if (onComplete) onComplete(data);
            } else {
                const { error } = await supabase
                    .from('usuarios')
                    .update({ 
                        pregunta_seguridad: pregunta, 
                        respuesta_seguridad: respuestaProcesada 
                    })
                    .eq('id_usuario', user.id_usuario || user.id);

                if (error) throw error;
                
                toast.success("Seguridad configurada", {
                    description: "Tus datos de recuperación se han actualizado."
                });
                if (onComplete) onComplete();
            }
        } catch (error) {
            toast.error("Error de validación", {
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border-b-[12px] border-indigo-600 relative overflow-hidden">
                
                {/* Decoración sutil de fondo para Sonner style */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-indigo-50 rounded-full opacity-50" />

                {onCancel && (
                    <button onClick={onCancel} className="absolute top-6 right-6 text-slate-400 hover:text-indigo-600 transition-colors z-10">
                        <X size={24} />
                    </button>
                )}

                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="bg-indigo-50 p-5 rounded-3xl mb-4 text-indigo-600 shadow-sm">
                        {modoValidacion ? <KeyRound size={40} /> : <ShieldCheck size={40} />}
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter text-center">
                        {modoValidacion ? "Verificar" : "Seguridad"}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium text-center mt-2 px-4">
                        {modoValidacion 
                            ? "Confirma tu respuesta para continuar" 
                            : "Configura tu llave de recuperación"}
                    </p>
                </div>

                <form onSubmit={handleAccion} className="space-y-5 relative z-10">
                    {modoValidacion ? (
                        <div className="bg-indigo-600 p-5 rounded-[1.5rem] shadow-lg">
                            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Tu pregunta guardada:</p>
                            <p className="text-white font-bold leading-tight">{preguntaGuardada || "Cargando..."}</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <select 
                                value={pregunta} 
                                onChange={(e) => setPregunta(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-400 focus:bg-white outline-none transition-all appearance-none text-sm font-bold text-slate-700 pr-10"
                                required
                            >
                                <option value="">¿Qué pregunta prefieres?</option>
                                {preguntasFijas.map((p, i) => <option key={i} value={p}>{p}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <HelpCircle size={18} />
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Tu respuesta aquí..."
                            value={respuesta}
                            onChange={(e) => setRespuesta(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-400 focus:bg-white outline-none font-bold text-sm transition-all"
                            required
                            autoComplete="off"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] disabled:opacity-50 transition-all uppercase text-sm tracking-widest flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader className="animate-spin" size={20} />
                        ) : (
                            <>
                                {modoValidacion ? <KeyRound size={18} /> : <Save size={18} />}
                                {modoValidacion ? "Validar" : "Guardar"}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ConfigurarSeguridad;