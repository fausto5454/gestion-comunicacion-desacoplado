import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { AlertTriangle, Loader } from 'lucide-react';

const LoginPage = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // 1. Intento de inicio de sesión
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            if (data?.session) {
                const user = data.session.user;

                // 2. Lógica de Vinculación Automática para Estudiantes
                // Buscamos en la tabla 'usuarios' si este correo ya existe pero no tiene id_usuario (UID)
                const { data: usuarioExistente } = await supabase
                    .from('usuarios')
                    .select('id, id_usuario')
                    .eq('correo', user.email) // Usamos el correo para vincular de forma precisa
                    .is('id_usuario', null)
                    .single();

                // 3. Si existe el registro previo del estudiante, insertamos su UID de Auth
                if (usuarioExistente) {
                    await supabase
                        .from('usuarios')
                        .update({ id_usuario: user.id })
                        .eq('id', usuarioExistente.id);
                    
                    console.log("Vínculo de estudiante establecido correctamente");
                }

                // 4. Continuar con el éxito del login
                onLoginSuccess(data.session);
            }
        } catch (err) {
            setError(err.message === 'Invalid login credentials' ? 'Credenciales inválidas' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-100 px-4">
            <div className="bg-[#86EFAC] p-8 shadow-2xl rounded-[40px] w-full max-w-sm border border-gray-400">
                <div className="flex justify-center mb-6">
                    <img 
                        src="logo.png" 
                        alt="Logo" 
                        className="w-22 h-20 object-contain" 
                        onError={(e) => e.target.src="https://placehold.co/80x80?text=IE"} 
                    />
                </div>
                <h2 className="text-3xl font-extrabold text-center text-green-700 mb-8">Bienvenido</h2>
                
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3 mb-6 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2" /> <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input 
                        type="email" 
                        placeholder="Correo" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="w-full py-3 px-4 rounded-xl bg-white text-gray-800" 
                    />
                    <input 
                        type="password" 
                        placeholder="Contraseña" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        className="w-full py-3 px-4 rounded-xl bg-white text-gray-800" 
                    />
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-red-600 hover:bg-green-600/80 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center transition-colors"
                    >
                        {loading ? <Loader className="animate-spin mr-2" /> : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;