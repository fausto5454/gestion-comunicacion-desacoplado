export const agruparPorUsuario = (mensajes) => {
  const mapa = {};
  if (!mensajes || !Array.isArray(mensajes)) return [];

  mensajes.forEach(m => {
    // 1. Definimos las IDs como llaves únicas
    const rId = m.remitente_id;
    const dId = m.destinatario_id;

    // 2. Procesar Remitente (Enviados)
    if (rId) {
      if (!mapa[rId]) {
        mapa[rId] = { 
          id: rId,
          usuario: m.remitente?.nombre_completo || `ID: ${rId.slice(0, 5)}`, 
          enviados: 0, 
          recibidos: 0 
        };
      }
      mapa[rId].enviados++;
    }

    // 3. Procesar Destinatario (Recibidos)
    if (dId) {
      if (!mapa[dId]) {
        mapa[dId] = { 
          id: dId,
          usuario: m.destinatario?.nombre_completo || `ID: ${dId.slice(0, 5)}`, 
          enviados: 0, 
          recibidos: 0 
        };
      }
      mapa[dId].recibidos++;
    }
  });

  // Retornamos los valores del mapa (formato array para tablas o gráficas)
  return Object.values(mapa);
};