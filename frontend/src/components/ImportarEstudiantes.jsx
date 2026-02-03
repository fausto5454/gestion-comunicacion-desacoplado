import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabaseClient';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ImportarEstudiantes = ({ grado, seccion, onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    setLoading(true);

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Mapeo de datos para que coincidan con tu tabla Supabase
        const registrosParaSubir = data.map(fila => ({
          dni_estudiante: fila.DNI?.toString(),
          apellido_paterno: fila.ApellidoPaterno?.toUpperCase(),
          apellido_materno: fila.ApellidoMaterno?.toUpperCase(),
          nombres: fila.Nombres?.toUpperCase(),
          grado: parseInt(grado), // Usamos el grado seleccionado en la App
          seccion: seccion,       // Usamos la sección seleccionada en la App
          anio_lectivo: 2026,
          estado_estudiante: 'Activo'
        }));

        if (registrosParaSubir.length === 0) throw new Error("El archivo está vacío");

        const { error } = await supabase
          .from('matriculas')
          .insert(registrosParaSubir);

        if (error) throw error;

        toast.success(`${registrosParaSubir.length} estudiantes cargados con éxito`);
        if (onComplete) onComplete(); // Recarga la lista principal
      } catch (err) {
        console.error(err);
        toast.error("Error al procesar el Excel. Verifica las columnas.");
      } finally {
        setLoading(false);
        e.target.value = null; // Limpiar input
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="mb-6 p-6 border-2 border-dashed border-green-200 rounded-[2rem] bg-green-50/30">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
          {loading ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
        </div>
        
        <h3 className="text-sm font-black text-gray-800 uppercase mb-1">Carga Masiva de Estudiantes</h3>
        <p className="text-xs text-gray-500 mb-4 font-medium">
          Selecciona un archivo .xlsx con columnas: <br/>
          <span className="font-bold text-green-700">DNI, ApellidoPaterno, ApellidoMaterno, Nombres</span>
        </p>

        <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-green-200 active:scale-95">
          <FileSpreadsheet size={16} />
          {loading ? 'PROCESANDO...' : 'SELECCIONAR EXCEL'}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} disabled={loading} />
        </label>
      </div>
    </div>
  );
};

export default ImportarEstudiantes;