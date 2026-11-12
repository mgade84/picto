import { useEffect, useState } from "react";
import { isLocal, loadImage } from "./imageStore";

// One object URL per stored image for the whole session, shared by every
// card, thumbnail and print sheet that shows it.
const urls = new Map();

export async function resolveImageSrc(img) {
    if (!isLocal(img)) return img;
    if (!urls.has(img)) {
        urls.set(
            img,
            loadImage(img).then(blob => (blob ? URL.createObjectURL(blob) : null))
        );
    }
    return urls.get(img);
}

/**
 * The `src` to show for a pictogram's `img`: a web URL as is, or an object
 * URL for one of the user's own images ("local:<id>"), which loads
 * asynchronously (undefined until then, null if it's missing).
 */
export default function useImageSrc(img) {
    const local = isLocal(img);
    const [resolved, setResolved] = useState({ img: null, src: undefined });

    useEffect(() => {
        if (!local) return;
        let current = true;
        resolveImageSrc(img)
            .then(src => current && setResolved({ img, src }))
            .catch(() => current && setResolved({ img, src: null }));
        return () => {
            current = false;
        };
    }, [img, local]);

    if (!local) return img;
    return resolved.img === img ? resolved.src : undefined;
}
