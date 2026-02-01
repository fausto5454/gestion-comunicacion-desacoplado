import { supabase } from '../config/supabaseClient';

export const registrarAuditoria = async (accion, descripcion, modulo = 'General', duracion = 0) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('auditoria').insert([
            {
                usuario_responsable: user?.email || 'sistema',
                accion,
                descripcion,
                modulo, // Nuevo campo
                duracion_ms: duracion, // Nuevo campo para rendimiento
                fecha_hora: new Date().toISOString(),
            },
        ]);
        if (error) throw error;
    } catch (error) {
        console.error("Fallo registro auditoría:", error.message);
    }
};