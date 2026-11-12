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

// Tries each locale in turn and returns the first non-empty result.
async function searchFirst(q, locales, signal) {
    for (const locale of locales) {
        const icons = await search(q, locale, signal);
        if (icons.length > 0) return { icons, locale };
    }
    return { icons: [], locale: null };
}

/**
 * Searches ARASAAC pictograms, trying `locales` in order until one has
 * matches. The API is public and CORS-enabled, so this runs directly from
 * the browser. `icons` is null when there is no query; `locale` is the
 * locale the results came from.
 */
export default function useArasaacSearch(query, locales = ["en"]) {
    const q = query.trim();
    const localeList = locales.join(",");
    const key = q ? `${localeList}:${q}` : null;
    // Holds the outcome of the last finished request, tagged with its key so
    // loading state is derived rather than set synchronously in the effect.
    const [result, setResult] = useState({ key: null });

    useEffect(() => {
        if (!key) return;
        const controller = new AbortController();
        searchFirst(q, localeList.split(","), controller.signal)
            .then(({ icons, locale }) => setResult({ key, icons, locale, error: null }))
            .catch(e => {
                if (e.name !== "AbortError") {
                    setResult({ key, icons: null, locale: null, error: e.message });
                }
            });
        return () => controller.abort();
    }, [key, q, localeList]);

    const empty = { icons: null, locale: null, error: null };
    if (!key) return { loading: false, ...empty };
    if (result.key !== key) return { loading: true, ...empty };
    return { loading: false, icons: result.icons, locale: result.locale, error: result.error };
}
