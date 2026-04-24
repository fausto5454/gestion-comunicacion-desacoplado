import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Loader, ArrowLeft, Lock, HelpCircle, ChevronDown } from 'lucide-react'; // Agregado ChevronDown
import { toast } from 'sonner';

const RecuperarPassword = ({ alCerrar }) => {
    const [step, setStep] = useState(1); 
    const [identifier, setIdentifier] = useState('');
    const [userData, setUserData] = useState(null);
    const [pregunta, setPregunta] = useState('');
    const [respuestaUser, setRespuestaUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const preguntasFijas = [
       "¿Cuál es el nombre de tu primera mascota?",
       "¿En qué ciudad naciste?",
       "¿Cuál era el nombre de tu escuela primaria?",
       "¿Cuál es tu plato favorito?",
       "¿Cuál es el segundo apellido de tu madre?"
    ];

    const normalizar = (t) => t?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    // PASO 1: Buscar al usuario
    const handleCheckUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const idLimpio = identifier.trim();
        const esEmail = idLimpio.includes('@');
        const tabla = esEmail ? 'usuarios' : 'matriculas';
        
        // Mantenemos la búsqueda por DNI o Correo
        const columnaBusqueda = esEmail ? 'correo_electronico' : 'dni_estudiante';

        const { data: usuario, error } = await supabase
            .from(tabla)
            .select('*')
            .eq(columnaBusqueda, idLimpio)
            .single();

        if (error || !usuario) {
            toast.error("Usuario no encontrado en la base de datos");
            return;
        }

        const valPregunta = usuario.pregunta_seguridad?.toString().trim().toLowerCase();
        const esPendiente = !valPregunta || valPregunta === 'pendiente' || valPregunta === 'empty';

        // CAMBIO CRÍTICO: Asignamos id_matricula si es estudiante para evitar errores de actualización
        const datosParaEstado = {
            id_usuario: esEmail ? usuario.id_usuario : usuario.id_matricula, 
            tablaDestino: tabla,
            pregunta_seguridad: esPendiente ? "" : usuario.pregunta_seguridad, 
            respuesta_correcta: esPendiente ? "" : usuario.respuesta_seguridad,
            esNuevo: esPendiente
        };

        console.log("Datos capturados (UUID para estudiantes):", datosParaEstado);
        setUserData(datosParaEstado);
        
        if (!esPendiente) setPregunta(usuario.pregunta_seguridad);
        
        setStep(2); 

    } catch (err) {
        console.error("Error en Paso 1:", err.message);
        toast.error("Hubo un problema al buscar el usuario.");
    } finally {
        setLoading(false);
    }
   };

   // PASO 2: Verificar o Configurar Seguridad
   const handleSaveSecurityData = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Usamos el campo id_matricula específicamente para estudiantes
        const campoId = userData.tablaDestino === 'matriculas' ? 'id_matricula' : 'id_usuario';

        const { data, error } = await supabase
            .from(userData.tablaDestino)
            .update({
                pregunta_seguridad: pregunta,
                respuesta_seguridad: respuestaUser.trim().toLowerCase()
            })
            .eq(campoId, userData.id_usuario) // Este ID debe ser el UUID capturado en el Paso 1
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            toast.success("Seguridad registrada correctamente");
            setStep(3);
        } else {
            // Si llega aquí con RLS activo, es que la política denegó el cambio
            console.warn("La base de datos no devolvió registros actualizados.");
            toast.error("Error de permisos: Verifica las políticas RLS en Supabase.");
        }
    } catch (err) {
        toast.error("Error: " + err.message);
    } finally {
        setLoading(false);
    }
   };

   // PASO 3: Actualizar Password
   const handleUpdatePassword = async (e) => {
     e.preventDefault();
     if (newPassword.length < 6) {
        toast.error("La clave debe tener al menos 6 caracteres");
        return;
    }
    setLoading(true);
    try {
        const { data, error } = await supabase.rpc('rpc_final_update_pass', {
            p_identificador: userData.id_usuario.toString(), 
            p_nueva_password: newPassword,
            p_nueva_pregunta: pregunta,       
            p_nueva_respuesta: respuestaUser.trim().toLowerCase(), 
            p_es_dni: userData.tablaDestino === 'matriculas' 
        });

        if (error) throw error;
        
        toast.success("¡Contraseña actualizada!");
        setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
        console.error("Error en Paso 3:", err.message);
        toast.error("Error al actualizar la contraseña.");
    } finally {
        setLoading(false);
    }
   };

   const [respuestaEscrita, setRespuestaEscrita] = useState("");
   const verificarRespuesta = (e) => {
    if (e) e.preventDefault();
    const usuarioEscribio = respuestaUser.trim().toLowerCase();
    const respuestaCorrecta = userData.respuesta_correcta.trim().toLowerCase();
    if (usuarioEscribio === respuestaCorrecta) {
        toast.success("Identidad verificada con éxito");
        setStep(3);
    } else {
        toast.error("La respuesta de seguridad no coincide");
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
                <form 
                onSubmit={handleSaveSecurityData} // Ahora handleSaveSecurityData maneja la validación o el guardado
                className="space-y-4">
                <div className="bg-green-50 p-5 rounded-2xl border-2 border-green-100">
                 <div className="flex items-center text-green-700 mb-2 gap-2">
                  <HelpCircle size={18} />
                   <span className="text-[10px] font-black uppercase tracking-widest">
                    {userData?.esNuevo ? "Configurar Pregunta" : "Pregunta de Seguridad"}
                   </span>
                  </div>
               {userData?.esNuevo ? (
             <div className="relative">
             <select 
            required
            className="w-full bg-transparent font-bold text-slate-800 outline-none appearance-none pr-8 cursor-pointer"
            value={pregunta} 
            onChange={(e) => {
              const valorElegido = e.target.value;
              setPregunta(valorElegido); 
              setUserData(prev => ({ 
                ...prev, 
                pregunta_seguridad: valorElegido 
              }));
            }}>
            <option value="" disabled>Selecciona una pregunta...</option>
            {preguntasFijas.map((p, i) => (
              <option key={i} value={p}>{p}</option>
            ))}
          </select>
          <ChevronDown 
            size={16} 
            className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-green-600" />
          </div>
           ) : (
            <p className="text-slate-800 font-bold leading-tight italic">
             "{userData?.pregunta_seguridad || "Cargando pregunta..."}"
            </p>
             )}
             </div>
               <input 
                  type="text" 
                  placeholder={userData?.esNuevo ? "Define tu respuesta..." : "Escribe tu respuesta..."} 
                  value={respuestaUser} 
                  onChange={(e) => setRespuestaUser(e.target.value)} 
                  className="w-full py-4 px-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-green-400 focus:bg-white outline-none font-bold text-sm transition-all" 
                  required 
                  autoComplete="off" />
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700 shadow-xl transition-all uppercase flex items-center justify-center">
                  {loading ? (
                  <Loader className="animate-spin" size={20} />
                 ) : (
                  userData?.esNuevo ? "Guardar y Continuar" : "Verificar Respuesta"
                  )}
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