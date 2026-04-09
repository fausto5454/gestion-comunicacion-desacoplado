import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { AlertTriangle, Loader, User, Mail, Lock } from 'lucide-react';
import RecuperarPassword from "../components/RecuperarPassword";

const LoginPage = ({ onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

   const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const input = identifier.trim();
        const isDNI = /^\d{8}$/.test(input);
        const finalAuthEmail = isDNI ? `${input}@estudiante.ai` : input;

        // 1. INTENTO DE INICIO DE SESIÓN
        let { data, error: authError } = await supabase.auth.signInWithPassword({ 
            email: finalAuthEmail, 
            password 
        });

        // 2. LÓGICA DE AUTO-REGISTRO PARA ESTUDIANTES
        if (authError && authError.message === 'Invalid login credentials' && isDNI) {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: finalAuthEmail,
                password: password
            });

            if (signUpError) throw signUpError;
            
            data = signUpData;
            authError = null;
        } else if (authError) {
            throw authError;
        }

        // 3. PROCESAMIENTO DE SESIÓN EXITOSA
        if (data?.session) {
            const user = data.session.user;

            if (isDNI) {
                localStorage.setItem('dni_estudiante', input);

                if (password === input) {
                   localStorage.setItem('require_password_change', 'true');
                }

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
            } else {
                localStorage.removeItem('dni_estudiante');
                localStorage.removeItem('require_password_change');
                
                const { data: usuarioExistente } = await supabase
                    .from('usuarios')
                    .select('id_usuario')
                    .eq('correo_electronico', user.email)
                    .is('id_usuario', null)
                    .maybeSingle();

                if (usuarioExistente) {
                    await supabase
                        .from('usuarios')
                        .update({ id_usuario: user.id })
                        .eq('id_usuario', usuarioExistente.id);
                }
            }
            onLoginSuccess(data.session);
         }
      } catch (err) {
        setError(err.message === 'Invalid login credentials' ? 'DNI/Correo_electronico o contraseña incorrectos' : err.message);
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

                <div className="relative">
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full py-3 pl-11 pr-4 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
                        required 
                    />
                    <div className="absolute left-3 top-3.5 text-green-600">
                        <Lock size={18} />
                    </div>
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
                    className="w-full bg-red-600 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center transition-all shadow-lg active:scale-95"
                >
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