import { supabase } from "../../config/supabaseClient";

const ListaNotificaciones = ({ notificaciones, refrescar }) => {
  const marcarLeido = async (id) => {
    const { error } = await supabase
      .from("comunicaciones")
      .update({ leido: true })
      .eq("id", id);
    
    if (!error) refrescar();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 bg-white shadow-xl rounded-xl overflow-hidden z-50 border border-gray-200">
      <div className="max-h-96 overflow-y-auto">
        {notificaciones.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">No hay notificaciones</p>
          </div>
        ) : (
          notificaciones.map((n) => {
            // 🎯 ACCESO CORRECTO: Extraemos los datos del comunicado asociado
            // Usamos 'comunicaciones' o el alias que definiste en el select
            const info = n.comunicaciones || {}; 

            return (
              <div
                key={n.id}
                onClick={() => marcarLeido(n.id)}
                className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors
                  ${!n.leido ? "bg-blue-50" : "bg-white"}
                `}
              >
                {/* Mostramos el título desde el objeto relacionado */}
                <p className={`text-sm ${!n.leido ? "font-bold text-blue-900" : "font-semibold text-gray-800"}`}>
                  {info.titulo || "Sin título"} 
                </p>
                
                {/* Mostramos el mensaje desde el objeto relacionado */}
                <p className="text-xs text-gray-600 line-clamp-2">
                  {info.mensaje || "Haga clic para ver el contenido"}
                </p>

                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                  {info.prioridad === 'Alta' && (
                    <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded">Urgente</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ListaNotificaciones;