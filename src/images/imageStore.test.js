import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { deleteUnusedImages, isLocal, loadImage, saveImage } from "./imageStore";

describe("imageStore", () => {
    it("saves, loads and garbage-collects images", async () => {
        const kept = await saveImage(new Blob(["kept"]));
        const dropped = await saveImage(new Blob(["dropped"]));
        expect(isLocal(kept)).toBe(true);
        expect(isLocal("https://example.com/a.png")).toBe(false);
        expect(await (await loadImage(kept)).text()).toBe("kept");

        const removed = await deleteUnusedImages([kept, "https://example.com/a.png"]);
        expect(removed).toBe(1);
        expect(await loadImage(dropped)).toBeUndefined();
        expect(await (await loadImage(kept)).text()).toBe("kept");
    });
});
