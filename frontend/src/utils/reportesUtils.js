export const agruparPorUsuario = (mensajes) => {
  const mapa = {};
  if (!mensajes) return mapa;

  mensajes.forEach(m => {
    // m.remitente ahora es un objeto { nombre_completo: "..." }
    const nombreRemitente = m.remitente?.nombre_completo || `ID: ${m.remitente_id?.slice(0, 5)}`;
    const nombreDestinatario = m.destinatario?.nombre_completo || `ID: ${m.destinatario_id?.slice(0, 5)}`;

    if (m.remitente_id) {
      mapa[nombreRemitente] = mapa[nombreRemitente] || { enviados: 0, recibidos: 0 };
      mapa[nombreRemitente].enviados++;
    }
    if (m.destinatario_id) {
      mapa[nombreDestinatario] = mapa[nombreDestinatario] || { enviados: 0, recibidos: 0 };
      mapa[nombreDestinatario].recibidos++;
    }
  });
  return Object.values(mapa);
};

