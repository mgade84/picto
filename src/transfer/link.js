// Sharing a sequence as a link: the sequence is compressed into the URL's
// fragment (after "#"), which browsers never send to the server, so the
// sequence only travels through whatever the user sends the link with.
//
//   https://<picto host>/import#s=<base64url(deflate(json))>
//
// Only sequences whose pictures all come from ARASAAC or Wikimedia Commons
// can be shared this way; own images are far too big for a link. Picture
// URLs are shortened ("a:2326" for an ARASAAC pictogram) to keep links short.
// Decoding goes through the same validation as file imports.

import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate";
import { isLocal } from "../images/imageStore";
import { FORMAT, LIMITS, VERSION, parseImport } from "./format";

const PARAM = "s";
const MAX_LINK_DATA = 64 * 1024; // characters of encoded data
const MAX_INFLATED = 1024 * 1024; // bytes after decompressing
/** Above this many pictograms the share dialog warns that the link is long. */
export const LONG_LINK_PICTOGRAMS = 100;

const ARASAAC = /^https:\/\/static\.arasaac\.org\/pictograms\/(\d+)\/\1_500\.png$/;
const COMMONS = /^https:\/\/(upload|thumb)\.wikimedia\.org\/([^?#]+)/;

function shortImg(img) {
    const a = img.match(ARASAAC);
    if (a) return `a:${a[1]}`;
    const w = img.match(COMMONS);
    if (w) return `${w[1] === "upload" ? "w" : "t"}:${w[2]}`;
    return img;
}

function longImg(img) {
    if (typeof img !== "string") return "";
    if (/^a:\d+$/.test(img)) {
        const id = img.slice(2);
        return `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
    }
    if (img.startsWith("w:")) return `https://upload.wikimedia.org/${img.slice(2)}`;
    if (img.startsWith("t:")) return `https://thumb.wikimedia.org/${img.slice(2)}`;
    return img;
}

function toBase64Url(bytes) {
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

/** Whether a sequence can go in a link (no own images). */
export function canShareAsLink(sequence) {
    return !(sequence.pictograms ?? []).some(p => isLocal(p.img));
}

/**
 * Whether and how a sequence can be shared as a link:
 * "ownImages" (never), "tooBig" (the receiver would refuse or cut it),
 * "long" (works, but some apps may cut long links) or "ok".
 */
export function linkStatus(sequence) {
    if (!canShareAsLink(sequence)) return "ownImages";
    const n = sequence.pictograms?.length ?? 0;
    if (n > LIMITS.pictogramsPerCollection) return "tooBig";
    if (encodeSequence(sequence).length - PARAM.length - 1 > MAX_LINK_DATA) return "tooBig";
    return n > LONG_LINK_PICTOGRAMS ? "long" : "ok";
}

/** The fragment ("s=...") for a sequence without own images. */
export function encodeSequence(sequence) {
    const payload = {
        v: 1,
        n: sequence.name,
        p: sequence.pictograms.map(({ img, text, credit }) =>
            credit ? [shortImg(img), text, [credit.author, credit.license, credit.url]] : [shortImg(img), text]
        ),
    };
    return `${PARAM}=${toBase64Url(deflateSync(strToU8(JSON.stringify(payload)), { level: 9 }))}`;
}

export function sequenceLink(sequence, origin = window.location.origin) {
    return `${origin}/import#${encodeSequence(sequence)}`;
}

/**
 * Decodes a fragment back into a validated sequence ({ name, pictograms },
 * plus `skipped`), or returns null if it isn't a usable Picto link.
 */
export function decodeSequence(hash) {
    const data = new URLSearchParams(hash.replace(/^#/, "")).get(PARAM);
    if (!data || data.length > MAX_LINK_DATA) return null;
    try {
        const inflated = inflateSync(fromBase64Url(data), { out: undefined });
        if (inflated.length > MAX_INFLATED) return null;
        const payload = JSON.parse(strFromU8(inflated));
        if (payload?.v !== 1 || !Array.isArray(payload.p)) return null;
        // Re-expressed as a Picto file so it passes the same validation.
        const parsed = parseImport(
            JSON.stringify({
                format: FORMAT,
                version: VERSION,
                kind: "sequence",
                collections: [
                    {
                        name: payload.n,
                        pictograms: payload.p.map(([img, text, credit]) => ({
                            img: longImg(img),
                            text,
                            ...(Array.isArray(credit) && {
                                credit: { author: credit[0], license: credit[1], url: credit[2] },
                            }),
                        })),
                    },
                ],
            })
        );
        // Links never carry own images.
        if (parsed.images.size > 0) return null;
        return { ...parsed.collections[0], skipped: parsed.skipped };
    } catch {
        return null;
    }
}
