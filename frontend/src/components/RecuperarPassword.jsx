import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Loader, ArrowLeft, Lock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const RecuperarPassword = ({ alCerrar }) => {
    const [step, setStep] = useState(1); 
    const [identifier, setIdentifier] = useState('');
    const [userData, setUserData] = useState(null);
    const [respuestaUser, setRespuestaUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const normalizar = (t) => t?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    // PASO 1: Buscar al usuario
   const handleCheckUser = async (e) => {
    e.preventDefault();
    if (!identifier) return toast.warning("Por favor, ingresa tu DNI o Correo.");
    
    setLoading(true);
    const valorLimpio = identifier.trim();

    try {
        let { data: docente, error: errorU } = await supabase
            .from('usuarios')
            .select('pregunta_seguridad, respuesta_seguridad, correo_electronico, nombre_completo')
            .ilike('correo_electronico', valorLimpio)
            .maybeSingle();

        if (errorU) throw errorU;

        let usuarioValido = docente;
        let esEstudiante = false;

        if (!usuarioValido) {
            const { data: estudiante, error: errorE } = await supabase
                .from('matriculas')
                .select('pregunta_seguridad, respuesta_seguridad, dni_estudiante, nombre_completo')
                .eq('dni_estudiante', valorLimpio)
                .maybeSingle();
            
            if (errorE) throw errorE;
            if (estudiante) {
                usuarioValido = estudiante;
                esEstudiante = true;
            }
        }

        if (usuarioValido) {
            // Limpiamos el rastro de 'EMPTY' o 'NULL' de la base de datos
            const preguntaDB = String(usuarioValido.pregunta_seguridad || '').trim().toUpperCase();
            const sinPregunta = !preguntaDB || preguntaDB === 'EMPTY' || preguntaDB === 'NULL';

            let instruccionVisual;
            let respuestaRequerida;

            if (sinPregunta) {
                // Personalización amigable para el usuario
                if (esEstudiante) {
                    instruccionVisual = "Para confirmar tu identidad como estudiante, por favor ingresa tu número de DNI.";
                    respuestaRequerida = usuarioValido.dni_estudiante;
                } else {
                    instruccionVisual = "Por seguridad, confirma tu ID de usuario (tu correo sin el @dominio.com).";
                    // Extraemos jcahuaza de jcahuaza@hotmail.com
                    respuestaRequerida = usuarioValido.correo_electronico.split('@')[0];
                }
            } else {
                instruccionVisual = usuarioValido.pregunta_seguridad;
                respuestaRequerida = usuarioValido.respuesta_seguridad;
            }

            setUserData({
                pregunta_seguridad: instruccionVisual,
                respuesta_seguridad: respuestaRequerida,
                identificador: esEstudiante ? usuarioValido.dni_estudiante : usuarioValido.correo_electronico,
                esDNI: esEstudiante,
                nombre: usuarioValido.nombre_completo.split(' ')[0] // Saludamos por su primer nombre
            });

            setStep(2); // Redirección al formulario de respuesta
            toast.success(`¡Hola ${usuarioValido.nombre_completo.split(' ')[0]}! Validemos tu acceso.`);
        } else {
            toast.error("No encontramos una cuenta asociada a esos datos.");
        }
     } catch (err) {
        console.error("Error en flujo:", err);
        toast.error("Error de comunicación con el servidor.");
     } finally {
        setLoading(false);
     }
    };

    // PASO 2: Verificar Respuesta
    const handleVerifyAnswer = (e) => {
        e.preventDefault();
        const inputLimpio = normalizar(respuestaUser);
        const dbLimpia = normalizar(userData?.respuesta_seguridad);

        if (inputLimpio === dbLimpia) {
            setStep(3);
            toast.success("Identidad verificada exitosamente");
        } else {
            toast.error("La respuesta no coincide");
        }
     };

    // PASO 3: Actualizar Password
    const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        const { data, error: rpcError } = await supabase.rpc('rpc_final_update_pass', {
            p_identificador: String(userData.identificador), 
            p_nueva_password: String(newPassword), 
            p_es_dni: Boolean(userData.esDNI)              
        });

        if (rpcError) throw rpcError;

        // Forzamos el mensaje de éxito si la respuesta es positiva
        if (data === true) {
            toast.success("¡Contraseña actualizada correctamente!", {
                description: "Tu cuenta ahora es más segura.",
                duration: 4000
            });

            // Delay para que el usuario vea el mensaje antes de que se cierre el modal
            setTimeout(() => {
                alCerrar(); 
            }, 2000);
        } else {
            toast.error("No se pudo realizar el cambio", {
                description: "Usuario no encontrado."
            });
        }
     } catch (err) {
        console.error("Error detectado:", err);
        toast.error("Error en el sistema", {
            description: "No se pudo conectar con la base de datos."
        });
     } finally {
        setLoading(false);
     }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm px-4">
            <div className="bg-white p-8 shadow-2xl rounded-[30px] w-full max-w-sm border-b-[10px] border-green-600 animate-in fade-in zoom-in duration-300">
                <button onClick={alCerrar} className="flex items-center text-gray-400 hover:text-green-600 mb-6 transition-colors font-bold text-sm">
                    <ArrowLeft size={18} className="mr-1" /> Volver
                </button>

                {step === 1 && (
                    <form onSubmit={handleCheckUser} className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Recuperar</h3>
                        <p className="text-xs font-medium text-slate-500">Ingresa tu DNI o Correo Institucional.</p>
                        <input type="text" placeholder="Ej: 71234567 o user@mail.com" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full py-4 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-400 focus:bg-white outline-none transition-all font-bold text-sm" required />
                        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center justify-center">
                            {loading ? <Loader className="animate-spin" size={20} /> : 'BUSCAR USUARIO'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAnswer} className="space-y-4">
                        <div className="bg-green-50 p-5 rounded-2xl border-2 border-green-100">
                            <div className="flex items-center text-green-700 mb-2 gap-2">
                                <HelpCircle size={18} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Pregunta de Seguridad</span>
                            </div>
                            <p className="text-slate-800 font-bold leading-tight italic">
                                "{userData?.pregunta_seguridad}"
                            </p>
                        </div>
                        <input type="text" placeholder="Escribe tu respuesta..." value={respuestaUser} onChange={(e) => setRespuestaUser(e.target.value)} className="w-full py-4 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-400 focus:bg-white outline-none font-bold text-sm transition-all" required autoComplete="off" />
                        <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 shadow-xl transition-all">
                            VERIFICAR RESPUESTA
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="flex items-center text-slate-800 mb-2 gap-2">
                            <Lock size={20} className="text-blue-600" />
                            <h3 className="text-lg font-black uppercase tracking-tighter">Nueva Clave</h3>
                        </div>
                        <input type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full py-4 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-400 focus:bg-white outline-none font-bold text-sm transition-all" required />
                        <button type="submit" disabled={loading} className="w-full bg-blue-700 text-white py-4 rounded-2xl font-black hover:bg-blue-800 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
                            {loading ? <Loader className="animate-spin" size={20} /> : 'ACTUALIZAR CONTRASEÑA'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RecuperarPassword;