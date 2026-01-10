import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GraficosReportes = ({ stats }) => {
  // 1. Preparamos los datos para el gráfico
  const pieData = [
    { name: "Leídos", value: stats.leidos || 0 },
    { name: "No Leídos", value: stats.noLeidos || 0 },
  ];

  // 2. Verificamos si hay datos reales para evitar errores de renderizado de Recharts
  const tieneDatos = (stats.leidos + stats.noLeidos) > 0;

  // Colores: Verde para leídos, Rojo para no leídos
  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 h-full">
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        Estado de Mensajes
      </h3>
      
      <div className="h-[350px] w-full min-h-[300px]"> {/* ✅ Altura definida */}
        {tieneDatos ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={60} // Estilo Donut
                paddingAngle={5}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '10px', 
                  border: 'none', 
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          /* Estado vacío para evitar advertencias de Recharts cuando los datos aún no llegan */
          <div className="text-center text-gray-400">
            <p className="text-sm italic">Esperando datos de reportes...</p>
          </div>
        )}
      </div>
      
      {/* Resumen textual rápido debajo del gráfico */}
      <div className="mt-4 flex justify-around text-sm font-medium border-t pt-4 border-gray-50">
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-xs">LEÍDOS</span>
          <span className="text-green-600 text-lg">{stats.leidos}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400 text-xs">NO LEÍDOS</span>
          <span className="text-red-600 text-lg">{stats.noLeidos}</span>
        </div>
      </div>
    </div>
  );
};

export default GraficosReportes;