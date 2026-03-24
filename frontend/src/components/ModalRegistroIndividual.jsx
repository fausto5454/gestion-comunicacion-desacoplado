import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';
import { toast } from 'sonner';
import { UserPlus, X } from 'lucide-react';

const ModalRegistroIndividual = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = useState({
    dni_estudiante: '',
    apellido_paterno: '',
    apellido_materno: '',
    nombres: '',
    genero: 'H',
    grado: '1°',
    seccion: 'A',
    anio_lectivo: 2026,
    estado_estudiante: 'Activo'
  });

  const [loading, setLoading] = useState(false);

  // Reutilizamos la lógica de limpieza
  const limpiarTexto = (texto) => (texto || '').normalize("NFC").toUpperCase().trim();
  const formatearEstado = (texto) => {
    const t = (texto || 'Activo').trim().toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('matriculas')
        .upsert({
          ...formData,
          apellido_paterno: limpiarTexto(formData.apellido_paterno),
          apellido_materno: limpiarTexto(formData.apellido_materno),
          nombres: limpiarTexto(formData.nombres),
          estado_estudiante: formatearEstado(formData.estado_estudiante),
          fecha_registro: new Date().toISOString()
        }, { onConflict: 'dni_estudiante, anio_lectivo' });

      if (error) throw error;

      toast.success('Estudiante registrado', {
        description: `${formData.nombres} ha sido incorporado correctamente.`
      });
      
      onRefresh(); // Para recargar la lista en el frontend
      onClose();   // Cerrar modal
    } catch (error) {
      toast.error('Error al registrar', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1c23] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Registro Individual 2026
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">DNI del Estudiante</label>
            <input 
              required
              type="text"
              maxLength={8}
              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none transition-all"
              value={formData.dni_estudiante}
              onChange={(e) => setFormData({...formData, dni_estudiante: e.target.value.replace(/[^0-9]/g, '')})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ap. Paterno</label>
              <input required type="text" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white uppercase"
                value={formData.apellido_paterno} onChange={(e) => setFormData({...formData, apellido_paterno: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ap. Materno</label>
              <input required type="text" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white uppercase"
                value={formData.apellido_materno} onChange={(e) => setFormData({...formData, apellido_materno: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Nombres Completos</label>
            <input required type="text" className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white uppercase"
              value={formData.nombres} onChange={(e) => setFormData({...formData, nombres: e.target.value})} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Grado</label>
              <select className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                value={formData.grado} onChange={(e) => setFormData({...formData, grado: e.target.value})}>
                <option value="1°">1°</option>
                <option value="2°">2°</option>
                <option value="3°">3°</option>
                <option value="4°">4°</option>
                <option value="5°">5°</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Sección</label>
              <select className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                value={formData.seccion} onChange={(e) => setFormData({...formData, seccion: e.target.value})}>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Género</label>
              <select className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-white"
                value={formData.genero} onChange={(e) => setFormData({...formData, genero: e.target.value})}>
                <option value="H">Masc</option>
                <option value="M">Fem</option>
              </select>
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-all mt-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            {loading ? 'Procesando...' : 'Registrar Estudiante'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ModalRegistroIndividual;