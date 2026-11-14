// The Picto file format, used for full backups and for sharing a single
// sequence. JSON, with the user's own images embedded as base64:
//
//   {
//     "format": "picto", "version": 1,
//     "kind": "backup" | "sequence",
//     "exported": "2026-11-12T20:00:00.000Z", "app": "1.0.0",
//     "collections": [{ "name": "...", "pictograms": [{ "img", "text", "credit"? }] }],
//     "images": { "<local id>": { "type": "image/jpeg", "data": "<base64>" } }
//   }
//
// Settings are deliberately not included. Imports are validated strictly
// (they may come from anyone): unknown formats are refused, pictures from
// unknown hosts are dropped and counted, embedded images must really be
// images (checked by their bytes), and everything has size limits.

import { isLocal, loadImage, localId } from "../images/imageStore";

export const FORMAT = "picto";
export const VERSION = 1;

export const LIMITS = {
    fileBytes: 200 * 1024 * 1024,
    imageBytes: 10 * 1024 * 1024,
    collections: 1000,
    pictogramsPerCollection: 1000,
    textLength: 200,
};

// Where a pictogram's picture may come from (same as the app's CSP img-src).
export const ALLOWED_IMAGE_HOSTS = ["static.arasaac.org", "upload.wikimedia.org", "thumb.wikimedia.org"];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class ImportError extends Error {
    constructor(code) {
        super(code);
        this.code = code; // translated by the UI: import.error.<code>
    }
}

// --- base64 -----------------------------------------------------------------

export function bytesToBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

export function base64ToBytes(text) {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

// --- export -----------------------------------------------------------------

/**
 * Builds the file contents for some collections. Own images ("local:" refs)
 * are read from IndexedDB and embedded; ones that have gone missing are
 * left out (their pictograms are then dropped on import).
 */
export async function buildExport(collections, { kind, appVersion }) {
    const images = {};
    for (const c of collections) {
        for (const p of c.pictograms ?? []) {
            if (!isLocal(p.img) || images[localId(p.img)]) continue;
            const blob = await loadImage(p.img);
            if (!blob) continue;
            images[localId(p.img)] = {
                type: blob.type || "image/jpeg",
                data: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
            };
        }
    }
    return {
        format: FORMAT,
        version: VERSION,
        kind,
        exported: new Date().toISOString(),
        app: appVersion,
        collections: collections.map(c => ({
            name: c.name,
            pictograms: (c.pictograms ?? []).map(({ img, text, credit }) => ({
                img,
                text,
                ...(credit && { credit }),
            })),
        })),
        images,
    };
}

// --- import -----------------------------------------------------------------

// Image type from the first bytes, not from what the file claims.
export function sniffImageType(bytes) {
    const b = bytes;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
    if (
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    ) {
        return "image/webp";
    }
    return null;
}

function isAllowedRemoteImage(img) {
    try {
        const url = new URL(img);
        return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(url.hostname);
    } catch {
        return false;
    }
}

const text = (value, max = LIMITS.textLength) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

function cleanCredit(credit) {
    if (!credit || typeof credit !== "object") return undefined;
    const url = text(credit.url, 500);
    let safeUrl = "";
    try {
        const u = new URL(url);
        if (u.protocol === "https:" && u.hostname === "commons.wikimedia.org") safeUrl = u.href;
    } catch {
        // not a URL: dropped
    }
    return { author: text(credit.author) || "Unknown", license: text(credit.license), url: safeUrl };
}

/**
 * Parses and validates a Picto file. Returns
 *   { kind, exported, collections: [{ name, pictograms: [{ img, text, credit? }] }],
 *     images: Map<"local:<id>", Blob>, skipped }
 * where `skipped` counts pictograms left out (unknown picture source, or a
 * missing or invalid embedded image). Throws ImportError on anything that
 * isn't a usable Picto file.
 */
export function parseImport(textContent) {
    if (typeof textContent !== "string" || textContent.length > LIMITS.fileBytes * 1.4) {
        throw new ImportError("tooBig");
    }
    let data;
    try {
        data = JSON.parse(textContent);
    } catch {
        throw new ImportError("notPicto");
    }
    if (!data || data.format !== FORMAT || !Array.isArray(data.collections)) throw new ImportError("notPicto");
    if (!Number.isInteger(data.version) || data.version > VERSION) throw new ImportError("newerVersion");
    if (data.collections.length > LIMITS.collections) throw new ImportError("tooBig");

    // Embedded images: decode and verify each one.
    const images = new Map();
    const rawImages = data.images && typeof data.images === "object" ? data.images : {};
    for (const [id, image] of Object.entries(rawImages)) {
        if (!/^[\w-]{1,100}$/.test(id) || typeof image?.data !== "string") continue;
        let bytes;
        try {
            bytes = base64ToBytes(image.data);
        } catch {
            continue;
        }
        const type = sniffImageType(bytes);
        if (!type || !IMAGE_TYPES.includes(type) || bytes.length > LIMITS.imageBytes) continue;
        images.set(`local:${id}`, new Blob([bytes], { type }));
    }

    let skipped = 0;
    const collections = data.collections.map(c => {
        const pictograms = [];
        for (const p of Array.isArray(c?.pictograms) ? c.pictograms.slice(0, LIMITS.pictogramsPerCollection) : []) {
            const img = typeof p?.img === "string" ? p.img : "";
            const ok = isLocal(img) ? images.has(img) : isAllowedRemoteImage(img);
            if (!ok) {
                skipped++;
                continue;
            }
            const credit = cleanCredit(p.credit);
            pictograms.push({ img, text: text(p.text), ...(credit && { credit }) });
        }
        return { name: text(c?.name) || "Picto", pictograms };
    });

    return {
        kind: data.kind === "sequence" ? "sequence" : "backup",
        exported: typeof data.exported === "string" ? data.exported : null,
        collections,
        images,
        skipped,
    };
}

/** Counts for the import preview. */
export function summarize(parsed) {
    return {
        sequences: parsed.collections.length,
        pictograms: parsed.collections.reduce((n, c) => n + c.pictograms.length, 0),
        images: parsed.images.size,
        skipped: parsed.skipped,
    };
}

/** "Morgen" → "Morgen (2)" etc., so imported names don't clash. */
export function uniqueName(name, taken) {
    if (!taken.has(name)) return name;
    let n = 2;
    while (taken.has(`${name} (${n})`)) n++;
    return `${name} (${n})`;
}
