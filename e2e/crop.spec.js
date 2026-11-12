import { expect, test } from "@playwright/test";
import { imageSize, landscapePhoto, openSeededSequence, storedTexts } from "./helpers";

// The test photo is 1200x600: red left half, blue right half. The colours of
// the stored image's left and right edges show which part was cropped.

async function openCropper(page, browser) {
    await openSeededSequence(page);
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Own image" }).click();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    const frame = page.getByTestId("own-image-frame");
    await expect(frame.locator("img")).toBeVisible();
    return frame;
}

async function addAs(page, label) {
    await page.getByRole("textbox", { name: "Label" }).fill(label);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect.poll(() => storedTexts(page)).toContain(label);
    return page.getByRole("img", { name: label });
}

// "red" / "blue" / "mixed" for a vertical strip of the image at x (0..1).
async function colours(img) {
    await imageSize(img);
    return img.evaluate(el => {
        const c = document.createElement("canvas");
        c.width = el.naturalWidth;
        c.height = el.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(el, 0, 0);
        const at = fx => {
            const [r, , b] = ctx.getImageData(Math.floor(fx * (c.width - 1)), Math.floor(c.height / 2), 1, 1).data;
            return r > 150 && b < 100 ? "red" : b > 150 && r < 100 ? "blue" : "mixed";
        };
        return [at(0.05), at(0.95)];
    });
}

test("the default crop is the centred square", async ({ page, browser }) => {
    await openCropper(page, browser);
    const card = await addAs(page, "centre");
    expect(await imageSize(card)).toEqual([600, 600]);
    expect(await colours(card)).toEqual(["red", "blue"]);
});

test("zooming in with the slider crops a smaller area, without upscaling", async ({ page, browser }) => {
    await openCropper(page, browser);
    const zoom = page.getByRole("slider", { name: "Zoom" });
    await zoom.focus();
    for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowRight"); // 20 x 0.05
    await expect(zoom).toHaveValue("2");
    const card = await addAs(page, "zoomed");
    expect(await imageSize(card)).toEqual([300, 300]); // half of 600, not scaled up
    expect(await colours(card)).toEqual(["red", "blue"]); // still centred
});

test("keeping the whole image ignores the crop", async ({ page, browser }) => {
    await openCropper(page, browser);
    await page.getByRole("switch", { name: "Crop to a square" }).click();
    await expect(page.getByRole("slider", { name: "Zoom" })).toHaveCount(0);
    const card = await addAs(page, "whole");
    expect(await imageSize(card)).toEqual([800, 400]);
});

test("dragging the image with the mouse moves the crop", async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "mouse");
    const frame = await openCropper(page, browser);
    const box = await frame.boundingBox();
    const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    // Drag the image right: the frame then shows its left (red) part.
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + box.width, c.y, { steps: 10 });
    await page.mouse.up();
    const card = await addAs(page, "left");
    expect(await colours(card)).toEqual(["red", "red"]);
});

test("one finger drags and two fingers pinch-zoom on a touch screen", async ({ page, browser }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "raw touch events need Chromium's DevTools Protocol");
    const frame = await openCropper(page, browser);
    const box = await frame.boundingBox();
    const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const cdp = await page.context().newCDPSession(page);
    const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    const steps = async (from, to, make) => {
        for (let i = 1; i <= 10; i++) {
            await touch("touchMove", make(from + ((to - from) * i) / 10));
            await page.waitForTimeout(16);
        }
    };

    // Pinch out from 20px to 140px apart: zoom in.
    await touch("touchStart", [{ x: c.x - 10, y: c.y, id: 1 }, { x: c.x + 10, y: c.y, id: 2 }]);
    await steps(10, 70, d => [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }]);
    await touch("touchEnd", []);
    await expect.poll(async () => Number(await page.getByRole("slider", { name: "Zoom" }).inputValue())).toBeGreaterThan(1.5);

    // Drag left with one finger: the frame moves over the right (blue) part.
    await touch("touchStart", [{ x: c.x, y: c.y, id: 1 }]);
    await steps(0, box.width, d => [{ x: c.x - d, y: c.y, id: 1 }]);
    await touch("touchEnd", []);

    const card = await addAs(page, "pinched");
    const [w] = await imageSize(card);
    expect(w).toBeLessThan(600); // zoomed in: a smaller part of the photo
    expect(await colours(card)).toEqual(["blue", "blue"]);
});
