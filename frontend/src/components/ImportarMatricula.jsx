import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabaseClient';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  UserPlus
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
        // Lógica para nombres SIN COMA (2 apellidos + nombres)
        const fullText = (item['Apellidos y Nombres'] || item.estudiantes || '').trim();
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
          anio_lectivo: 2026,
          estado_estudiante: 'Activo'
        };
      });

      setPreview(formattedData);
    };
    reader.readAsBinaryString(file);
  };

  const cancelarCarga = () => {
    setPreview([]);
    setFileName("");
    toast.error("Carga cancelada");
  };

  const subirADatabase = async () => {
    if (preview.length === 0) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('matriculas')
        .upsert(preview, { onConflict: 'dni_estudiante, anio_lectivo' });

      if (error) throw error;
      toast.success(`${preview.length} estudiantes registrados correctamente`);
      setPreview([]);
      setFileName("");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      {/* Encabezado Profesional */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <UserPlus className="text-emerald-500" size={36} />
            Matrícula Escolar 2026
          </h1>
          <p className="text-gray-500 mt-1">Gestión de carga masiva de estudiantes mediante Excel</p>
        </div>
      </div>

      {/* Zona de Carga */}
      {!preview.length ? (
        <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-12 text-center shadow-sm hover:shadow-md hover:border-emerald-400 transition-all group">
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-emerald-600" size={40} />
            </div>
            <span className="text-xl font-semibold text-green-700">Seleccionar Nómina Digital</span>
            <p className="text-gray-600 mt-2 max-w-xs mx-auto text-sm">
              Arrastra tu archivo .xlsx o haz clic para explorar. Asegúrate de incluir DNI, Apellidos y Nombres.
            </p>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card de Acciones de Vista Previa */}
          <div className="bg-emerald-600 rounded-xl p-6 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <FileSpreadsheet size={28} />
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-medium">Archivo listo para procesar</p>
                <h3 className="text-xl font-bold">{fileName}</h3>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={cancelarCarga}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-lg font-semibold transition-all border border-white/30"
              >
                <XCircle size={18} /> Cancelar
              </button>
              <button 
                onClick={subirADatabase}
                disabled={loading}
                className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? "Registrando..." : <><CheckCircle size={18} /> Confirmar Matrícula</>}
              </button>
            </div>
          </div>

          {/* Tabla de Vista Previa Estilizada */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-700">Estudiantes detectados: {preview.length}</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Vista Previa</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-3 text-left">DNI</th>
                    <th className="px-6 py-3 text-left">Apellidos y Nombres</th>
                    <th className="px-6 py-3 text-center">Grado / Sec</th>
                    <th className="px-6 py-3 text-center">Género</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-600">{row.dni_estudiante}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{row.apellido_paterno} {row.apellido_materno}</div>
                        <div className="text-xs text-gray-500 uppercase">{row.nombres}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {row.grado} "{row.seccion}"
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-gray-500">{row.genero}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Informativo */}
      <div className="mt-8 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="text-amber-500 shrink-0" size={20} />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Aviso de seguridad:</strong> El sistema utiliza un método de actualización inteligente (UPSERT). Si vuelves a subir un estudiante que ya existe con el mismo DNI para el año 2026, sus datos se actualizarán automáticamente sin crear duplicados.
        </p>
      </div>
    </div>
  );
};

export default ImportarMatricula;