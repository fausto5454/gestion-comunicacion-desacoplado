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
   const selectStr = "id_comunicacion, titulo, mensaje, remitente_id, fecha_envio, estado, prioridad";

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

  const resumen = agruparPorUsuario(datosListos);
  
  setStats({
    total: data.length,
    enviados: data.length,
    recibidos: 0, 
    leidos: data.filter(m => String(m.estado).toLowerCase().includes("leíd")).length,
    noLeidos: data.filter(m => !String(m.estado).toLowerCase().includes("leíd")).length,
    ...resumen
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

  const noHayDatos = stats.total === 0;
  const data = {
     labels: noHayDatos ? ['Sin datos'] : ['Leídos', 'Pendientes'],
     datasets: [{
     data: noHayDatos ? [1] : [stats.leidos, stats.noLeidos],
     backgroundColor: noHayDatos ? ['#e2e8f0'] : ['#22c55e', '#ef4444'], // Gris si está vacío
     borderWidth: 0,
     cutout: '75%',
   }],
  };

 return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabecera */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart2 className="text-green-600 w-8 h-8" />
            Reportes del Sistema
          </h1>
          <p className="text-gray-500 mt-1">
            Visualiza y exporta el rendimiento de las {stats.total} comunicaciones encontradas.
          </p>
        </header>
        {/* Filtros */}
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
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPIs superiores */}
            <KPIsReportes stats={stats} />
            {/* Grid Principal: Balance de visualización */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
              {/* Sección del Gráfico: Altura controlada y fondo claro profesional */}
              <div className="lg:col-span-1 bg-emerald-100 rounded-3xl shadow-lg flex flex-col h-[400px] border border-emerald-200">
                <div className="p-4 border-b border-emerald-200/50 flex items-center justify-center h-[55px]">
                  <h3 className="text-[14px] font-bold text-emerald-900 uppercase text-center">
                    Estado de Lectura
                  </h3>
                </div>
                <div className="flex-grow flex items-center justify-center p-4 relative">
                  {stats.total === 0 ? (
                    <div className="text-center">
                      <p className="text-emerald-600 font-medium text-sm italic">Sin datos registrados</p>
                    </div>
                  ) : (
                    <GraficosReportes stats={stats} />
                  )}
                </div>
              </div>
              {/* Sección de la Tabla: Simetría perfecta con el gráfico */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[400px] overflow-hidden">
                  <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center h-[55px]">
                    <h3 className="text-sm font-bold text-gray-700 uppercase">Detalle de Mensajes</h3>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-md font-black uppercase">
                      {datosTabla.length} Mensajes
                    </span>
                  </div>
                  <div className="overflow-y-auto flex-grow custom-scrollbar">
                    {datosTabla.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                        <p className="text-sm italic">No se encontraron resultados para los filtros aplicados</p>
                      </div>
                    ) : (
                      <TablaReportes datosTabla={datosTabla} />
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Herramientas de Exportación */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-t-4 border-t-green-500">
              <h3 className="text-sm font-bold mb-4 text-gray-700 uppercase tracking-wider text-center">
                Descargar Reportes Oficiales
              </h3>
              <ExportarReportes data={datosTabla} stats={stats} />
            </div>
          </div>
         )}
      </div>
    </div>
  );
};

export default ReportesPage;