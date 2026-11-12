import { describe, expect, it } from "vitest";
import { formatBytes } from "./formatBytes";

// Spaces are non-breaking; compare with normal ones for readability.
const fmt = (b, l) => formatBytes(b, l).replace(/\u00a0/g, " ");

describe("formatBytes", () => {
    it("never lets a number wrap away from its unit", () => {
        expect(formatBytes(2_340_000, "en")).toBe("2.3\u00a0MB");
        expect(formatBytes(200, "da")).toBe("<\u00a01\u00a0kB");
    });

    it("formats sizes in the UI language", () => {
        expect(fmt(0, "en")).toBe("0 kB");
        expect(fmt(200, "en")).toBe("< 1 kB");
        expect(fmt(32_400, "en")).toBe("32 kB");
        expect(fmt(2_340_000, "en")).toBe("2.3 MB");
        expect(fmt(1_200_000_000, "en")).toBe("1.2 GB");
        expect(fmt(2_340_000, "da")).toBe("2,3 MB");
        expect(fmt(200, "da")).toBe("< 1 kB");
    });
});
