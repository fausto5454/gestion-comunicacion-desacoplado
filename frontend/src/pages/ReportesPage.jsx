import { useEffect, useState, useCallback } from "react";
import { BarChart2, Loader2 } from "lucide-react";
import { supabase } from "../config/supabaseClient";

import FiltrosReportes from "../components/reportes/FiltrosReportes";
import KPIsReportes from "../components/reportes/KPIsReportes";
import GraficosReportes from "../components/reportes/GraficosReportes";
import ExportarReportes from "../components/reportes/ExportarReportes";
import TablaReportes from "../components/reportes/TablaReportes"; // ✅ Agregada la tabla
import { agruparPorUsuario } from "../utils/reportesUtils"; // ✅ Importar tu helper

const ReportesPage = () => {
  const [loading, setLoading] = useState(true);
  const [datosTabla, setDatosTabla] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    enviados: 0,
    recibidos: 0,
    leidos: 0,
    noLeidos: 0,
  });

  // Filtros
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estado, setEstado] = useState("todos");

  // Usamos useCallback para evitar re-renderizados innecesarios
 const fetchReportes = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Tip: He añadido los filtros directamente en la consulta para que 
      // la tabla y los KPIs respondan a las fechas y estados seleccionados.
      let query = supabase
        .from("comunicaciones")
        .select(`
          estado, 
          fecha_envio, 
          remitente_id, 
          destinatario_id,
          remitente:usuarios!remitente_id(nombre_completo),
          destinatario:usuarios!destinatario_id(nombre_completo)
        `);

      if (estado !== "todos") query = query.eq("estado", estado);
      if (fechaInicio) query = query.gte("fecha_envio", fechaInicio);
      if (fechaFin) query = query.lte("fecha_envio", fechaFin);

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        setDatosTabla(agruparPorUsuario(data));
        
        const total = data.length;
        const leidos = data.filter(m => 
          m.estado?.trim().toLowerCase() === "leído"
        ).length;

        setStats({
          total,
          enviados: total,
          recibidos: total,
          leidos,
          noLeidos: total - leidos,
        });
      }
    } catch (error) {
      console.error("❌ Error cargando reportes:", error.message);
    } finally {
      setLoading(false); 
    }
   }, [estado, fechaInicio, fechaFin]);
    useEffect(() => {
    fetchReportes();
   }, []);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <BarChart2 className="text-green-600 w-8 h-8" />
            Reportes del Sistema
          </h1>
          <p className="text-gray-500 mt-1">
            Visualiza y exporta el rendimiento de las comunicaciones institucionales.
          </p>
        </header>

        {/* FILTROS */}
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
            <p className="text-gray-500 font-medium">Actualizando reportes...</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPIs */}
            <KPIsReportes stats={stats} />

            <div className="grid lg:grid-cols-3 gap-8">
              {/* GRÁFICOS (Ocupa 1/3) */}
              <div className="lg:col-span-1">
                <GraficosReportes stats={stats} />
              </div>

              {/* TABLA DE DETALLE (Ocupa 2/3) */}
              <div className="lg:col-span-2">
                <TablaReportes data={datosTabla} />
              </div>
            </div>

            {/* BOTONES DE EXPORTACIÓN */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Herramientas de Exportación</h3>
              <ExportarReportes stats={stats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;