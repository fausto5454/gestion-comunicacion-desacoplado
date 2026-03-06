import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { AlertTriangle, Loader, User, Mail, Lock } from 'lucide-react';

const LoginPage = ({ onLoginSuccess }) => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const input = identifier.trim();
            const isDNI = /^\d{8}$/.test(input);
            const finalAuthEmail = isDNI ? `${input}@estudiante.ai` : input;

            const { data, error: authError } = await supabase.auth.signInWithPassword({ 
                email: finalAuthEmail, 
                password 
            });

            if (authError) throw authError;

            if (data?.session) {
                const user = data.session.user;

                // Lógica de vinculación (Mantiene tu estructura original)
                if (isDNI) {
                    const { data: matricula } = await supabase
                        .from('matriculas')
                        .select('id_matricula, id_usuario')
                        .eq('dni_estudiante', input)
                        .single();

                    if (matricula && !matricula.id_usuario) {
                        await supabase.from('matriculas').update({ id_usuario: user.id }).eq('id_matricula', matricula.id_matricula);
                    }
                } else {
                    const { data: usuarioExistente } = await supabase
                        .from('usuarios').select('id, id_usuario').eq('correo', user.email).is('id_usuario', null).single();

                    if (usuarioExistente) {
                        await supabase.from('usuarios').update({ id_usuario: user.id }).eq('id', usuarioExistente.id);
                    }
                }
                onLoginSuccess(data.session);
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials' ? 'DNI/Correo o contraseña incorrectos' : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!identifier.includes('@')) {
            alert("Por favor, ingresa tu correo electrónico para enviarte un enlace de recuperación.");
            return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(identifier);
        if (error) alert(error.message);
        else alert("Se ha enviado un correo de recuperación.");
    };

    return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-[#86EFAC] p-8 shadow-2xl rounded-[40px] w-full max-w-sm border border-gray-400">
            {/* Logo y Título */}
            <div className="flex justify-center mb-4">
                <img src="logo.png" alt="Logo" className="w-22 h-20 object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold text-center text-green-700 mb-6 italic">Bienvenido</h2>
            
            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Identificador */}
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Correo o DNI" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        className="w-full py-3 pl-11 pr-4 rounded-xl bg-white text-gray-800 outline-none focus:ring-2 focus:ring-green-500 transition-all shadow-sm" 
                        required 
                    />
                    <div className="absolute left-3 top-3.5 text-green-600">
                        {/^\d+$/.test(identifier) ? <User size={18} /> : <Mail size={18} />}
                    </div>
                </div>

                {/* Input Password */}
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

                {/* Olvido Contraseña */}
                <div className="text-right">
                    <button 
                        type="button" 
                        onClick={handleForgotPassword}
                        className="text-[12px] text-blue-700 hover:underline font-bold opacity-80"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>

                {/* Botón Principal */}
                <button 
                    type="submit" 
                    disabled={loading} 
                    className="w-full bg-red-600 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center transition-all shadow-lg active:scale-95"
                >
                    {loading ? <Loader className="animate-spin mr-2" /> : 'Iniciar Sesión'}
                </button>

                {/* NOTA PARA ESTUDIANTES (La recomendación solicitada) */}
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