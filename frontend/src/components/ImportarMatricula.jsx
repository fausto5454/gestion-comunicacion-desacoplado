import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabaseClient';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle,
  LogOut, 
  AlertCircle,
  User,
  UserPlus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import ModalTrasladado from './ModalTrasladado';

// --- FUNCIONES DE NORMALIZACIÓN (Relación exacta con Excel) ---
const limpiarTexto = (t) => (t || '').normalize("NFC").toUpperCase().trim();
const formatearEstado = (t) => {
  const s = (t || 'Activo').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// --- COMPONENTE MODAL ---
const ModalRegistroIndividual = ({ isOpen, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    dni_estudiante: '', apellido_paterno: '', apellido_materno: '',
    nombres: '', genero: 'H', grado: '1°', seccion: 'A',
    anio_lectivo: 2026, estado_estudiante: 'Activo'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('matriculas').upsert({
        ...formData,
        apellido_paterno: limpiarTexto(formData.apellido_paterno),
        apellido_materno: limpiarTexto(formData.apellido_materno),
        nombres: limpiarTexto(formData.nombres),
        estado_estudiante: formatearEstado(formData.estado_estudiante),
        fecha_registro: new Date().toISOString()
      }, { onConflict: 'dni_estudiante, anio_lectivo' });

      if (error) throw error;
      toast.success('Estudiante registrado correctamente');
      onRefresh(); 
      onClose();
      setFormData({ dni_estudiante: '', apellido_paterno: '', apellido_materno: '', nombres: '', genero: 'H', grado: '1°', seccion: 'A', anio_lectivo: 2026, estado_estudiante: 'Activo' });
    } catch (err) {
      toast.error('Error', { description: err.message });
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden border border-white/20 animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
          <div className="flex items-center gap-2"><UserPlus size={26} className="text-orange-500" /><h3 className="font-bold">Registro Individual</h3></div>
          <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <input required placeholder="DNI" className="w-full p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm font-mono" value={formData.dni_estudiante} onChange={e => setFormData({...formData, dni_estudiante: e.target.value.replace(/[^0-9]/g, '')})} maxLength={8} />
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Ap. Paterno" className="w-full p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm uppercase" value={formData.apellido_paterno} onChange={e => setFormData({...formData, apellido_paterno: e.target.value})} />
            <input required placeholder="Ap. Materno" className="w-full p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm uppercase" value={formData.apellido_materno} onChange={e => setFormData({...formData, apellido_materno: e.target.value})} />
          </div>
          <input required placeholder="Nombres" className="w-full p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm uppercase" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
          <div className="grid grid-cols-3 gap-3">
            <select className="p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm font-bold" value={formData.grado} onChange={e => setFormData({...formData, grado: e.target.value})}><option value="1°">1°</option><option value="2°">2°</option><option value="3°">3°</option><option value="4°">4°</option><option value="5°">5°</option></select>
            <select className="p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm font-bold" value={formData.seccion} onChange={e => setFormData({...formData, seccion: e.target.value})}><option value="A">A</option><option value="B">B</option><option value="C">C</option></select>
            <select className="p-3 bg-gray-50 border border-orange-300 rounded-xl text-sm font-bold" value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}><option value="H">Hombre</option><option value="M">Mujer</option></select>
          </div>
          <button disabled={loading} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20">{loading ? "GUARDANDO..." : "GUARDAR ESTUDIANTE"}</button>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const ImportarMatricula = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState("");
  
  // ESTADOS SEPARADOS PARA MODALES
  const [isModalBajaOpen, setIsModalBajaOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id_usuario', user.id)
          .single();
        setUserRole(data?.rol);
      }
    };
    getProfile();
  }, []);

  const cargarDatos = () => {
    console.log("Refrescando lista de estudiantes...");
  };

  // Definición de stats dentro del componente para evitar el ReferenceError
  const stats = {
    total: preview.length,
    activos: preview.filter(s => s.estado_estudiante === 'Activo').length
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const formattedData = data.map(item => {
        const fullText = (item['nombre_completo'] || item['Apellidos y Nombres'] || '').trim();
        let apP = '', apM = '', nom = '';
        if (fullText.length > 0) {
          const p = fullText.split(/\s+/);
          if (p.length >= 3) { apP = p[0]; apM = p[1]; nom = p.slice(2).join(' '); }
          else { apP = p[0]; nom = p[1] || ''; }
        }

        const dniLimpio = String(item.DNI || '').trim().replace(/[^0-9]/g, '');
        return {
          dni_estudiante: dniLimpio.substring(0, 8),
          apellido_paterno: limpiarTexto(apP),
          apellido_materno: limpiarTexto(apM),
          nombres: limpiarTexto(nom),
          genero: String(item.genero || 'H').toUpperCase().charAt(0),
          grado: String(item.grado || '').includes('°') ? item.grado : `${item.grado}°`,
          seccion: limpiarTexto(item.seccion || 'A'),
          anio_lectivo: parseInt(item.anio_lectivo) || 2026,
          estado_estudiante: formatearEstado(item.estado_estudiante),
          fecha_registro: new Date().toISOString()
        };
      });
      setPreview(formattedData);
    };
    reader.readAsBinaryString(file);
  };

  const subirADatabase = async () => {
    if (preview.length === 0) {
      toast.warning('No hay datos para procesar');
      return;
    }
    setLoading(true);
    try {
      // Intento de inserción masiva con resolución de conflictos por DNI y Año
      const { error } = await supabase
        .from('matriculas')
        .upsert(preview, { 
          onConflict: 'dni_estudiante, anio_lectivo',
          ignoreDuplicates: false // Permite actualizar si el estudiante ya existe
        });
      if (error) throw error;
      toast.success('Matrícula Sincronizada', { 
        description: `Se han procesado ${preview.length} registros exitosamente.` 
      });

      setPreview([]); 
      setFileName("");
      
      if (typeof cargarDatos === 'function') {
        await cargarDatos();
      }

    } catch (err) {
      console.error("Error en Sync:", err);
      toast.error('Error de Sincronización', { 
        description: err.message || 'Error inesperado al conectar con Supabase' 
      });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex flex-col w-full p-8 pt-4 gap-2 overflow-x-hidden">
      <div className="w-full flex flex-col items-start -space-y-1">
       <div className="flex items-center gap-2 text-indigo-700">
        <UserPlus className="w-7 h-7 text-orange-500" />
         <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-slate-800">
          MATRÍCULA 2026
         </h1>
        </div>
       <p className="text-[11px] md:text-xs font-bold text-green-600 uppercase pl-7">
       I.E. № 2079 Antonio Raimondi
      </p>
      </div>
       <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full justify-end px-6 sm:px-0">
       {userRole !== 3 && (
        <>
      <button
        onClick={() => {
          console.log("Abriendo Modal de Baja...");
            setIsModalBajaOpen(true);
             }} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-400 transition-colors text-white rounded-xl font-bold shadow-lg order-2 sm:order-1">
               <LogOut size={20} className="rotate-180" />
                Registrar Baja
                </button>
              <div className="relative z-[9999]">
             <ModalTrasladado 
            isOpen={isModalBajaOpen} 
            onClose={() => setIsModalBajaOpen(false)} 
            onUpdate={cargarDatos}/>
             </div> 
             <button onClick={() => setIsModalOpen(true)}  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-600 transition-colors text-white rounded-xl font-bold shadow-lg order-1 sm:order-2">
             <UserPlus size={20} className="text-emerald-400"/> Registro Manual
             </button>
           </>
         )}
       </div>
      {!preview.length ? (
        <div className="bg-white border-2 border-dashed border-emerald-300 rounded-[2.5rem] p-16 text-center hover:border-emerald-500 transition-all group">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="upload" />
          <label htmlFor="upload" className="cursor-pointer block">
            <Upload className="mx-auto text-emerald-500 mb-4 group-hover:scale-110 transition-transform" size={48} />
            <span className="text-2xl font-black text-slate-700 block">Carga Masiva Excel</span>
            <p className="text-green-600 mt-2 font-medium">Sube el archivo de matrícula para registrar</p>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-2xl"><FileSpreadsheet size={24}/></div>
              <div>
                <h3 className="font-bold text-lg">{fileName}</h3>
                <div className="flex gap-2 mt-1">
                   <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30 font-bold">TOTAL: {stats.total}</span>
                   <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md border border-blue-500/30 font-bold">ACTIVOS: {stats.activos}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreview([])} className="px-6 py-2.5 rounded-xl font-bold bg-slate-700 hover:bg-slate-600 transition-all">Cancelar</button>
              <button onClick={subirADatabase} disabled={loading} className="px-8 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 flex items-center gap-2">
                {loading ? "REGISTRANDO..." : <><CheckCircle size={18}/> REGISTRAR</>}
              </button>
            </div>
          </div>
          
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
             <table className="w-full text-left">
               <thead className="bg-gray-50/50 border-b border-gray-100">
                 <tr>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">DNI</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estudiante</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Grado / Sec</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {preview.map((row, i) => (
                   <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                     <td className="px-8 py-5 font-mono text-sm text-gray-500">{row.dni_estudiante}</td>
                     <td className="px-8 py-5">
                       <div className="font-bold text-slate-800 tracking-tight">{row.apellido_paterno} {row.apellido_materno}</div>
                       <div className="text-[10px] text-gray-400 font-bold uppercase">{row.nombres}</div>
                     </td>
                     <td className="px-8 py-5 text-center"><span className="text-xs font-black bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">{row.grado} "{row.seccion}"</span></td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      <ModalRegistroIndividual isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={() => {}} />
      
      <div className="mt-8 p-5 bg-blue-50/50 border border-blue-100 rounded-3xl flex gap-4 items-start">
        <AlertCircle className="text-blue-500 shrink-0" size={22} />
        <p className="text-xs text-blue-800 leading-relaxed font-medium">
          <strong>Validación de Integridad:</strong> El sistema normaliza automáticamente los textos (Mayúsculas y NFC) y garantiza que el <strong>estado_estudiante</strong> cumpla con las restricciones de la base de datos de Supabase.
        </p>
      </div>
    </div>
  );
};

export default ImportarMatricula;