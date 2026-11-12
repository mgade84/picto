import { useEffect, useState } from "react";

export const ARASAAC_API = "https://api.arasaac.org/v1";
export const ARASAAC_STATIC = "https://static.arasaac.org/pictograms";

export function pictogramImageUrl(id, resolution = 500) {
    return `${ARASAAC_STATIC}/${id}/${id}_${resolution}.png`;
}

// Converts an ARASAAC search result into the shape used by the app.
export function toIcon(result, fallbackText = "") {
    const id = result._id;
    return {
        id,
        img: pictogramImageUrl(id),
        thumb: pictogramImageUrl(id, 300),
        text: result.keywords?.[0]?.keyword ?? fallbackText,
    };
}

async function search(q, locale, signal) {
    const url = `${ARASAAC_API}/pictograms/${locale}/search/${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal });
    // ARASAAC answers 404 with an empty array when nothing matches.
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`ARASAAC returned ${res.status}`);
    const results = await res.json();
    return results.map(r => toIcon(r, q));
}

/**
 * Searches ARASAAC pictograms. The API is public and CORS-enabled, so this
 * runs directly from the browser. `icons` is null when there is no query.
 */
export default function useArasaacSearch(query, locale = "en") {
    const q = query.trim();
    const key = q ? `${locale}:${q}` : null;
    // Holds the outcome of the last finished request, tagged with its key so
    // loading state is derived rather than set synchronously in the effect.
    const [result, setResult] = useState({ key: null, icons: null, error: null });

    useEffect(() => {
        if (!key) return;
        const controller = new AbortController();
        search(q, locale, controller.signal)
            .then(icons => setResult({ key, icons, error: null }))
            .catch(e => {
                if (e.name !== "AbortError") {
                    setResult({ key, icons: null, error: e.message });
                }
            });
        return () => controller.abort();
    }, [key, q, locale]);

    if (!key) return { loading: false, icons: null, error: null };
    if (result.key !== key) return { loading: true, icons: null, error: null };
    return { loading: false, icons: result.icons, error: result.error };
}
