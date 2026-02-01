import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Download, FileText } from "lucide-react";
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ImageRun 
} from "docx";

const ExportarReportes = ({ stats, datosTabla = {} }) => {
  const fechaHoy = new Date().toLocaleDateString();

  /* --- Función Auxiliar para Word (Logo) --- */
  const getLogoBase64 = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error cargando logo:", error);
      return null;
    }
  };

 /* ================= PDF ================= */
  const exportarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth(); // Obtenemos el ancho de la página
    
    // Título Centrado
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titulo = "Reporte del Sistema de Comunicaciones";
    const xTitulo = (pageWidth - doc.getTextWidth(titulo)) / 2; // Cálculo para centrar
    doc.text(titulo, xTitulo, 22);

    // Fecha a la Derecha
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const textoFecha = `Fecha de emisión: ${fechaHoy}`;
    const xFecha = pageWidth - doc.getTextWidth(textoFecha) - 14; // Margen de 14 desde la derecha
    doc.text(textoFecha, xFecha, 30);

    // Línea divisoria decorativa
    doc.setDrawColor(22, 163, 74); // Verde institucional
    doc.line(14, 35, pageWidth - 14, 35);

    // Tabla de Resumen
    autoTable(doc, {
      startY: 42,
      head: [["Indicador", "Cantidad"]],
      body: [
        ["Total Mensajes", stats.total],
        ["Enviados", stats.enviados],
        ["Recibidos", stats.recibidos],
        ["Leídos", stats.leidos],
        ["No Leídos", stats.noLeidos],
      ],
      headStyles: { fillColor: [22, 163, 74], halign: 'center' },
      columnStyles: { 1: { halign: 'center' } }, // Centrar números
      theme: 'striped'
    });

    // Tabla de Detalle por Usuario
    if (Object.keys(datosTabla).length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text("Detalle de Actividad por Usuario", 14, doc.lastAutoTable.finalY + 15);
      
      const bodyUsuarios = Object.entries(datosTabla).map(([nombre, c]) => [
        nombre, c.enviados, c.recibidos
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["Usuario", "Enviados", "Recibidos"]],
        body: bodyUsuarios,
        headStyles: { fillColor: [31, 41, 55], halign: 'center' },
        columnStyles: { 
          1: { halign: 'center' }, 
          2: { halign: 'center' } 
        }
      });
    }

    doc.save(`Reporte_Comunicaciones_${fechaHoy.replace(/\//g, '-')}.pdf`);
  };
  /* ================= EXCEL ================= */
  const exportarExcel = () => {
    const workbook = XLSX.utils.book_new();
    const wsResumen = XLSX.utils.json_to_sheet([
      { Indicador: "Total", Cantidad: stats.total },
      { Indicador: "Leídos", Cantidad: stats.leidos },
      { Indicador: "No Leídos", Cantidad: stats.noLeidos },
    ]);
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");

    if (Object.keys(datosTabla).length > 0) {
      const dataUsuarios = Object.entries(datosTabla).map(([nombre, c]) => ({
        Usuario: nombre, Enviados: c.enviados, Recibidos: c.recibidos
      }));
      const wsUsuarios = XLSX.utils.json_to_sheet(dataUsuarios);
      XLSX.utils.book_append_sheet(workbook, wsUsuarios, "Detalle Usuarios");
    }
    XLSX.writeFile(workbook, `Reporte_Comunicaciones_${fechaHoy}.xlsx`);
  };

  /* ================= WORD ================= */
  const exportarWord = async () => {
    try {
      const logoData = await getLogoBase64("/logo.png");
      const azulInstitucional = "1F2937"; 
      const verdeHeader = "16A34A";

      const crearCeldaHeader = (texto, color) => new TableCell({
        shading: { fill: color },
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: texto, bold: true, color: "FFFFFF" })] 
        })],
      });

      const filasResumen = [
        new TableRow({ children: [crearCeldaHeader("Indicador", verdeHeader), crearCeldaHeader("Cantidad", verdeHeader)] }),
        ...[["Total", stats.total], ["Enviados", stats.enviados], ["Recibidos", stats.recibidos], ["Leídos", stats.leidos]].map(([l, v]) => 
          new TableRow({ children: [
            new TableCell({ children: [new Paragraph({ text: l, indent: { left: 100 } })] }),
            new TableCell({ children: [new Paragraph({ text: v.toString(), alignment: AlignmentType.CENTER })] })
          ]})
        )
      ];

      const filasUsuarios = [
        new TableRow({ children: [crearCeldaHeader("Usuario", azulInstitucional), crearCeldaHeader("Enviados", azulInstitucional), crearCeldaHeader("Recibidos", azulInstitucional)] }),
        ...Object.entries(datosTabla).map(([n, c]) => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(n)] }),
            new TableCell({ children: [new Paragraph({ text: c.enviados.toString(), alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: c.recibidos.toString(), alignment: AlignmentType.CENTER })] })
          ]
        }))
      ];

      const doc = new Document({
        sections: [{
          children: [
            logoData && new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ data: logoData, transformation: { width: 60, height: 60 } })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "INSTITUCIÓN EDUCATIVA N.° 2079 - ANTONIO RAIMONDI", bold: true, size: 24, color: verdeHeader })],
            }),
            new Paragraph({ text: "REPORTE INSTITUCIONAL", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            
            new Paragraph({ text: "1. RESUMEN DE INDICADORES", heading: HeadingLevel.HEADING_2 }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filasResumen }),

            new Paragraph({ text: "2. DETALLE POR USUARIO", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filasUsuarios }),
          ].filter(Boolean),
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Reporte_Institucional_${fechaHoy}.docx`);
    } catch (error) {
      alert("Error generando documento Word.");
    }
  };

  return (
    <div className="flex flex-wrap gap-4 mt-6">
      <button onClick={exportarPDF} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition shadow">
        <FileText size={18} /> Exportar PDF
      </button>
      <button onClick={exportarExcel} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition shadow">
        <Download size={18} /> Exportar Excel
      </button>
      <button onClick={exportarWord} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition shadow">
        <Download size={18} /> Exportar Word
      </button>
    </div>
  );
};

export default ExportarReportes;