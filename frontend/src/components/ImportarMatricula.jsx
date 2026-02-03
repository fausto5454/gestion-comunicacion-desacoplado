import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from './config/supabaseClient'; // Ajusta la ruta a tu cliente
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ImportarMatricula = () => {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Mapeo de columnas del Excel a nombres de la DB
      const formattedData = data.map(item => ({
        dni_estudiante: String(item.DNI || item.dni),
        apellido_paterno: item['Apellido Paterno']?.toUpperCase(),
        apellido_materno: item['Apellido Materno']?.toUpperCase(),
        nombres: item.Nombres?.toUpperCase(),
        grado: item.Grado,
        seccion: item.Seccion || item.Sección,
        anio_lectivo: 2026,
        estado_estudiante: 'Activo'
      }));

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
      toast.success(`${preview.length} estudiantes matriculados con éxito`);
      setPreview([]);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar los datos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="text-green-600" /> Carga Masiva 2026
        </h2>
      </div>

      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-green-400 transition-colors">
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileUpload}
          className="hidden" 
          id="excel-upload"
        />
        <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600">Haz clic para subir tu Excel de Matrícula</span>
          <span className="text-xs text-gray-400 mt-1">Formatos aceptados: .xlsx, .xls</span>
        </label>
      </div>

      {preview.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-gray-500">Vista previa: {preview.length} alumnos</span>
            <button 
              onClick={subirADatabase}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : <><CheckCircle size={18}/> Confirmar Matrícula</>}
            </button>
          </div>
          
          <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2">DNI</th>
                  <th className="px-4 py-2">Estudiante</th>
                  <th className="px-4 py-2">Grado/Sec</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{row.dni_estudiante}</td>
                    <td className="px-4 py-2">{row.apellido_paterno} {row.nombres}</td>
                    <td className="px-4 py-2">{row.grado}° "{row.seccion}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && <p className="text-center p-2 text-xs text-gray-400">Y {preview.length - 10} alumnos más...</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportarMatricula;