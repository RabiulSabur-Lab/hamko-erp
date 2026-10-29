import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { sanitizeFormulaInput } from "@/lib/utils";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PDF_MIME = "application/pdf";
const JSON_MIME = "application/json";

/**
 * Detects whether the app is running inside a native Capacitor WebView (Android / iOS).
 */
export function isCapacitorNative(): boolean {
  try {
    if (typeof Capacitor?.isNativePlatform === "function" && Capacitor.isNativePlatform()) {
      return true;
    }
    const winCap = typeof window !== "undefined" ? (window as any).Capacitor : undefined;
    if (typeof winCap?.isNativePlatform === "function" && winCap.isNativePlatform()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Detects whether the app is running on a Capacitor native WebView or a mobile/tablet browser
 * where `window.print()` or `<a download>` may be unsupported or unreliable.
 */
export function isMobileEnvironment(): boolean {
  if (isCapacitorNative()) return true;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  // iPadOS desktop-class UA detection
  if (
    typeof window !== "undefined" &&
    navigator.maxTouchPoints > 1 &&
    /Macintosh/i.test(ua)
  ) {
    return true;
  }
  return false;
}

function sanitizeFileName(rawName: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  const stripped = rawName.trim().replace(/[<>:"/\\|?*\x00-\x1F]+/g, "_");
  const base = stripped.toLowerCase().endsWith(ext.toLowerCase())
    ? stripped.slice(0, stripped.length - ext.length)
    : stripped;
  const safeBase = base.replace(/\s+/g, "_").replace(/_+/g, "_") || `export_${Date.now()}`;
  return `${safeBase}${ext}`;
}

/**
 * Converts a Uint8Array to a raw base64 string in safe chunks without overflowing the call stack.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode(...sub));
  }
  return btoa(chunks.join(""));
}

function isUserShareCancelError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || "").toLowerCase();
  return (
    msg.includes("cancel") ||
    msg.includes("canceled") ||
    msg.includes("cancelled") ||
    msg.includes("dismiss") ||
    msg.includes("aborterror") ||
    msg.includes("share canceled")
  );
}

function triggerBrowserDownload(blob: Blob, filename: string, openInNewTabFallback = false): void {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);

  if (openInNewTabFallback) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

/**
 * Unified cross-platform binary file exporter:
 * - On Capacitor Native (Android/iOS): writes to `Directory.Cache` (and `Directory.Documents` best-effort)
 *   via `@capacitor/filesystem`, then opens the native OS share/open/print sheet via `@capacitor/share`.
 * - On Mobile Web Browsers: attempts Web Share API Level 2 (`navigator.share({ files })`) when supported,
 *   gracefully falling back to Blob download / PDF viewer tab if gesture activation expired.
 * - On Desktop Browsers: triggers immediate `<a download>` file save.
 */
export async function saveOrShareBinaryFile(
  filename: string,
  bytes: Uint8Array,
  mimeType: string,
  options?: {
    title?: string;
    dialogTitle?: string;
    openInTabOnMobileFallback?: boolean;
  },
): Promise<void> {
  if (isCapacitorNative()) {
    const base64Data = uint8ArrayToBase64(bytes);

    // 1. Write to Directory.Cache (always permitted on Android 10–15 & iOS without storage permission prompts)
    const cacheWrite = await Filesystem.writeFile({
      path: filename,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    // 2. Best-effort copy to Directory.Documents so user also retains a local copy in Documents
    try {
      await Filesystem.writeFile({
        path: `HamkoERP/${filename}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // Scoped storage on certain Android versions may restrict public Documents; Cache URI handles Share cleanly
    }

    // 3. Launch native Share / Open / Print sheet
    try {
      const canShareRes = await Share.canShare().catch(() => ({ value: true }));
      if (canShareRes.value) {
        try {
          await Share.share({
            title: options?.title || filename,
            text: filename,
            files: [cacheWrite.uri],
            dialogTitle: options?.dialogTitle || `Open or Share ${filename}`,
          });
        } catch (shareFileErr) {
          if (isUserShareCancelError(shareFileErr)) return;
          await Share.share({
            title: options?.title || filename,
            text: filename,
            url: cacheWrite.uri,
            dialogTitle: options?.dialogTitle || `Open or Share ${filename}`,
          });
        }
      } else {
        toast.success(`Saved ${filename} to device storage`);
      }
    } catch (shareErr) {
      if (!isUserShareCancelError(shareErr)) {
        console.warn("[Export] Native share fallback notice:", shareErr);
        toast.success(`File saved: ${filename}`);
      }
    }
    return;
  }

  // Standard Web / Mobile Browser path
  const safeArrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([safeArrayBuffer], { type: mimeType });

  if (isMobileEnvironment() && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type: mimeType });
      const canShareFiles =
        typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : false;
      if (canShareFiles) {
        await navigator.share({
          title: options?.title || filename,
          files: [file],
        });
        return;
      }
    } catch (webShareErr) {
      if (isUserShareCancelError(webShareErr)) return;
      // NotAllowedError (gesture expired after async PDF render) or unsupported MIME — fall through to download/tab
    }
  }

  triggerBrowserDownload(
    blob,
    filename,
    Boolean(isMobileEnvironment() && options?.openInTabOnMobileFallback),
  );
}

/**
 * Exports a pre-built SheetJS `XLSX.WorkBook` across Desktop, Mobile Browsers, and Capacitor WebViews.
 */
export async function exportWorkbookToExcel(wb: XLSX.WorkBook, filename: string): Promise<void> {
  try {
    const safeFilename = sanitizeFileName(filename, ".xlsx");
    const arrayBuf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    const bytes = new Uint8Array(arrayBuf);
    await saveOrShareBinaryFile(safeFilename, bytes, XLSX_MIME, {
      title: safeFilename,
      dialogTitle: "Save or Share Excel Report",
    });
  } catch (err: any) {
    console.error("[Export] Excel export error:", err);
    toast.error(err?.message || "Failed to export Excel file");
  }
}

/**
 * Sanitizes row values against CSV/Excel formula injection, builds an `.xlsx` workbook,
 * and saves or shares it seamlessly on both Desktop and Mobile (Capacitor / mobile browsers).
 */
export async function exportToExcel(
  filename: string,
  data: Record<string, unknown>[],
  sheetName = "Sheet1",
): Promise<void> {
  const sanitizedData = (Array.isArray(data) ? data : []).map((row) => {
    const cleanRow: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row || {})) {
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
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  await exportWorkbookToExcel(wb, filename);
}

/**
 * Exports a UTF-8 JSON backup file across Desktop, Mobile Browsers, and Capacitor WebViews.
 */
export async function exportJsonBackup(filename: string, jsonContent: string): Promise<void> {
  try {
    const safeFilename = sanitizeFileName(filename, ".json");
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonContent);
    await saveOrShareBinaryFile(safeFilename, bytes, JSON_MIME, {
      title: safeFilename,
      dialogTitle: "Save or Share Backup JSON",
    });
  } catch (err: any) {
    console.error("[Export] JSON backup export error:", err);
    toast.error(err?.message || "Failed to export JSON backup");
  }
}

/**
 * Clones a target DOM element (including hidden `@media print` portal elements like `#print-invoice`
 * or `.hidden.print:block` templates) into an off-screen light-mode A4 stage and renders PDF bytes.
 */
async function renderElementToPdfBytes(
  sourceEl: HTMLElement,
  orientation: "portrait" | "landscape" = "portrait",
): Promise<Uint8Array> {
  const stageWidthPx = orientation === "landscape" ? 1122 : 794;

  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  stage.style.cssText = [
    "position: fixed",
    "left: -10000px",
    "top: 0",
    `width: ${stageWidthPx}px`,
    "background: #ffffff",
    "color: #000000",
    "padding: 16px",
    "margin: 0",
    "z-index: -9999",
    "pointer-events: none",
    "overflow: visible",
    "font-family: Arial, Helvetica, sans-serif",
  ].join(";");

  const clone = sourceEl.cloneNode(true) as HTMLElement;

  // Rename IDs & strip `hidden` utility classes so screen CSS `display: none` or duplicate IDs never affect capture
  if (clone.id) {
    clone.id = `pdf-render-${clone.id}`;
  }
  clone.classList.remove("hidden", "print:block");
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.style.backgroundColor = "#ffffff";
  clone.style.color = "#000000";
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";

  // Remove interactive `.no-print` controls and unhide any nested print-only blocks inside clone
  clone.querySelectorAll(".no-print, button").forEach((btn) => {
    btn.remove();
  });
  clone.querySelectorAll("[id]").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.id === "print-invoice") {
      htmlEl.style.display = "block";
    }
    htmlEl.id = `pdf-render-${htmlEl.id}`;
  });
  clone.querySelectorAll(".hidden").forEach((el) => {
    if (el.classList.contains("print:block") || el.classList.contains("print-container")) {
      el.classList.remove("hidden");
      (el as HTMLElement).style.display = "block";
    }
  });

  // Apply light-mode CSS theme tokens, crisp print table borders, & `@media print` typography rules
  const printShimStyle = document.createElement("style");
  printShimStyle.textContent = `
    .pdf-stage-root {
      color-scheme: light;
      --background: 0 0% 100%;
      --foreground: 222 47% 11%;
      --card: 0 0% 100%;
      --card-foreground: 222 47% 11%;
      --popover: 0 0% 100%;
      --popover-foreground: 222 47% 11%;
      --primary: 199 89% 48%;
      --primary-foreground: 0 0% 100%;
      --secondary: 210 40% 96%;
      --secondary-foreground: 222 47% 11%;
      --muted: 210 40% 96%;
      --muted-foreground: 215 16% 47%;
      --accent: 199 89% 96%;
      --accent-foreground: 199 89% 30%;
      --border: 214 32% 91%;
      --input: 214 32% 91%;
    }
    .pdf-stage-root, .pdf-stage-root * {
      color: #000000;
      box-sizing: border-box;
    }
    .pdf-stage-root .collection-badge,
    .pdf-stage-root .collection-badge * {
      background-color: #059669 !important;
      color: #ffffff !important;
    }
    .pdf-stage-root table {
      width: 100%;
      border-collapse: collapse;
    }
    .pdf-stage-root .clean-ledger-table th,
    .pdf-stage-root .clean-ledger-table td,
    .pdf-stage-root .ledger-table th,
    .pdf-stage-root .ledger-table td,
    .pdf-stage-root .pi-items-table th,
    .pdf-stage-root .pi-items-table td {
      border: 1px solid #000000;
      padding: 6px 8px;
      font-size: 11px;
    }
    .pdf-stage-root .clean-ledger-table th,
    .pdf-stage-root .ledger-table th,
    .pdf-stage-root .pi-items-table th {
      background-color: #f2f2f2;
      font-weight: 700;
    }
  `;

  clone.classList.add("pdf-stage-root");
  stage.appendChild(printShimStyle);
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    // Wait for embedded logos/images to finish decoding before canvas snapshot
    const images = Array.from(clone.querySelectorAll("img"));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 1200);
          }),
      ),
    );
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const arrayBuf = (await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename: "document.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: stageWidthPx,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation },
      })
      .from(clone)
      .outputPdf("arraybuffer")) as ArrayBuffer;

    return new Uint8Array(arrayBuf);
  } finally {
    if (stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
  }
}

/**
 * Generates an A4 PDF from `#elementId` and saves/shares it across Desktop, Mobile Browsers, and Capacitor.
 */
export async function exportToPdf(
  elementId: string,
  filename: string,
  orientation: "portrait" | "landscape" = "landscape",
): Promise<void> {
  if (typeof document === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Printable content is not ready yet. Please try again.");
    return;
  }

  const safeFilename = sanitizeFileName(filename, ".pdf");
  const toastId = `pdf-export-${Date.now()}`;

  try {
    if (isMobileEnvironment()) {
      toast.loading("Generating PDF...", { id: toastId });
    }
    const pdfBytes = await renderElementToPdfBytes(element, orientation);
    toast.dismiss(toastId);

    await saveOrShareBinaryFile(safeFilename, pdfBytes, PDF_MIME, {
      title: safeFilename,
      dialogTitle: "Print or Share PDF",
      openInTabOnMobileFallback: true,
    });
  } catch (err: any) {
    toast.dismiss(toastId);
    console.error("[Export] PDF generation error:", err);
    toast.error(err?.message || "Failed to generate PDF");
  }
}

export interface CrossPlatformPrintOptions {
  /** Target DOM element ID to render into PDF when running on Mobile / Capacitor */
  elementId?: string;
  /** Output PDF filename when sharing/printing on Mobile / Capacitor */
  filename?: string;
  /** Optional class temporarily added to `document.body` during desktop `window.print()` */
  bodyPrintClass?: string;
  /** PDF page orientation for mobile fallback (defaults to `"portrait"`) */
  orientation?: "portrait" | "landscape";
  /** Optional share sheet title on mobile */
  title?: string;
}

/**
 * Cross-platform Print handler:
 * - On Desktop Browsers: uses native `window.print()` with `bodyPrintClass` isolation & `afterprint` cleanup.
 * - On Capacitor WebViews & Mobile Browsers (where `window.print()` is a no-op or breaks portal layouts):
 *   renders the target print container into a crisp A4 PDF and opens the native OS Print / Share sheet
 *   (Android Print Spooler / AirPrint / WhatsApp / Save to Files).
 */
export async function printElementOrDocument(options: CrossPlatformPrintOptions = {}): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const {
    elementId,
    filename = `Hamko_ERP_Print_${new Date().toISOString().slice(0, 10)}`,
    bodyPrintClass,
    orientation = "portrait",
    title,
  } = options;

  // Desktop browsers with native print support
  if (!isMobileEnvironment() && typeof window.print === "function") {
    if (bodyPrintClass) {
      document.body.classList.add(bodyPrintClass);
      const cleanup = () => {
        document.body.classList.remove(bodyPrintClass);
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup, { once: true });
      setTimeout(cleanup, 3000);
    }
    window.print();
    return;
  }

  // Mobile / Capacitor path: locate printable element and generate shareable/printable PDF
  const candidateIds = [
    elementId,
    "print-invoice",
    "print-collection-receipt",
    "print-ledger",
    "print-supplier-ledger",
    "print-handover-slip",
    "report-content",
  ].filter(Boolean) as string[];

  let targetEl: HTMLElement | null = null;
  for (const id of candidateIds) {
    const found = document.getElementById(id);
    if (found) {
      targetEl = found;
      break;
    }
  }

  if (!targetEl) {
    targetEl = (document.querySelector(".print-container") as HTMLElement | null) || document.body;
  }

  const safeFilename = sanitizeFileName(filename, ".pdf");
  const toastId = `mobile-print-${Date.now()}`;

  try {
    toast.loading("Preparing printable PDF...", { id: toastId });
    const pdfBytes = await renderElementToPdfBytes(targetEl, orientation);
    toast.dismiss(toastId);

    await saveOrShareBinaryFile(safeFilename, pdfBytes, PDF_MIME, {
      title: title || safeFilename,
      dialogTitle: "Print or Share Document",
      openInTabOnMobileFallback: true,
    });
  } catch (err: any) {
    toast.dismiss(toastId);
    console.error("[Print] Mobile print/PDF fallback error:", err);
    // Last-resort fallback if native browser print exists on mobile Chrome/Safari
    if (typeof window.print === "function" && !isCapacitorNative()) {
      window.print();
    } else {
      toast.error(err?.message || "Unable to prepare printable document on this device");
    }
  }
}
