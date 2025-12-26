import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GraficosReportes = ({ stats }) => {
  // Preparamos los datos para el gráfico
  const pieData = [
    { name: "Leídos", value: stats.leidos || 0 },
    { name: "No Leídos", value: stats.noLeidos || 0 },
  ];

  // Colores: Verde para leídos, Rojo para no leídos
  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        Estado de Mensajes
      </h3>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={60} // Estilo Donut (opcional, se ve más moderno)
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
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Resumen textual rápido debajo del gráfico */}
      <div className="mt-4 flex justify-around text-sm font-medium">
        <div className="text-green-600">Leídos: {stats.leidos}</div>
        <div className="text-red-600">No Leídos: {stats.noLeidos}</div>
      </div>
    </div>
  );
};

export default GraficosReportes;