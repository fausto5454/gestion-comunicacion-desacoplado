import { supabase } from "../config/supabaseClient";

/* ======================================================
   ALERTA 1: MENSAJES NO LEÍDOS
====================================================== */
export const verificarMensajesNoLeidos = async () => {
  const { data, error } = await supabase
    .from("comunicaciones")
    .select("id")
    .eq("estado", "no leído");

  if (!error && data?.length > 0) {
    await supabase.from("notificaciones").insert({
      tipo: "alerta",
      titulo: "Mensajes pendientes",
      mensaje: `Existen ${data.length} mensajes no leídos en el sistema`
    });
  }
};

/* ======================================================
   ALERTA 2: MENSAJES ATRASADOS (+48h)
====================================================== */
export const verificarMensajesAtrasados = async () => {
  const limite = new Date();
  limite.setHours(limite.getHours() - 48);

  const { data, error } = await supabase
    .from("comunicaciones")
    .select("id")
    .eq("estado", "no leído")
    .lt("fecha_envio", limite.toISOString());

  if (!error && data?.length > 0) {
    await supabase.from("notificaciones").insert({
      tipo: "advertencia",
      titulo: "Mensajes atrasados",
      mensaje: `Hay ${data.length} mensajes sin leer por más de 48 horas`
    });
  }
};

/* ======================================================
   ALERTA 3: ALTO VOLUMEN DE COMUNICACIONES
====================================================== */
export const verificarAltoVolumen = async () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("comunicaciones")
    .select("id")
    .gte("fecha_envio", hoy.toISOString());

  if (!error && data?.length > 50) {
    await supabase.from("notificaciones").insert({
      tipo: "info",
      titulo: "Alto volumen de comunicaciones",
      mensaje: `Se han registrado ${data.length} mensajes el día de hoy`
    });
  }
};
