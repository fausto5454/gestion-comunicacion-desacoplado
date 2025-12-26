import { useEffect, useState } from "react";
import { supabase } from "../config/supabaseClient";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, FileText, MessageSquare, ClipboardCheck, Database, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    usuarios: null,
    documentos: null,
    comunicaciones: null,
    reportes: null,
    auditoria: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔹 Función para obtener conteos desde Supabase
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const tables = ["usuarios", "documentos", "comunicaciones", "reportes", "auditoria"];
      const counts = {};

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) throw error;
        counts[table] = count || 0;
      }

      setStats(counts);
    } catch (err) {
      console.error("Error al obtener datos:", err);
      setError("No se pudieron cargar los datos del Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 🔹 Datos para los gráficos
  const barData = [
    { name: "Usuarios", total: stats.usuarios || 0 },
    { name: "Documentos", total: stats.documentos || 0 },
    { name: "Comunicaciones", total: stats.comunicaciones || 0 },
    { name: "Reportes", total: stats.reportes || 0 },
    { name: "Auditoría", total: stats.auditoria || 0 },
  ];

  const lineData = [
    { month: "Jun", registros: stats.usuarios || 0 },
    { month: "Jul", registros: stats.documentos || 0 },
    { month: "Ago", registros: stats.comunicaciones || 0 },
    { month: "Sep", registros: stats.reportes || 0 },
    { month: "Oct", registros: stats.auditoria || 0 },
  ];

  const cards = [
    { title: "Usuarios", value: stats.usuarios, icon: <Users className="text-blue-600" /> },
    { title: "Documentos", value: stats.documentos, icon: <FileText className="text-green-600" /> },
    { title: "Comunicaciones", value: stats.comunicaciones, icon: <MessageSquare className="text-purple-600" /> },
    { title: "Reportes", value: stats.reportes, icon: <ClipboardCheck className="text-orange-600" /> },
    { title: "Auditoría", value: stats.auditoria, icon: <Database className="text-red-600" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        Panel Principal del Sistema
      </h1>

      {/* 🔹 Estado de carga */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 w-10 h-10 mb-3" />
          <p className="text-gray-700 font-medium">Cargando datos...</p>
        </div>
      )}

      {/* 🔹 Estado de error */}
      {error && !loading && (
        <div className="text-center text-red-600 font-semibold bg-red-100 border border-red-300 rounded-xl p-4 max-w-md mx-auto">
          {error}
        </div>
      )}

      {/* 🔹 Contenido principal */}
      {!loading && !error && (
        <>
          {/* Tarjetas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
            {cards.map((card, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-md p-5 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-4xl mb-3">{card.icon}</div>
                <h2 className="text-lg font-semibold text-gray-700">{card.title}</h2>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {card.value !== null ? card.value : "--"}
                </p>
              </div>
            ))}
          </div>

          {/* Gráfico de barras */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Resumen General</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de línea */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Actividad Mensual</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="registros" stroke="#16a34a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
