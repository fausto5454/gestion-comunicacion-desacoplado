import React from 'react';

const ComunicacionesEstudiante = () => {
    return (
        <div className="p-8">
            <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-lg mb-6">
                <h1 className="text-2xl font-black uppercase">Bandeja de Entrada</h1>
                <p className="text-[10px] font-bold opacity-70">VISTA DE ESTUDIANTE CONFIRMADA</p>
            </div>
            <div className="bg-white border-4 border-dashed border-gray-100 rounded-[3rem] p-20 text-center">
                <p className="text-gray-400 font-bold uppercase text-xs">No hay mensajes nuevos por el momento.</p>
            </div>
        </div>
    );
};

export default ComunicacionesEstudiante;