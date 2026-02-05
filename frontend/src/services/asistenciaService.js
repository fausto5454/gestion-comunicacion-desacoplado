import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// Esta función transforma los datos verticales de Supabase en una matriz horizontal
export const generarConsolidadoProfesional = async (asistenciasRaw, estudiantesNomina, periodoNombre) => {
  const workbook = new ExcelJS.Workbook();
  
  // 1. Agrupar estudiantes por Grado y Sección
  const secciones = [...new Set(estudiantesNomina.map(e => `${e.grado}${e.seccion}`))];

  secciones.forEach(secc => {
    const worksheet = workbook.addWorksheet(`Sección ${secc}`);
    const alumnosSeccion = estudiantesNomina.filter(e => `${e.grado}${e.seccion}` === secc);
    
    // 2. Definir fechas (columnas) para esta sección
    const fechas = [...new Set(asistenciasRaw.map(a => a.fecha))].sort();

    // 3. Encabezados
    const header = ['N°', 'ESTUDIANTE', ...fechas, 'FALTAS', 'TARDANZAS'];
    const headerRow = worksheet.addRow(header);
    
    // Estilo de encabezado neón/profesional
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '92D050' } };
      cell.font = { bold: true, color: { argb: '000000' } };
      cell.alignment = { horizontal: 'center' };
    });

    // 4. Llenado de datos por cada alumno
    alumnosSeccion.forEach((est, index) => {
      let faltas = 0;
      let tardanzas = 0;
      
      const filaData = [index + 1, `${est.apellido_paterno} ${est.apellido_materno}, ${est.nombres}`];
      
      fechas.forEach(f => {
        const registro = asistenciasRaw.find(a => a.id_estudiante === est.id_matricula && a.fecha === f);
        const estado = registro ? registro.estado[0] : '-'; // P, A, T, J
        
        filaData.push(estado);
        if (estado === 'A') faltas++;
        if (estado === 'T') tardanzas++;
      });

      filaData.push(faltas, tardanzas);
      const row = worksheet.addRow(filaData);

      // Alerta visual: Si tiene más de 3 faltas, pintar en rojo
      if (faltas >= 3) {
        row.getCell(2).font = { color: { argb: 'FFFF0000' }, bold: true };
      }
    });

    // Ajuste de anchos
    worksheet.getColumn(2).width = 40;
  });

  // 5. Descarga del archivo
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Consolidado_${periodoNombre}.xlsx`);
};