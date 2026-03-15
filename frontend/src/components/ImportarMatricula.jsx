import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabaseClient';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  UserPlus,
  Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ImportarMatricula = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState("");

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
        // Lógica para nombres basada en tu formato (Apellido Paterno, Materno y Nombres)
        const fullText = (item['Apellidos y Nombres'] || '').trim();
        let apPaterno = '', apMaterno = '', nombres = '';

        if (fullText.length > 0) {
          const partes = fullText.split(/\s+/);
          if (partes.length >= 3) {
            apPaterno = partes[0];
            apMaterno = partes[1];
            nombres = partes.slice(2).join(' ');
          } else {
            apPaterno = partes[0];
            nombres = partes[1] || '';
          }
        }

        return {
          dni_estudiante: String(item.DNI || '').trim(),
          apellido_paterno: apPaterno.toUpperCase(),
          apellido_materno: apMaterno.toUpperCase(),
          nombres: nombres.toUpperCase(),
          genero: String(item.genero || 'H').toUpperCase().charAt(0),
          grado: String(item.Grado || '').includes('°') ? item.Grado : `${item.Grado}°`,
          seccion: String(item.Sección || item.Seccion || 'A').toUpperCase().trim(),
          anio_lectivo: parseInt(item.anio_lectivo) || 2026,
          estado_estudiante: String(item.estado_estudiante || 'Activo').trim()
        };
      });

      setPreview(formattedData);
    };
    reader.readAsBinaryString(file);
  };

  const subirADatabase = async () => {
    if (preview.length === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('matriculas')
        .upsert(preview, { onConflict: 'dni_estudiante, anio_lectivo' });

      if (error) throw error;
      toast.success(`${preview.length} registros procesados con éxito`);
      setPreview([]);
      setFileName("");
    } catch (error) {
      toast.error("Error en base de datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para colores de estados inspirada en tu escudo institucional
  const getEstadoEstilo = (estado) => {
    switch (estado) {
      case 'Activo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Retirado': return 'bg-red-100 text-red-700 border-red-200';
      case 'Trasladado': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Ingresante': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Cálculo de resumen rápido
  const stats = {
    total: preview.length,
    activos: preview.filter(s => s.estado_estudiante === 'Activo').length,
    otros: preview.filter(s => s.estado_estudiante !== 'Activo').length
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <UserPlus className="text-emerald-600" size={36} />
            Matrícula Antonio Raimondi 2026
          </h1>
          <p className="text-gray-500 mt-1">Carga masiva desde Excel con validación de estado</p>
        </div>
      </div>

      {!preview.length ? (
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-emerald-500 transition-all cursor-pointer">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="upload" />
          <label htmlFor="upload" className="cursor-pointer">
            <Upload className="mx-auto text-emerald-500 mb-4" size={48} />
            <span className="text-lg font-bold text-gray-700">Subir archivo Excel</span>
            <p className="text-sm text-gray-400 mt-2">DNI, Apellidos y Nombres, Grado, Sección, Estado...</p>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Barra de Acciones y Resumen */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-xl"><FileSpreadsheet size={24}/></div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{fileName}</h3>
                <div className="flex gap-3 mt-1">
                   <span className="text-xs font-medium px-2 py-0.5 bg-emerald-500/20 rounded-md text-emerald-300 border border-emerald-500/30">Total: {stats.total}</span>
                   <span className="text-xs font-medium px-2 py-0.5 bg-blue-500/20 rounded-md text-blue-300 border border-blue-500/30">Activos: {stats.activos}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => setPreview([])} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold bg-blue-800 hover:bg-blue-400 transition-all border border-white/10">
                Cancelar
              </button>
              <button 
                onClick={subirADatabase} 
                disabled={loading}
                className="flex-1 md:flex-none px-8 py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? "Procesando..." : <><CheckCircle size={18}/> Procesar Matrícula</>}
              </button>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">DNI</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">Estudiante</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-center">Grado / Sec</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-500">{row.dni_estudiante}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{row.apellido_paterno} {row.apellido_materno}</div>
                        <div className="text-[10px] text-gray-400 tracking-wider">{row.nombres}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {row.grado} "{row.seccion}"
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getEstadoEstilo(row.estado_estudiante)}`}>
                          {row.estado_estudiante}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 items-start">
        <AlertCircle className="text-blue-500 shrink-0" size={20} />
        <p className="text-xs text-blue-700 leading-relaxed">
          <strong>Regla de Negocio:</strong> El sistema utiliza el DNI y el Año Lectivo como llave única. Si un estudiante ya existe, se actualizarán sus datos y su <strong>estado_estudiante</strong> automáticamente sin duplicar la fila.
        </p>
      </div>
    </div>
  );
};

export default ImportarMatricula;