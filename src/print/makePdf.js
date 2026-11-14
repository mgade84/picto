import { isLocal, loadImage as loadStoredImage } from "../images/imageStore";
import { shareOrDownload } from "../share/shareFile";
import { sheetLayout } from "./layout";

const MM_TO_PT = 72 / 25.4;
const CELL_PADDING = 2;
const IMAGE_TIMEOUT_MS = 15000;

// The image's bytes: from IndexedDB for the user's own images, otherwise
// fetched with CORS (ARASAAC and Wikimedia Commons send CORS headers).
async function imageBlob(url, signal) {
    if (isLocal(url)) {
        const blob = await loadStoredImage(url);
        if (!blob) throw new Error("image missing");
        return blob;
    }
    const res = await fetch(url, { mode: "cors", signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.blob();
}

// Loads an image as a PNG data URL. Goes through a blob URL so the canvas is
// never tainted, and through a canvas so any format the browser can show,
// including SVG from old data, works.
async function loadImage(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
    try {
        const blobUrl = URL.createObjectURL(await imageBlob(url, controller.signal));
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error("decode failed"));
                el.src = blobUrl;
            });
            const scale = Math.min(1, 600 / Math.max(img.naturalWidth || 600, img.naturalHeight || 600));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round((img.naturalWidth || 600) * scale);
            canvas.height = Math.round((img.naturalHeight || 600) * scale);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            return { data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
        } finally {
            URL.revokeObjectURL(blobUrl);
        }
    } finally {
        clearTimeout(timer);
    }
}

// Shortens `text` with "..." until it fits `width` mm at the current font.
function fit(doc, text, width) {
    if (doc.getTextWidth(text) <= width) return text;
    let s = text;
    while (s.length > 1 && doc.getTextWidth(`${s}...`) > width) s = s.slice(0, -1);
    return `${s.trimEnd()}...`;
}

/**
 * Builds the sequence as an A4 PDF, page for page like the print preview.
 * jsPDF is loaded on demand. Images that fail to load leave an empty frame
 * with the label rather than failing the whole PDF.
 */
export async function makePdf(sequence, options) {
    const { orientation } = options;
    const { jsPDF } = await import("jspdf");
    const pictograms = sequence.pictograms;
    const layout = sheetLayout(pictograms.length, options);
    const images = await Promise.all(pictograms.map(p => loadImage(p.img).catch(() => null)));

    const doc = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
    doc.setProperties({ title: sequence.name, creator: "Picto" });
    doc.setFont("helvetica", "normal");
    doc.setLineWidth(0.6);
    const labelHeight = layout.labelSize * 1.2 + 1;
    const w = layout.cellWidth;
    const h = layout.cellHeight;

    layout.pages.forEach((cells, pageIndex) => {
        if (pageIndex > 0) doc.addPage("a4", orientation);

        if (layout.title) {
            doc.setFontSize(9 * MM_TO_PT);
            doc.text(fit(doc, sequence.name, layout.page.width - 24), layout.title.x, layout.title.y, {
                align: "center",
                baseline: "middle",
            });
        }
        if (layout.pageNumber) {
            doc.setFontSize(3.5 * MM_TO_PT);
            doc.text(`${pageIndex + 1}/${layout.pages.length}`, layout.pageNumber.x, layout.pageNumber.y, {
                align: "right",
                baseline: "middle",
            });
        }

        doc.setFontSize(layout.labelSize * MM_TO_PT);
        for (const { index, x, y } of cells) {
            const p = pictograms[index];
            doc.roundedRect(x, y, w, h, 2, 2, "S");
            const box = { w: w - 2 * CELL_PADDING, h: h - 2 * CELL_PADDING - labelHeight };
            const img = images[index];
            if (img) {
                const s = Math.min(box.w / img.width, box.h / img.height);
                const iw = img.width * s;
                const ih = img.height * s;
                doc.addImage(
                    img.data,
                    "PNG",
                    x + CELL_PADDING + (box.w - iw) / 2,
                    y + CELL_PADDING + (box.h - ih) / 2,
                    iw,
                    ih,
                    undefined,
                    "FAST"
                );
            }
            doc.text(fit(doc, p.text, w - 2 * CELL_PADDING), x + w / 2, y + h - CELL_PADDING - labelHeight / 2 + 0.5, {
                align: "center",
                baseline: "middle",
            });
        }
    });
    return doc;
}

export function pdfFileName(name) {
    const safe = name.replace(/[\\/:*?"<>|]+/g, "").trim() || "picto";
    return `${safe}.pdf`;
}

/** Makes the PDF and hands it over: share sheet on phones, download elsewhere. */
export async function savePdf(sequence, options) {
    const doc = await makePdf(sequence, options);
    return shareOrDownload(doc.output("blob"), pdfFileName(sequence.name), sequence.name);
}
