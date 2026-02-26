// FiltrosReportes.jsx
const FiltrosReportes = ({
  fechaInicio,
  fechaFin,
  estado,
  setFechaInicio,
  setFechaFin,
  setEstado,
  onAplicar
}) => {
  // Verificación de seguridad para evitar que el componente falle
  if (fechaInicio === undefined) return null; 

  return (
    <div className="bg-slate-600 p-6 rounded-xl shadow-sm mb-6 grid md:grid-cols-4 gap-4 items-end border border-gray-100">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-center font-semibold text-gray-100 uppercase">Desde</label>
        <input 
          type="date" 
          className="border rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none bg-white transition-all"
          value={fechaInicio} 
          onChange={e => setFechaInicio(e.target.value)} 
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-center font-semibold text-gray-100 uppercase">Hasta</label>
        <input 
          type="date" 
          className="border rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none bg-white transition-all"
          value={fechaFin} 
          onChange={e => setFechaFin(e.target.value)} 
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-center text-gray-100 uppercase">Estado</label>
        <select 
          className="border rounded-lg p-2 focus:ring-2 focus:ring-green-500 outline-none bg-white transition-all"
          value={estado} 
          onChange={e => setEstado(e.target.value)}
        >
          <option value="todos">Todos los mensajes</option>
          <option value="leído">Leídos</option>
          <option value="no leído">No leídos</option>
        </select>
      </div>
      <button 
        onClick={onAplicar} 
        className="bg-green-600 hover:bg-green-700 active:scale-95 transition-all py-2.5 text-white rounded-lg font-bold shadow-md h-[42px]"
      >
        Aplicar filtros
      </button>
    </div>
  );
};

export default FiltrosReportes;