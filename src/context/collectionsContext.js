import { createContext, useContext } from "react";

// localStorage keys. STORAGE_KEY holds { collections: [{ id, name, pictograms }] }
// where each pictogram is { id, img, text }. LEGACY_KEY is the single-sequence
// format used up to v0.2 ({ pictograms: [...] }); it is migrated on first load
// and left in place untouched.
export const STORAGE_KEY = "collections";
export const LEGACY_KEY = "pictograms";

export const CollectionsContext = createContext(null);

/**
 * All sequences plus the operations on them. Must be used inside
 * <CollectionsProvider>.
 */
export function useCollections() {
    const ctx = useContext(CollectionsContext);
    if (!ctx) throw new Error("useCollections must be used inside <CollectionsProvider>");
    return ctx;
}

/** First default name (e.g. "Sequence N") not already taken. */
export function nextSequenceName(collections, nameFor) {
    const used = new Set(collections.map(c => c.name));
    let n = collections.length + 1;
    while (used.has(nameFor(n))) n++;
    return nameFor(n);
}
