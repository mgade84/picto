import { useEffect, useState } from "react";

// Wikimedia Commons: a large library of freely licensed photos and
// drawings. Its API needs no key and allows browser requests (origin=*), and
// its thumbnails are served with CORS, so they work in the PDF too.
const API = "https://commons.wikimedia.org/w/api.php";
// Commons only serves thumbnails in standard widths (330, 500, 960, ...);
// other widths are refused with 400. The API is asked for the card size and
// the grid swaps in the smaller standard width.
const CARD = 960; // stored on the card; sharp enough for print
const THUMB = 330; // search grid

function stripHtml(html = "") {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
}

// Thumbnail URLs contain the width (".../960px-Name.jpg?utm_..."). For
// originals smaller than CARD the API returns the original, which has no
// width part and is kept as it is.
function withWidth(url, from, to) {
    return url.replace(`/${from}px-`, `/${to}px-`);
}

export function toCommonsIcon(page, query) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return null;
    const meta = info.extmetadata ?? {};
    return {
        id: `commons:${page.pageid}`,
        thumb: withWidth(info.thumburl, CARD, THUMB),
        img: info.thumburl,
        text: query,
        title: page.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""),
        credit: {
            author: stripHtml(meta.Artist?.value) || "Unknown",
            license: stripHtml(meta.LicenseShortName?.value) || "",
            url: info.descriptionurl,
        },
    };
}

export function commonsSearchUrl(query) {
    const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        generator: "search",
        gsrnamespace: "6", // files
        gsrsearch: `${query} filetype:bitmap|drawing`,
        gsrlimit: "30",
        prop: "imageinfo",
        iiprop: "url|extmetadata",
        iiextmetadatafilter: "Artist|LicenseShortName",
        iiurlwidth: String(CARD),
    });
    return `${API}?${params}`;
}

async function search(query, signal) {
    const res = await fetch(commonsSearchUrl(query), { signal });
    if (!res.ok) throw new Error(`Wikimedia Commons returned ${res.status}`);
    const data = await res.json();
    const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    return pages.map(p => toCommonsIcon(p, query)).filter(Boolean);
}

/** Like useArasaacSearch, for photos on Wikimedia Commons. */
export default function useCommonsSearch(query) {
    const q = query.trim();
    const [result, setResult] = useState({ key: null });

    useEffect(() => {
        if (!q) return;
        const controller = new AbortController();
        search(q, controller.signal)
            .then(icons => setResult({ key: q, icons, error: null }))
            .catch(e => {
                if (e.name !== "AbortError") setResult({ key: q, icons: null, error: e.message });
            });
        return () => controller.abort();
    }, [q]);

    if (!q) return { loading: false, icons: null, error: null };
    if (result.key !== q) return { loading: true, icons: null, error: null };
    return { loading: false, icons: result.icons, error: result.error };
}
