import { Bell } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../config/supabaseClient";
import ListaNotificaciones from "./ListaNotificaciones";

const BellNotificaciones = () => {
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);

  // Usamos useCallback para que la función sea estable y no cause re-renderizados infinitos
  const cargarNotificaciones = useCallback(async () => {
    // 1. Obtenemos el usuario autenticado para filtrar
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // 2. Consultamos solo las notificaciones de este usuario
    const { data, error } = await supabase
      .from("notificaciones")
      .select("*")
      .eq("usuario_id", user.id) // Filtro esencial por usuario
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando notificaciones:", error.message);
      return;
    }
    setNotificaciones(data || []);
  }, []);

  useEffect(() => {
    cargarNotificaciones();

    // Configuración de Realtime para actualizaciones automáticas
    const canal = supabase
      .channel('cambios-notificaciones')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notificaciones' 
        }, 
        (payload) => {
          // Si el cambio pertenece al usuario actual, refrescamos
          cargarNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarNotificaciones]);

  // Cálculo de mensajes no leídos basado en la columna 'leido'
  const noLeidas = notificaciones.filter(n => !n.leido).length;

  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)} 
        className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6 text-yellow-300" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full border-2 border-green-600">
            {noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[100]">
           <ListaNotificaciones
            notificaciones={notificaciones}
            refrescar={cargarNotificaciones}
            setOpen={setOpen} // Pasamos setOpen para cerrar la lista al hacer clic fuera
          />
        </div>
      )}
    </div>
  );
};

export default BellNotificaciones;