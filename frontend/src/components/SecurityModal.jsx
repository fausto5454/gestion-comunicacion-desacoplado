import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { Lock, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

const SecurityModal = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Verificamos si la cuenta requiere cambio de clave por seguridad
    const needsChange = localStorage.getItem('require_password_change') === 'true';

    // Si no lo requiere, no renderizamos nada
    if (!needsChange) return null;

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        // Validaciones básicas de seguridad
        if (newPassword.length < 8) {
            return alert("Por seguridad, la nueva clave debe tener al menos 8 caracteres.");
        }
        if (newPassword !== confirmPassword) {
            return alert("Las contraseñas no coinciden.");
        }
        
        setLoading(true);

        // Actualizamos la clave en Supabase Authentication
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            alert("Error al actualizar la clave: " + error.message);
        } else {
            // Limpiamos la marca de seguridad para desbloquear la sesión
            localStorage.removeItem('require_password_change');
            
            // Recargamos para que el alumno entre al dashboard con su panel bloqueado
            window.location.reload(); 
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-800 backdrop-blur-sm px-4">
            
            {/* ✅ 2. CAMBIO: Cuadro de diálogo con tamaño reducido (max-w-sm) y espaciado optimizado (p-6) */}
            <div className="bg-white p-4 rounded-[40px] w-full max-w-[380px] shadow-2xl border-t-[10px] border-emerald-500 overflow-hidden outline-none ring-0 transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center mb-5">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-3">
                        <ShieldCheck size={36} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-xl font-black text-emerald-800 text-center tracking-tight">
                        SEGURIDAD DE CUENTA
                    </h2>
                    <div className="h-1 w-16 bg-emerald-500 rounded-full mt-1.5"></div>
                </div>

                <p className="text-center text-gray-600 text-xs leading-relaxed mb-6">
                    Detectamos que estás usando una <strong>clave genérica</strong> (DNI). Para proteger tus datos académicos, es obligatorio crear una nueva contraseña personal.
                </p>

                <form onSubmit={handleUpdate} className="space-y-4">
                    {/* Campo Nueva Clave */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Nueva Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Mínimo 8 caracteres"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full py-3 px-11 rounded-xl bg-gray-50 border-2 border-green-200 focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm"
                                required
                               />
                             <Lock className="absolute left-3 top-3.5 text-emerald-500" size={18} />
                             <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3.5 text-gray-400 hover:text-emerald-500 transition-colors"
                                 >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                             </button>
                        </div>
                    </div>

                    {/* Campo Confirmar Clave */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 ml-2 uppercase">Confirmar Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Repite tu contraseña"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full py-3 px-11 rounded-xl bg-gray-50 border-2 border-green-200 focus:border-emerald-500 focus:bg-white outline-none transition-all text-sm"
                                required
                            />
                            <ShieldCheck className="absolute left-3 top-3.5 text-emerald-500" size={18} />
                        </div>
                    </div>

                    {/* Botón de Acción Profesional */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-[0_8px_15px_rgba(16,185,129,0.25)] hover:shadow-none transform active:scale-95 transition-all flex justify-center items-center gap-2 uppercase tracking-widest text-xs"
                    >
                        {loading ? 'Sincronizando...' : 'Actualizar y Acceder'}
                    </button>
                </form>

                {/* Pie de Nota Discreto */}
                <div className="mt-5 flex items-center justify-center gap-1.5 text-[9px] text-gray-400 font-medium">
                    <AlertCircle size={12} />
                    <span>Esta acción de seguridad es obligatoria una sola vez.</span>
                </div>
            </div>
        </div>
    );
};

export default SecurityModal;