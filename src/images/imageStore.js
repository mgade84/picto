// The user's own images, stored in IndexedDB (localStorage holds only ~5 MB
// and strings). A pictogram refers to one as `img: "local:<id>"`. The images
// never leave the device. Stored as { type, data: ArrayBuffer } rather than
// a Blob, which some older iOS Safari versions couldn't keep in IndexedDB.

const DB_NAME = "picto";
const STORE = "images";
export const LOCAL_PREFIX = "local:";

let dbPromise = null;

function openDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => req.result.createObjectStore(STORE);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        dbPromise.catch(() => {
            dbPromise = null;
        });
    }
    return dbPromise;
}

async function run(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const result = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(result?.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

export function isLocal(img) {
    return typeof img === "string" && img.startsWith(LOCAL_PREFIX);
}

export function localId(img) {
    return img.slice(LOCAL_PREFIX.length);
}

/** Stores a blob and returns the `img` reference for it ("local:<id>"). */
export async function saveImage(blob) {
    // randomUUID needs a secure context (https/localhost), not e.g. a LAN IP.
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const record = { type: blob.type, data: await blob.arrayBuffer() };
    await run("readwrite", store => store.put(record, id));
    // Ask the browser not to evict our data under storage pressure. On iPhone
    // this only really sticks once Picto is added to the Home Screen.
    navigator.storage?.persist?.().catch(() => {});
    return LOCAL_PREFIX + id;
}

/** The stored image for a "local:<id>" reference as a Blob, or undefined. */
export async function loadImage(img) {
    const record = await run("readonly", store => store.get(localId(img)));
    return record ? new Blob([record.data], { type: record.type }) : undefined;
}

/** Deletes stored images that no pictogram refers to any more. */
export async function deleteUnusedImages(usedRefs) {
    const used = new Set([...usedRefs].filter(isLocal).map(localId));
    const ids = await run("readonly", store => store.getAllKeys());
    const unused = (ids ?? []).filter(id => !used.has(id));
    if (unused.length) await run("readwrite", store => unused.forEach(id => store.delete(id)));
    return unused.length;
}
