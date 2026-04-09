import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Loader, ArrowLeft, CheckCircle, AlertCircle, Lock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const RecuperarPassword = ({ alCerrar }) => {
    const [step, setStep] = useState(1); // 1: Identificación, 2: Pregunta, 3: Nueva Clave
    const [identifier, setIdentifier] = useState('');
    const [userData, setUserData] = useState(null);
    const [respuestaUser, setRespuestaUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // PASO 1: Buscar al usuario y su pregunta
    const handleCheckUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    const valorLimpio = identifier.trim().toLowerCase();
    
    console.log("Intentando recuperar para:", `"${valorLimpio}"`);

    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('pregunta_seguridad, respuesta_seguridad, correo_electronico')
            .ilike('correo_electronico', valorLimpio) 
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            console.error("Inconsistencia: El correo no devolvió datos.");
            toast.error("No se encontró el perfil de seguridad.");
            setLoading(false);
            return;
        }

        console.log("Coincidencia encontrada:", data.correo_electronico);
        setUserData(data);
        setStep(2);
     } catch (err) {
         toast.error("Error de base de datos");
     } finally {
         setLoading(false);
     }
    };
        
    const normalizar = (t) => t?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    const handleVerifyAnswer = (e) => {
    e.preventDefault();
    
    const inputLimpio = normalizar(respuestaUser);
    const dbLimpia = normalizar(userData?.respuesta_seguridad);

    console.log("Comparación técnica:", { input: inputLimpio, db: dbLimpia });

    if (!userData?.respuesta_seguridad) {
        return toast.error("Error: Datos de seguridad no cargados", { style: { zIndex: 100000 } });
    }

    if (inputLimpio === dbLimpia) {
        setStep(3);
        toast.success("Identidad verificada");
    } else {
        toast.error("La respuesta es incorrecta", { 
            style: { zIndex: 100000 },
            description: "Revisa tildes o espacios." 
        });
     }
    };

   const handleUpdatePassword = async () => {
    // 1. Validación preventiva
    if (newPassword.length < 6) {
        return toast.error("La contraseña debe tener al menos 6 caracteres");
    }

    // 2. Estado de carga (opcional pero recomendado)
    // setLoading(true); 

    const esDNI_Final = !!userData?.esDNI; 
    
    try {
        const { data, error: rpcError } = await supabase.rpc('rpc_final_update_pass', {
            p_identificador: identifier.trim(),
            p_nueva_password: String(newPassword), 
            p_es_dni: esDNI_Final               
        });

        if (rpcError) throw rpcError;

        if (data === true) {
            // 3. PRIORIDAD: Lanzar el mensaje inmediatamente
            // Usamos 'promise' o un toast simple pero con duración extendida
            toast.success("¡Contraseña actualizada con éxito!", {
                style: { zIndex: 100000 },
                description: "Redirigiendo al inicio de sesión...",
                duration: 4000, // Aumentamos a 4 segundos para asegurar visibilidad
            });

            // 4. RETRASO CRÍTICO: No desmontar el componente de inmediato
            // Esto permite que el portal de Sonner se mantenga activo
            setTimeout(() => {
                setStep(1); 
                setIdentifier(""); 
                setNewPassword("");
                if (setRespuestaUser) setRespuestaUser(""); // Limpiar también la respuesta
                
                // Si usas una función para cerrar el modal o cambiar de vista, llámala aquí
                // setIsRecoveryOpen(false);
                console.log("Redirección completada");
            }, 2500); 

        } else {
            toast.error("No se pudo identificar al usuario.", { 
                style: { zIndex: 100000 } 
            });
        }
    } catch (error) {
        console.error("Error del servidor:", error.message);
        toast.error("Error técnico: " + error.message, { 
            style: { zIndex: 100000 } 
        });
     } finally {
        // setLoading(false);
     }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-800 px-4">
            <div className="bg-white p-8 shadow-2xl rounded-[30px] w-full max-w-sm border border-green-200">
                <button onClick={alCerrar} className="flex items-center text-gray-500 hover:text-green-600 mb-4 transition-colors">
                    <ArrowLeft size={18} className="mr-1" /> <span className="text-sm font-medium">Volver</span>
                </button>

                {step === 1 && (
                    <form onSubmit={handleCheckUser} className="space-y-4">
                        <h3 className="text-xl font-bold text-green-700">Recuperar Acceso</h3>
                        <p className="text-xs text-gray-500">Ingresa tu DNI o correo_electronico para buscar tu pregunta de seguridad.</p>
                        <div className="relative">
                            <input type="text" placeholder="DNI o correo_electronico" value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-gray-50 border outline-none focus:ring-2 focus:ring-green-400" required />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all">
                            {loading ? <Loader className="animate-spin mx-auto" /> : 'Continuar'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyAnswer} className="space-y-4">
                        <div className="flex items-center text-green-700 mb-2">
                            <HelpCircle size={20} className="mr-2" />
                            <h3 className="text-lg font-bold">Pregunta de Seguridad</h3>
                        </div>
                        <p className="bg-green-50 p-3 rounded-lg text-sm italic border border-green-100">
                            {userData?.pregunta_seguridad}
                        </p>
                        <input type="text" placeholder="Tu respuesta" value={respuestaUser} onChange={(e) => setRespuestaUser(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-gray-50 border outline-none focus:ring-2 focus:ring-green-400" required />
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700">
                            Verificar Respuesta
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="flex items-center text-green-700 mb-2">
                            <Lock size={20} className="mr-2" />
                            <h3 className="text-lg font-bold">Nueva Contraseña</h3>
                        </div>
                        <input type="password" placeholder="Escribe tu nueva clave" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full py-3 px-4 rounded-xl bg-gray-50 border outline-none focus:ring-2 focus:ring-green-400" required />
                        <button type="submit" disabled={loading} className="w-full bg-blue-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg">
                            {loading ? <Loader className="animate-spin mx-auto" /> : 'Actualizar Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RecuperarPassword;