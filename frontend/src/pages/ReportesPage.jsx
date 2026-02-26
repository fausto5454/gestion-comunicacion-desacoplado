import { useEffect, useState, useCallback } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { supabase } from "../config/supabaseClient";

import FiltrosReportes from "../components/reportes/FiltrosReportes";
import KPIsReportes from "../components/reportes/KPIsReportes";
import GraficosReportes from "../components/reportes/GraficosReportes";
import ExportarReportes from "../components/reportes/ExportarReportes";
import TablaReportes from "../components/reportes/TablaReportes";
import { agruparPorUsuario } from "../utils/reportesUtils";

const ReportesPage = () => {
  const [loading, setLoading] = useState(true);
  const [datosTabla, setDatosTabla] = useState([]); // ✅ Inicializado como array
  const [stats, setStats] = useState({
    total: 0, enviados: 0, recibidos: 0, leidos: 0, noLeidos: 0,
  });

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("todos");

  const fetchReportes = useCallback(async () => {
  setLoading(true);
  try {
    // Definimos la cadena de selección en una sola línea, sin espacios ni comentarios
    // Corregido: dni_estudiante en minúsculas
    const selectStr = "id_comunicacion,titulo,mensaje,estado,prioridad,fecha_envio,remitente_id,matricula_id,remitente:usuarios!fk_remitente(nombre_completo),destinatario:matriculas!fk_destinatario_alumno(dni_estudiante,id_usuario,estudiante:usuarios!id_usuario(nombre_completo))";

    const { data, error } = await supabase
      .from("comunicaciones")
      .select(selectStr);

    if (error) {
      // Si el error persiste, verifica si en la tabla 'matriculas' la columna es 'dni_estudiante'
      console.error("Detalle del error:", error);
      throw error;
    }

   if (data) {
   const datosListos = data.map(reg => ({
    ...reg,
    nombre_emisor: reg.remitente?.nombre_completo || 'Sistema',
    nombre_receptor: reg.destinatario?.estudiante?.nombre_completo 
                     || `DNI: ${reg.destinatario?.DNI_estudiante || 'N/A'}`
  }));

  // IMPORTANTÍSIMO: Usa el mismo nombre de la variable definida arriba
  setDatosTabla(datosListos); 
  
  // Esto hará que tus contadores dejen de estar en 0
  setStats({
    total: data.length,
    enviados: data.length,
    recibidos: data.length,
    leidos: data.filter(m => m.estado?.toLowerCase() === "leído").length,
    noLeidos: data.filter(m => m.estado?.toLowerCase() !== "leído").length,
  });
  }
  } catch (error) {
    console.error("❌ Error en Reportes:", error.message);
  } finally {
    setLoading(false);
  }
  }, [supabase]);
  
  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

   return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart2 className="text-green-600 w-8 h-8" />
            Reportes del Sistema
          </h1>
          <p className="text-gray-500 mt-1">
            Visualiza y exporta el rendimiento de las {stats.total} comunicaciones encontradas.
          </p>
        </header>
        <FiltrosReportes
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          estado={estado}
          setFechaInicio={setFechaInicio}
          setFechaFin={setFechaFin}
          setEstado={setEstado}
          onAplicar={fetchReportes}
        />
       {loading ? (
       <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-2" />
         <p className="text-gray-500 font-medium">Consultando base de datos...</p>
          </div>
           ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
            {/* Indicadores de rendimiento con datos reales de Supabase */}
            <KPIsReportes stats={stats} />
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Sección del Gráfico */}
       <div className="flex flex-col"> 
      {/* Eliminamos el div con bg-white extra para evitar la 'doble tarjeta' */}
    <GraficosReportes stats={stats} />
   </div>
  {/* Sección de la Tabla */}
  <div className="lg:col-span-2 flex flex-col">
    <TablaReportes datosTabla={datosTabla} />
     </div>
        </div>
            {/* Sección de exportación activada correctamente */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Herramientas de Exportación</h3>
              {/* Se activa ExportarReportes con los datos para PDF/Excel */}
              <ExportarReportes data={datosTabla} stats={stats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;