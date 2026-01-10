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
    // 1. Corregimos el error de la consola usando !remitente_id
    // Esto le dice a Supabase qué relación exacta usar
    let query = supabase
      .from("comunicaciones")
      .select(`
      estado, 
      fecha_envio, 
      remitente_id, 
      destinatario_id,
      remitente:usuarios!comunicaciones_remitente_id_fkey(nombre_completo),
      destinatario:usuarios!comunicaciones_destinatario_id_fkey(nombre_completo)
   `);

    if (estado !== "todos" && estado !== "") {
      query = query.eq("estado", estado);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
  // 1. Usamos tu función agruparPorUsuario ya integrada
  // Esta función ahora devuelve el Array de objetos gracias al Object.values
  const datosAgrupados = agruparPorUsuario(data);
  setDatosTabla(datosAgrupados);

  // 2. Cálculo de KPIs con tildes exactas: "leído" y "no leído"
  const total = data.length; // Los 27 registros

  // Contamos estrictamente lo que hay en la DB
  const leidosCount = data.filter(m => 
    m.estado?.toLowerCase().trim() === "leído"
  ).length;

  setStats({
    total: total,
    enviados: total, // Representa el tráfico total de la bandeja
    recibidos: total,
    leidos: leidosCount,
    noLeidos: total - leidosCount,
  });
  
  console.log("📊 Reporte actualizado:", { total, leidosCount });
  } else {
  setDatosTabla([]);
  setStats({ total: 0, enviados: 0, recibidos: 0, leidos: 0, noLeidos: 0 });
  }

  // ✅ Importante: Convertir el mapa en Array para la tabla
  const datosProcesados = agruparPorUsuario(data);
  setDatosTabla(Object.values(datosProcesados)); 
  
  } catch (error) {
    // Este log te dirá si el error de "relationship" desapareció
    console.error("❌ Error en Reportes:", error.message);
  } finally {
    setLoading(false); 
  }
  }, [estado, fechaInicio, fechaFin]);
  
  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
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
            <KPIsReportes stats={stats} />

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <GraficosReportes stats={stats} />
              </div>

              <div className="lg:col-span-2">
                <TablaReportes data={datosTabla} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Herramientas de Exportación</h3>
              <ExportarReportes data={datosTabla} stats={stats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;