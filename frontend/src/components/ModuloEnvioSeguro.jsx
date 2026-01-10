import React from 'react';
import { ShieldAlert } from 'lucide-react';

const ModuloEnvioSeguro = ({ rol_id, children }) => {
    // Si el rol es 6 (Estudiante), bloqueamos el acceso
    const esEstudiante = Number(rol_id) === 6;

    if (esEstudiante) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100">
                    <ShieldAlert className="text-amber-500" size={48} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Acceso No Autorizado</h2>
                <p className="text-gray-500 max-w-sm leading-relaxed font-medium">
                    Tu cuenta de **Estudiante** solo permite recibir comunicados. 
                    No tienes permisos para realizar envíos de documentos o mensajes.
                </p>
                <div className="mt-8 px-6 py-2 bg-gray-50 rounded-full text-[11px] font-bold text-gray-400 uppercase tracking-widest border border-gray-100">
                    Consulte con Secretaría si requiere enviar un documento
                </div>
            </div>
        );
    }

    // Si NO es estudiante (Admin, Docente, etc.), renderiza el formulario normal
    return <>{children}</>;
};

export default ModuloEnvioSeguro;