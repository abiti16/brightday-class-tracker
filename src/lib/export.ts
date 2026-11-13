const FONT_PATH = "/fonts/NotoSansEthiopic-Regular.ttf";
const FONT_NAME = "NotoEthiopic";

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Ethiopic-capable font so Amharic class and session names print correctly; null if unavailable. */
let ethiopic: Promise<string | null> | null = null;
function loadEthiopic() {
  ethiopic ??= fetch(FONT_PATH)
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? toBase64(new Uint8Array(b)) : null))
    .catch(() => null);
  return ethiopic;
}

export async function exportPdf(title: string, subtitle: string, head: string[], body: (string | number)[][]) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF();
  const font = await loadEthiopic();
  const fontName = font ? FONT_NAME : "helvetica";
  if (font) {
    doc.addFileToVFS("NotoSansEthiopic.ttf", font);
    doc.addFont("NotoSansEthiopic.ttf", FONT_NAME, "normal");
  }
  doc.setFont(fontName);
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(subtitle, 14, 25);
  autoTable(doc, {
    head: [head],
    body: body.map((r) => r.map(String)),
    startY: 31,
    headStyles: { fillColor: [37, 99, 235], font: fontName },
    styles: { fontSize: 9, font: fontName },
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
