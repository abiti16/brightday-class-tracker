export async function exportPdf(title: string, subtitle: string, head: string[], body: (string | number)[][]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, 14, 25);
  autoTable(doc, {
    head: [head],
    body: body.map((r) => r.map(String)),
    startY: 31,
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  });
  doc.save(`${slug(title)}.pdf`);
}

export async function exportExcel(title: string, head: string[], body: (string | number)[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${slug(title)}.xlsx`);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
