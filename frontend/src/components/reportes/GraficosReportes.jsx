import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const GraficosReportes = ({ stats }) => {
  const pieData = [
    { name: "Leídos", value: stats.leidos || 0 },
    { name: "No Leídos", value: stats.noLeidos || 0 },
  ];

  const total = (stats.leidos || 0) + (stats.noLeidos || 0);
  const COLORS = ["#22c55e", "#ef4444"];

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

   return percent > 0 ? (
   <text 
    x={x} 
    y={y} 
    fill="white" 
    textAnchor="middle" 
    dominantBaseline="central" 
    className="text-[13px] font-black">
    {`${(percent * 100).toFixed(0)}%`}
   </text>
  ) : null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full pb-2">
      
      {/* SECCIÓN GRÁFICO: Ahora incluimos el título de forma orgánica aquí */}
      <div className="flex-grow w-full relative flex flex-col"> 
        
        {/* Título único integrado y centrado */}
        <div className="pt-6 pb-2">
          <h3 className="text-lg font-bold text-gray-800 text-center">
          Estado de Mensajes
         </h3>
        </div>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="63%"
                outerRadius="90%"
                paddingAngle={5}
                labelLine={false}
                label={renderCustomLabel}
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
              />
              <Legend 
                verticalAlign="bottom" 
                align="center" 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex-grow flex items-center justify-center text-gray-300 text-sm italic">Sin datos</div>
        )}
      </div>

      {/* SECCIÓN RESUMEN: Más minimalista para evitar el desborde */}
      <div className="mx-6 mb-4 p-3 bg-white rounded-xl flex justify-around border border-gray-100 shrink-0">
          <div className="text-center">
            <p className="text-[9px] text-green-600 uppercase font-extrabold mb-0.5">Leídos</p>
            <span className="text-base font-black text-green-600 leading-none">{stats.leidos}</span>
          </div>
          <div className="w-[1px] bg-gray-200 h-6 self-center"></div>
          <div className="text-center">
            <p className="text-[9px] text-red-600 uppercase font-extrabold mb-0.5">No Leídos</p>
            <span className="text-base font-black text-red-600 leading-none">{stats.noLeidos}</span>
          </div>
      </div>
    </div>
  );
};

export default GraficosReportes;