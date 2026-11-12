import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { imageSize, landscapePhoto, openSeededSequence, stubCommons } from "./helpers";

// Inflates every Flate stream so text drawn in compressed content streams
// can be searched too.
function inflateStreams(buffer) {
    const raw = buffer.toString("latin1");
    const out = [];
    for (const m of raw.matchAll(/stream\r?\n/g)) {
        const start = m.index + m[0].length;
        const end = raw.indexOf("endstream", start);
        try {
            out.push(inflateSync(buffer.subarray(start, end)).toString("latin1"));
        } catch {
            // Not Flate-compressed (or an image's raw bytes): skip.
        }
    }
    return out.join("\n");
}

// Facts about a PDF, read with regexes: page count, first page's MediaBox
// (in points), number of embedded images, all text including inflated
// content streams, and file size.
function inspectPdf(buffer) {
    const text = buffer.toString("latin1") + inflateStreams(buffer);
    const box = text.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    return {
        pages: (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length,
        width: Math.round(Number(box[3])),
        height: Math.round(Number(box[4])),
        // Colour images only: each PNG with transparency also gets a
        // DeviceGray soft-mask image.
        images: (text.match(/\/Subtype\s*\/Image[^>]*?\/ColorSpace\s*\/DeviceRGB/gs) ?? []).length,
        text,
        bytes: buffer.length,
    };
}

const A4_PT = { long: 842, short: 595 };

test.beforeEach(async ({ page }) => {
    await openSeededSequence(page);
    await page.goto("/sequence/s1/print");
    await expect(page.getByRole("img", { name: "Page 1 of 1" })).toBeVisible();
});

for (const orientation of ["landscape", "portrait"]) {
    test(`Save PDF gives one ${orientation} A4 page with every pictogram`, async ({ page }, testInfo) => {
        if (orientation === "portrait") await page.getByRole("button", { name: "Portrait" }).click();
        const downloading = page.waitForEvent("download");
        await page.getByRole("button", { name: "Save PDF" }).click();
        const download = await downloading;
        expect(download.suggestedFilename()).toBe("Morning.pdf");

        const file = testInfo.outputPath("out.pdf");
        await download.saveAs(file);
        const pdf = inspectPdf(await readFile(file));
        expect(pdf.pages).toBe(1);
        expect([pdf.width, pdf.height]).toEqual(
            orientation === "landscape" ? [A4_PT.long, A4_PT.short] : [A4_PT.short, A4_PT.long]
        );
        expect(pdf.images).toBe(3);
        // Images are compressed, so the file stays small enough to share from a phone.
        expect(pdf.bytes).toBeLessThan(200_000);
        for (const label of ["Morning", "wake up", "eat", "school"]) expect(pdf.text).toContain(`(${label})`);
    });
}

test("printing gives one page in the chosen orientation, without the app's chrome", async ({ page }) => {
    for (const [orientation, size] of [
        ["landscape", [A4_PT.long, A4_PT.short]],
        ["portrait", [A4_PT.short, A4_PT.long]],
    ]) {
        await page.getByRole("button", { name: orientation === "landscape" ? "Landscape" : "Portrait" }).click();
        await page.emulateMedia({ media: "print" });
        await expect(page.getByRole("button", { name: "Save PDF" })).toBeHidden();
        await expect(page.getByRole("banner")).toBeHidden();
        const pdf = inspectPdf(await page.pdf({ preferCSSPageSize: true }));
        expect(pdf.pages).toBe(1);
        expect([pdf.width, pdf.height]).toEqual(size);
        await page.emulateMedia({ media: "screen" });
    }
});

test("on a touch device the PDF goes to the share sheet", async ({ browser }) => {
    const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 412, height: 839 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
        navigator.canShare = () => true;
        navigator.share = async ({ files }) => {
            window.__shared = { name: files[0].name, type: files[0].type, size: files[0].size };
        };
    });
    await openSeededSequence(page);
    await page.goto("/sequence/s1/print");
    await page.getByRole("button", { name: "Save PDF" }).tap();
    await expect.poll(() => page.evaluate(() => window.__shared)).toMatchObject({
        name: "Morning.pdf",
        type: "application/pdf",
    });
    await context.close();
});

test("the whole page fits on a desktop screen in both orientations", async ({ page }) => {
    const viewport = page.viewportSize();
    for (const orientation of ["Landscape", "Portrait"]) {
        await page.getByRole("button", { name: orientation }).click();
        const sheet = await page.getByRole("img", { name: "Page 1 of 1" }).boundingBox();
        expect(sheet.y + sheet.height, `${orientation} page runs off the bottom`).toBeLessThanOrEqual(viewport.height);
        expect(sheet.x + sheet.width).toBeLessThanOrEqual(viewport.width);
    }
});

