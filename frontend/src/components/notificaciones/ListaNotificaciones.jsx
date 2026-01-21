import { supabase } from "../../config/supabaseClient";

const ListaNotificaciones = ({ notificaciones, refrescar }) => {
  const marcarLeido = async (id) => {
    const { error } = await supabase
      .from("notificaciones")
      .update({ leido: true })
      .eq("id", id);
    
    if (!error) refrescar();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl overflow-hidden z-50 border border-gray-200">
      <div className="max-h-96 overflow-y-auto"> {/* Altura máxima y scroll */}
        {notificaciones.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">No hay notificaciones</p>
          </div>
        ) : (
          notificaciones.map((n) => (
            <div
              key={n.id}
              onClick={() => marcarLeido(n.id)}
              className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors
                ${!n.leido ? "bg-blue-50" : "bg-white"}
              `}
            >
              <p className={`text-sm ${!n.leido ? "font-bold text-blue-900" : "font-semibold text-gray-800"}`}>
                {n.titulo}
              </p>
              <p className="text-xs text-gray-600 line-clamp-2">{n.mensaje}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ListaNotificaciones;
