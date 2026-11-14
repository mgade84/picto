// Hands a file to the user: on phones and tablets through the share sheet
// (save to Files, AirDrop, Messages, mail...), elsewhere as a download.
// Falls back to a download if sharing isn't available or allowed (iOS may
// refuse when the tap was too long ago, e.g. after building a big file).
// Returns "shared", "saved" or "cancelled".

function download(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareOrDownload(blob, fileName, title) {
    const touch = window.matchMedia?.("(pointer: coarse)").matches;
    if (touch && navigator.canShare) {
        const file = new File([blob], fileName, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title });
                return "shared";
            } catch (e) {
                if (e.name === "AbortError") return "cancelled";
                // NotAllowedError and friends: fall through to a download.
            }
        }
    }
    download(blob, fileName);
    return "saved";
}

/** A name that's safe as a file name on every platform. */
export function safeFileName(name, fallback = "picto") {
    return name.replace(/[\\/:*?"<>|]+/g, "").trim() || fallback;
}
