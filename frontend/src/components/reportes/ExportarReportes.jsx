import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from 'xlsx-js-style';
import { saveAs } from "file-saver";
import { FileText, Table as TableIcon, FileEdit } from "lucide-react"; // Iconos más descriptivos
import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, HeadingLevel, ImageRun 
} from "docx";

const ExportarReportes = ({ stats, datosTabla = {} }) => {
  const fechaHoy = new Date().toLocaleDateString();

  /* --- Funciones de Exportación (Manteniendo tu lógica original) --- */
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

  const exportarPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titulo = "Reporte del Sistema de Comunicaciones";
    const xTitulo = (pageWidth - doc.getTextWidth(titulo)) / 2;
    doc.text(titulo, xTitulo, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const textoFecha = `Fecha de emisión: ${fechaHoy}`;
    const xFecha = pageWidth - doc.getTextWidth(textoFecha) - 14;
    doc.text(textoFecha, xFecha, 30);

    doc.setDrawColor(22, 163, 74);
    doc.line(14, 35, pageWidth - 14, 35);

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
      columnStyles: { 1: { halign: 'center' } },
      theme: 'striped'
    });

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
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } }
      });
    }
    doc.save(`Reporte_Comunicaciones_${fechaHoy.replace(/\//g, '-')}.pdf`);
  };

  /* ================= EXCEL PROFESIONAL ================= */
 const exportarExcel = () => {
  const wb = XLSX.utils.book_new();
  
  const data = [
    ["", "INSTITUCIÓN EDUCATIVA N.° 2079 - ANTONIO RAIMONDI"], // B1
    ["", "REPORTE DEL SISTEMA DE COMUNICACIONES"],            // B2
    [""],                                                     // B3
    ["", `Fecha de emisión: ${fechaHoy}`],                    // B4
    ["", "INDICADOR", "CANTIDAD"],                            // B5
    ["", "Total Mensajes", stats.total || 0],                 
    ["", "Enviados", stats.enviados || 0],
    ["", "Recibidos", stats.recibidos || 0],
    ["", "Leídos", stats.leidos || 0],
    ["", "No Leídos", stats.noLeidos || 0],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // --- CONFIGURACIÓN DE COMBINACIÓN (MERGE) ---
  // Combinamos de la Columna B a la C para los títulos (Filas 1 y 2)
  ws['!merges'] = [
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // Une B1 y C1
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }  // Une B2 y C2
  ];

  // --- ESTILOS ---
  const styleTituloCentrado = {
    font: { bold: true, color: { rgb: "16A34A" }, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" } // Centrado total
  };

  const styleHeader = {
    fill: { fgColor: { rgb: "16A34A" } },
    font: { color: { rgb: "FFFFFF" }, bold: true },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    }
  };

  const styleCeldaCantidad = {
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" }
    }
  };

  // Aplicar estilos de título
  ws["B1"].s = styleTituloCentrado;
  ws["B2"].s = { ...styleTituloCentrado, font: { bold: true, color: { rgb: "000000" }, sz: 11 } };

  // Aplicar estilos de tabla
  ws["B5"].s = styleHeader;
  ws["C5"].s = styleHeader;

  for (let i = 6; i <= 10; i++) {
    if (ws[`B${i}`]) ws[`B${i}`].s = { border: styleCeldaCantidad.border, alignment: { horizontal: "left" } };
    if (ws[`C${i}`]) ws[`C${i}`].s = styleCeldaCantidad;
  }

  // --- AJUSTE DE ANCHOS ---
  ws["!cols"] = [
    { wch: 4 },  // A
    { wch: 45 }, // B (Suficiente para que el indicador se lea bien)
    { wch: 20 }, // C (Suficiente para la cantidad centrada)
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Reporte Institucional");
  XLSX.writeFile(wb, `Reporte_IE2079_${fechaHoy.replace(/\//g, '-')}.xlsx`);
 };

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
    <div className="flex flex-col sm:flex-row flex-wrap gap-6 items-center justify-center">
      {/* Botón PDF */}
      <button 
        onClick={exportarPDF} 
        className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-white bg-red-600 hover:bg-red-700 transition-all shadow-sm hover:shadow-md font-medium text-sm group"
        >
        <FileText size={18} className="group-hover:scale-110 transition-transform" /> 
        Exportar PDF
      </button>

      {/* Botón Excel */}
      <button 
        onClick={exportarExcel} 
        className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm hover:shadow-md font-medium text-sm group"
        >
        <TableIcon size={18} className="group-hover:scale-110 transition-transform" /> 
        Exportar Excel
      </button>

      {/* Botón Word */}
      <button 
        onClick={exportarWord} 
        className="w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium text-sm group"
         >
        <FileEdit size={18} className="group-hover:scale-110 transition-transform" /> 
        Exportar Word
      </button>
    </div>
  </div>
  );
};

export default ExportarReportes;