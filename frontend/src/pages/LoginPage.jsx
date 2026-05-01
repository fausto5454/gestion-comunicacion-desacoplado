import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { AlertTriangle, Loader, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import RecuperarPassword from "../components/RecuperarPassword";

const LoginPage = ({ onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mostrarRecuperar, setMostrarRecuperar] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const input = identifier.trim();
        const isDNI = /^\d{8}$/.test(input);
        const finalAuthEmail = isDNI ? `${input}@estudiante.ai` : input;

        // 1. INTENTO DE INICIO DE SESIÓN DIRECTO
        let { data, error: authError } = await supabase.auth.signInWithPassword({ 
            email: finalAuthEmail, 
            password 
        });

        // 2. MANEJO DE AUTO-REGISTRO (Solo si no existe en Auth pero sí en Matrículas)
        if (authError && isDNI) {
            // Verificamos si el error es realmente que no existe el usuario
            // En Supabase, a veces el error de "no existe" se confunde con credenciales inválidas
            if (authError.message.includes('Invalid login credentials')) {
                
                // Antes de registrar, verificamos si el DNI existe en nuestra base de datos académica
                const { data: mCheck } = await supabase
                    .from('matriculas')
                    .select('dni_estudiante')
                    .eq('dni_estudiante', input)
                    .maybeSingle();

                if (mCheck) {
                    // Si el DNI existe en matrículas pero no en Auth, lo registramos
                    const { data: sData, error: sError } = await supabase.auth.signUp({
                        email: finalAuthEmail,
                        password: password
                    });

                    if (sError) {
                        // Si aquí sale "User already registered", intentamos login una vez más
                        // o informamos que la contraseña es incorrecta.
                        if (sError.message.includes("already registered")) {
                            throw new Error("La contraseña es incorrecta para este DNI.");
                        }
                        throw sError;
                    }
                    data = sData;
                } else {
                    throw new Error("El DNI no se encuentra matriculado en el sistema.");
                }
            } else {
                throw authError;
            }
        } else if (authError) {
            throw authError;
        }

        // 3. VINCULACIÓN Y SESIÓN
        if (data?.session) {
            const user = data.session.user;

            if (isDNI) {
                localStorage.setItem('dni_estudiante', input);
                if (password === input) localStorage.setItem('require_password_change', 'true');

                // Vinculación con matriculas (usando maybeSingle para evitar errores de objeto)
                const { data: matricula } = await supabase
                    .from('matriculas')
                    .select('id_matricula, id_usuario')
                    .eq('dni_estudiante', input)
                    .maybeSingle();

                if (matricula && !matricula.id_usuario) {
                    await supabase
                        .from('matriculas')
                        .update({ id_usuario: user.id })
                        .eq('id_matricula', matricula.id_matricula);
                }
            }
            onLoginSuccess(data.session);
        }
    } catch (err) {
        // Traducción de errores comunes para el usuario final
        let mensaje = err.message;
        if (mensaje.includes('Invalid login credentials')) mensaje = 'DNI o contraseña incorrectos';
        if (mensaje.includes('already registered')) mensaje = 'Este usuario ya tiene una cuenta activa. Verifique su contraseña.';
        
        setError(mensaje);
    } finally {
        setLoading(false);
    }
   };

   // RENDERIZADO CONDICIONAL: Si el usuario hizo clic en "¿Olvidaste tu contraseña?"
   if (mostrarRecuperar) {
    return (
        <RecuperarPassword 
            alCerrar={() => {
                setMostrarRecuperar(false);
                setIdentifier(''); // Limpia el usuario por seguridad
                setPassword('');   // Limpia la clave anterior
            }} 
          />
       );
    }

    return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-[#86EFAC] p-8 shadow-2xl rounded-[40px] w-full max-w-sm border border-gray-400">
            <div className="flex justify-center mb-4">
                <img src="logo.png" alt="Logo" className="w-22 h-20 object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-center text-green-700 mb-6 italic">Bienvenido</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg text-xs flex items-center shadow-sm">
                        <AlertTriangle size={14} className="mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Correo_electronico o DNI" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        className="w-full py-3 pl-11 pr-4 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
                        required 
                    />
                    <div className="absolute left-3 top-3.5 text-green-600">
                        {/^\d+$/.test(identifier) ? <User size={18} /> : <Mail size={18} />}
                    </div>
                </div>
                
                {/* Input: Contraseña con OJITO */}
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Contraseña" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full py-3 pl-11 pr-12 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
                        required />
                    <div className="absolute left-3 top-3.5 text-green-600">
                        <Lock size={18} />
                    </div>
                    {/* Botón del Ojito */}
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-green-600 hover:text-green-600 transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                <div className="text-right">
                   <button 
                    type="button" 
                    onClick={() => setMostrarRecuperar(true)} 
                    className="text-[12px] text-blue-700 hover:underline font-bold opacity-80"
                     >
                   ¿Olvidaste tu contraseña?
                 </button>
                </div>
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-red-600 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center transition-all shadow-lg active:scale-95">
                    {loading ? <Loader className="animate-spin mr-2" /> : 'Iniciar Sesión'}
                </button>
                <div className="pt-2 text-center">
                     <p className="text-[11px] text-green-900 font-medium leading-tight opacity-75">
                         <strong> * Estudiantes: </strong>
                          Usar su DNI de 8 dígitos como usuario.
                     </p>
                 </div>
             </form>
         </div>
     </div>
   );
};

export default LoginPage;