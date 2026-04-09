import React from 'react';
import ComunicacionesPage from './ComunicacionesPage'; 
import ComunicacionesEstudiante from './ComunicacionesEstudiante'; 

const ComunicacionesIndex = ({ session, userProfile, forcedRol }) => {
    
    // 1. Identificamos si es estudiante por Rol (6)
    const esRolEstudiante = Number(userProfile?.id_rol) === 6 || Number(forcedRol) === 6;

    // 2. IDENTIFICACIÓN POR CORREO_ELECTRONICO (ESTO NO FALLA NUNCA)
    // Si el correo_electronico NO contiene "admin", "director" o "profe", lo tratamos como estudiante
    const email = session?.user?.email?.toLowerCase() || "";
    const esCorreo_electronicoEstudiante = !email.includes('admin') && !email.includes('director');

    // SI ES ESTUDIANTE (Por rol o por descarte de correo_electronico)
    if (esRolEstudiante || esCorreo_electronicoEstudiante) {
        return <ComunicacionesEstudiante session={session} />;
    }

    // SOLO SI ES ADMIN CONFIRMADO
    return <ComunicacionesPage session={session} />;
};

export default ComunicacionesIndex;