test("one pictogram across spreads the sequence over several pages, in print and PDF", async ({ page }, testInfo) => {
    // 3 pictograms, 1 across on landscape: one big pictogram per page.
    await page.getByRole("button", { name: "Fewer per row" }).click();
    await page.getByRole("button", { name: "Fewer per row" }).click();
    await expect(page.getByTestId("per-line-value")).toHaveText("1");
    await expect(page.getByRole("region", { name: "Print preview" })).toHaveAttribute("data-pages", "3");
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 of 3");

    // Arrow buttons and keys move between pages.
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 2 of 3");
    await expect(page.getByRole("img", { name: "Page 2 of 3" })).toBeInViewport({ ratio: 0.9 });
    await page.getByRole("region", { name: "Print preview" }).press("ArrowRight");
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 3 of 3");
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();

    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).click();
    const file = testInfo.outputPath("pages.pdf");
    await (await downloading).saveAs(file);
    const pdf = inspectPdf(await readFile(file));
    expect(pdf.pages).toBe(3);
    expect(pdf.images).toBe(3);
    expect(pdf.text).toContain("(2/3)");

    await page.emulateMedia({ media: "print" });
    expect(inspectPdf(await page.pdf({ preferCSSPageSize: true })).pages).toBe(3);
});

test("wrapping fills pages with rows; without it each page is one row, in the PDF too", async ({ page }, testInfo) => {
    const pdfPages = async name => {
        const downloading = page.waitForEvent("download");
        await page.getByRole("button", { name: "Save PDF" }).click();
        const file = testInfo.outputPath(name);
        await (await downloading).saveAs(file);
        return inspectPdf(await readFile(file)).pages;
    };
    // 3 pictograms, portrait, 2 across.
    await page.getByRole("button", { name: "Portrait" }).click();
    await page.getByRole("button", { name: "Fewer per row" }).click();
    await expect(page.getByTestId("per-line-value")).toHaveText("2");

    const wrapBox = page.getByRole("checkbox", { name: "Wrap the sequence" });
    await expect(wrapBox).not.toBeChecked();
    await expect(page.getByRole("region", { name: "Print preview" })).toHaveAttribute("data-pages", "2");
    expect(await pdfPages("strips.pdf")).toBe(2);

    await wrapBox.check();
    await expect(page.getByRole("region", { name: "Print preview" })).toHaveAttribute("data-pages", "1");
    expect(await pdfPages("wrapped.pdf")).toBe(1);
});

test("a vertical sequence reads top to bottom in the preview and the PDF", async ({ page }, testInfo) => {
    await page.getByRole("button", { name: "Vertical" }).click();
    const cells = page.getByTestId("print-cell");
    const boxes = await Promise.all([0, 1, 2].map(i => cells.nth(i).boundingBox()));
    // One column: same x, increasing y, in sequence order.
    expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(1);
    expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
    await expect(cells).toHaveText(["wake up", "eat", "school"]);

    // 1 per column without wrapping: a page per pictogram.
    await page.getByRole("button", { name: "Fewer per column" }).click();
    await page.getByRole("button", { name: "Fewer per column" }).click();
    await expect(page.getByRole("region", { name: "Print preview" })).toHaveAttribute("data-pages", "3");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).click();
    const file = testInfo.outputPath("vertical.pdf");
    await (await downloading).saveAs(file);
    expect(inspectPdf(await readFile(file)).pages).toBe(3);
});

test("own photos and Commons photos appear in the print preview and the PDF", async ({ page, browser }, testInfo) => {
    await stubCommons(page);
    await page.goto("/sequence/s1");
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Own image" }).click();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    await page.getByRole("textbox", { name: "Label" }).fill("holiday");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Photos" }).click();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("ball");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add Red ball" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/sequence/s1/print");
    const sheet = page.getByRole("img", { name: "Page 1 of 1" });
    expect(await imageSize(sheet.getByRole("img", { name: "holiday" }))).toEqual([600, 600]);
    expect((await imageSize(sheet.getByRole("img", { name: "ball" })))[0]).toBeGreaterThan(0);

    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).click();
    const file = testInfo.outputPath("mixed.pdf");
    await (await downloading).saveAs(file);
    const pdf = inspectPdf(await readFile(file));
    expect(pdf.images).toBe(5); // 3 pictograms + own photo + Commons photo
    expect(pdf.text).toContain("(holiday)");
});
