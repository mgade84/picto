import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { saveImage } from "../images/imageStore";
import { ImportError, buildExport, parseImport, sniffImageType, summarize, uniqueName } from "./format";
import { canShareAsLink, decodeSequence, encodeSequence, linkStatus, sequenceLink } from "./link";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ara = id => `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;
const commons = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dog.jpg/960px-Dog.jpg?utm_source=x";

const errorCode = fn => {
    try {
        fn();
    } catch (e) {
        return e instanceof ImportError ? e.code : `unexpected: ${e}`;
    }
    return "no error";
};

describe("file format", () => {
    it("round-trips sequences, credits and own images", async () => {
        const own = await saveImage(new Blob([JPEG], { type: "image/jpeg" }));
        const collections = [
            {
                id: "c1",
                name: "Morgen",
                pictograms: [
                    { id: "p1", img: ara(2326), text: "børste tænder" },
                    { id: "p2", img: commons, text: "hund", credit: { author: "Ann", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Dog.jpg" } },
                    { id: "p3", img: own, text: "køkken" },
                ],
            },
        ];
        const file = await buildExport(collections, { kind: "backup", appVersion: "1.0.0" });
        expect(file).toMatchObject({ format: "picto", version: 1, kind: "backup", app: "1.0.0" });
        // Internal ids aren't exported; settings never are.
        expect(JSON.stringify(file)).not.toMatch(/"id":"(c1|p1)"/);
        expect(Object.keys(file.images)).toHaveLength(1);

        const parsed = parseImport(JSON.stringify(file));
        expect(summarize(parsed)).toEqual({ sequences: 1, pictograms: 3, images: 1, skipped: 0 });
        expect(parsed.collections[0].pictograms.map(p => p.text)).toEqual(["børste tænder", "hund", "køkken"]);
        expect(parsed.collections[0].pictograms[1].credit.author).toBe("Ann");
        const blob = parsed.images.get(own);
        expect(blob.type).toBe("image/jpeg");
        expect(new Uint8Array(await blob.arrayBuffer())).toEqual(JPEG);
    });

    it("refuses files that aren't Picto files", () => {
        expect(errorCode(() => parseImport("not json"))).toBe("notPicto");
        expect(errorCode(() => parseImport(JSON.stringify({ format: "other", collections: [] })))).toBe("notPicto");
        expect(errorCode(() => parseImport(JSON.stringify({ format: "picto", version: 1 })))).toBe("notPicto");
        expect(errorCode(() => parseImport(JSON.stringify({ format: "picto", version: 99, collections: [] })))).toBe("newerVersion");
    });

    it("drops pictures from unknown sources and fake images, and counts them", () => {
        const file = {
            format: "picto",
            version: 1,
            collections: [
                {
                    name: "Mix",
                    pictograms: [
                        { img: ara(1), text: "ok" },
                        { img: "https://tracker.example.com/pixel.png", text: "tracking" },
                        { img: "http://static.arasaac.org/pictograms/1/1_500.png", text: "not https" },
                        { img: "javascript:alert(1)", text: "script" },
                        { img: "local:fake", text: "not an image" },
                        { img: "local:png", text: "real png" },
                        { img: "local:missing", text: "missing" },
                    ],
                },
            ],
            images: {
                fake: { type: "image/jpeg", data: btoa("<script>alert(1)</script>") },
                png: { type: "image/jpeg", data: btoa(String.fromCharCode(...PNG)) },
            },
        };
        const parsed = parseImport(JSON.stringify(file));
        expect(parsed.collections[0].pictograms.map(p => p.text)).toEqual(["ok", "real png"]);
        expect(parsed.skipped).toBe(5);
        // The type comes from the bytes, not the claim.
        expect(parsed.images.get("local:png").type).toBe("image/png");
    });

    it("cleans up texts and credits", () => {
        const parsed = parseImport(
            JSON.stringify({
                format: "picto",
                version: 1,
                collections: [
                    {
                        name: "  " + "x".repeat(500),
                        pictograms: [{ img: ara(1), text: 42, credit: { author: "A", url: "https://evil.example.com/" } }],
                    },
                ],
            })
        );
        expect(parsed.collections[0].name).toHaveLength(200);
        expect(parsed.collections[0].pictograms[0]).toMatchObject({ text: "", credit: { author: "A", url: "" } });
    });

    it("detects image types from their bytes", () => {
        expect(sniffImageType(JPEG)).toBe("image/jpeg");
        expect(sniffImageType(PNG)).toBe("image/png");
        expect(sniffImageType(new TextEncoder().encode("GIF89a..."))).toBe("image/gif");
        expect(sniffImageType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("image/webp");
        expect(sniffImageType(new TextEncoder().encode("<svg>"))).toBeNull();
    });

    it("gives imported sequences names that don't clash", () => {
        const taken = new Set(["Morgen", "Morgen (2)"]);
        expect(uniqueName("Morgen", taken)).toBe("Morgen (3)");
        expect(uniqueName("Aften", taken)).toBe("Aften");
    });
});

describe("links", () => {
    it("rates how well a sequence fits in a link", () => {
        const seq = (n, text = i => `step ${i}`) => ({
            name: "S",
            pictograms: Array.from({ length: n }, (_, i) => ({ img: ara(10 + i), text: text(i) })),
        });
        expect(linkStatus(seq(100))).toBe("ok");
        expect(linkStatus(seq(101))).toBe("long");
        expect(linkStatus(seq(1000))).toBe("long");
        expect(linkStatus(seq(1001))).toBe("tooBig");
        expect(linkStatus({ name: "S", pictograms: [{ img: "local:x", text: "room" }] })).toBe("ownImages");
        // Under 1000 pictograms, but long random labels don't compress below 64 KB.
        let seed = 1;
        const rand = () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return (seed >>> 0) / 2 ** 32;
        };
        const noise = () => Array.from({ length: 200 }, () => String.fromCharCode(33 + Math.floor(rand() * 90))).join("");
        expect(linkStatus(seq(900, noise))).toBe("tooBig");
    });

    const sequence = {
        name: "Morgenrutine",
        pictograms: [
            ...Array.from({ length: 20 }, (_, i) => ({ id: `p${i}`, img: ara(2000 + i), text: `trin ${i + 1}` })),
            { id: "w", img: commons, text: "hund", credit: { author: "Ann", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Dog.jpg" } },
        ],
    };

    it("round-trips a sequence through a short link", () => {
        const link = sequenceLink(sequence, "https://picto.example");
        expect(link).toMatch(/^https:\/\/picto\.example\/import#s=[\w-]+$/);
        expect(link.length).toBeLessThan(800); // fine for SMS and chat apps

        const decoded = decodeSequence(new URL(link).hash);
        expect(decoded.name).toBe("Morgenrutine");
        expect(decoded.skipped).toBe(0);
        expect(decoded.pictograms).toHaveLength(21);
        expect(decoded.pictograms[0]).toEqual({ img: ara(2000), text: "trin 1" });
        // Commons URLs lose only their tracking query.
        expect(decoded.pictograms[20]).toMatchObject({
            img: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dog.jpg/960px-Dog.jpg",
            credit: { author: "Ann", license: "CC0" },
        });
    });

    it("can't carry own images", () => {
        expect(canShareAsLink(sequence)).toBe(true);
        expect(canShareAsLink({ pictograms: [{ img: "local:abc" }] })).toBe(false);
    });

    it("rejects broken or foreign links", () => {
        expect(decodeSequence("")).toBeNull();
        expect(decodeSequence("#s=not-valid-data")).toBeNull();
        expect(decodeSequence("#other=1")).toBeNull();
        // A forged link with a tracking picture: validated like a file.
        const forged = encodeSequence({ name: "x", pictograms: [{ img: "https://evil.example.com/t.png", text: "t" }] });
        expect(decodeSequence(`#${forged}`)).toMatchObject({ pictograms: [], skipped: 1 });
    });
});
