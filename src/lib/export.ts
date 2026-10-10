import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { sanitizeFormulaInput } from "@/lib/utils";

export function exportToExcel(filename: string, data: Record<string, unknown>[]) {
  const sanitizedData = data.map((row) => {
    const cleanRow: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (typeof val === "string") {
        cleanRow[key] = sanitizeFormulaInput(val);
      } else {
        cleanRow[key] = val;
      }
    }
    return cleanRow;
  });
  const ws = XLSX.utils.json_to_sheet(sanitizedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;
  html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  }).from(element).save();
}
