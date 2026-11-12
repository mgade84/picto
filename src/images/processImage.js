// Turns a photo from the camera or photo library into a small JPEG for a
// pictogram card: the part the user framed in the cropper (or a centred
// square), or the whole image on white, with the longest side at most
// MAX_SIZE px. Browsers apply the photo's EXIF rotation when decoding, both
// here and in the cropper, so the crop area and the pixels line up.

export const MAX_SIZE = 800;
const QUALITY = 0.85;

function decode(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => resolve({ img, url });
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("unsupported image"));
        };
        img.src = url;
    });
}

// Keeps a crop rectangle (in image pixels) inside the image.
function clampArea(area, w, h) {
    const x = Math.max(0, Math.min(area.x, w - 1));
    const y = Math.max(0, Math.min(area.y, h - 1));
    return {
        x,
        y,
        w: Math.max(1, Math.min(area.width, w - x)),
        h: Math.max(1, Math.min(area.height, h - y)),
    };
}

/**
 * @param {File|Blob} file
 * @param {{ crop: boolean, area?: { x, y, width, height } }} options
 *   crop: use `area` (image pixels, from the cropper), or a centred square
 *   if there's none; otherwise the whole image, scaled down.
 * @returns {Promise<Blob>} a JPEG
 */
export async function processImage(file, { crop, area }) {
    const { img, url } = await decode(file);
    try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const side = Math.min(w, h);
        let src = { x: 0, y: 0, w, h };
        if (crop) {
            src = area ? clampArea(area, w, h) : { x: (w - side) / 2, y: (h - side) / 2, w: side, h: side };
        }
        // Never upscale: a small crop of a big photo stays its real size.
        const scale = Math.min(1, MAX_SIZE / Math.max(src.w, src.h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(src.w * scale));
        canvas.height = Math.max(1, Math.round(src.h * scale));
        const ctx = canvas.getContext("2d");
        // JPEG has no transparency: drawings with a transparent background
        // get white, like the cards.
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, canvas.width, canvas.height);
        return await new Promise((resolve, reject) =>
            canvas.toBlob(b => (b ? resolve(b) : reject(new Error("encoding failed"))), "image/jpeg", QUALITY)
        );
    } finally {
        URL.revokeObjectURL(url);
    }
}
