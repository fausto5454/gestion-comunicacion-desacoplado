import { Bell } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../config/supabaseClient";
import ListaNotificaciones from "./ListaNotificaciones";

const BellNotificaciones = () => {
  const [open, setOpen] = useState(false);

  const cargarComunicaciones = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ✅ CORRECCIÓN: Traemos la notificación Y los datos del comunicado asociado
    const { data, error } = await supabase
      .from("comunicaciones")
      .select(`
        id,
        leido,
        usuario_id,
        comunicacion_id,
        created_at,
        comunicaciones (
          id_comunicacion,
          titulo,
          mensaje,
          prioridad,
          fecha_envio,
          estado
        )
      `)
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando:", error.message);
      return;
    }

    // Limpiamos los datos para que ListaNotificaciones reciba objetos completos
    const datosFormateados = data.map(n => ({
      ...n,
      // Si el join falló por RLS, evitamos que la app rompa
      comunicado: n.comunicaciones 
    }));

    setComunicaciones(datosFormateados || []);
  }, []);

  useEffect(() => {
    cargarComunicaciones();

    const canal = supabase
      .channel('cambios-comunicaciones')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'comunicaciones',
          // Opcional: filtrar aquí también por usuario_id si tu RLS es estricto
        }, 
        () => {
          cargarComunicaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [cargarNotificaciones]);

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
            notificaciones={comunicaciones}
            refrescar={cargarComunicaciones}
            setOpen={setOpen}
          />
        </div>
      )}
    </div>
  );
};

export default BellNotificaciones;