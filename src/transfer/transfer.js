// Glue between the file format and the app: exporting through the share
// sheet or a download, and applying a validated import (own images saved
// to IndexedDB under new ids, references remapped, sequences added).

import { saveImage } from "../images/imageStore";
import { safeFileName, shareOrDownload } from "../share/shareFile";
import { AppVersion } from "../SiteMap";
import { ImportError, buildExport, parseImport } from "./format";

function jsonBlob(data) {
    return new Blob([JSON.stringify(data)], { type: "application/json" });
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

/** All sequences and their own images (not settings) as one file. */
export async function exportBackup(collections) {
    const data = await buildExport(collections, { kind: "backup", appVersion: AppVersion });
    return shareOrDownload(jsonBlob(data), `picto-backup-${today()}.json`, "Picto backup");
}

/** One sequence, with its own images, for someone else's Picto. */
export async function exportSequence(sequence) {
    const data = await buildExport([sequence], { kind: "sequence", appVersion: AppVersion });
    return shareOrDownload(jsonBlob(data), `${safeFileName(sequence.name)}.picto.json`, sequence.name);
}

/** Reads and validates a chosen file (throws ImportError). */
export async function readImportFile(file) {
    let text;
    try {
        text = await file.text();
    } catch {
        throw new ImportError("read");
    }
    return parseImport(text);
}

/**
 * Saves a parsed import's own images under new ids, then adds (or, with
 * `replace`, swaps in) its sequences. Returns the new sequences' ids.
 */
export async function applyImport(parsed, importCollections, { replace = false } = {}) {
    const refs = new Map();
    for (const [oldRef, blob] of parsed.images) refs.set(oldRef, await saveImage(blob));
    const collections = parsed.collections.map(c => ({
        name: c.name,
        pictograms: c.pictograms.map(p => ({ ...p, img: refs.get(p.img) ?? p.img })),
    }));
    return importCollections(collections, { replace });
}
