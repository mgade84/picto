import { expect, test } from "@playwright/test";
import { imageSize, landscapePhoto, openSeededSequence, storedTexts, stubCommons } from "./helpers";

// Runs on the phone projects (iPhone SE (3rd gen) on WebKit, Pixel 7 on
// Chromium): every screen must fit the width without sideways scrolling, and
// the main flows must work by tapping.

async function expectNoHorizontalScroll(page, path) {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
}

const shot = (page, name, testInfo) =>
    page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });

test("every screen fits the phone's width", async ({ page }, testInfo) => {
    await openSeededSequence(page);
    await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem("collections"));
        data.collections.push({ id: "s2", name: "A rather long sequence name for school days", pictograms: [] });
        localStorage.setItem("collections", JSON.stringify(data));
    });

    for (const [path, name] of [
        ["/", "collections"],
        ["/sequence/s1", "sequence"],
        ["/sequence/s1/print", "print"],
        ["/settings", "settings"],
        ["/about", "about"],
    ]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalScroll(page, path);
        await shot(page, name, testInfo);
    }

    // Sequence names get a usable width and never run under the row's buttons.
    await page.goto("/");
    for (const [text, button] of [
        ["Morning", "Print Morning"],
        ["A rather long sequence name for school days", "Print A rather long sequence name for school days"],
    ]) {
        const name = await page.getByText(text, { exact: true }).boundingBox();
        const action = await page.getByRole("link", { name: button }).boundingBox();
        expect(name.x + name.width, `"${text}" overlaps its buttons`).toBeLessThanOrEqual(action.x);
        expect(name.width).toBeGreaterThan(60);
    }
});

test("buttons are big enough to tap", async ({ page }) => {
    await openSeededSequence(page);
    for (const path of ["/", "/sequence/s1", "/sequence/s1/print"]) {
        await page.goto(path);
        const small = await page.evaluate(() =>
            [...document.querySelectorAll("button, a[href], [role=button]")]
                .filter(el => el.offsetParent !== null)
                .map(el => ({ name: el.getAttribute("aria-label") || el.textContent.trim(), ...el.getBoundingClientRect().toJSON() }))
                .filter(b => b.width < 44 || b.height < 44)
                .map(b => `${b.name} (${Math.round(b.width)}x${Math.round(b.height)})`)
        );
        expect(small, `small tap targets on ${path}`).toEqual([]);
    }
});

test("search, add, relabel and lock by tapping", async ({ page }) => {
    await page.route("https://api.arasaac.org/**", route =>
        route.fulfill({ json: [{ _id: 2517, keywords: [{ keyword: "cat" }] }] })
    );
    await openSeededSequence(page);

    await page.getByRole("button", { name: "Add pictogram" }).tap();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("cat");
    await page.getByRole("button", { name: "Search", exact: true }).tap();
    await page.getByRole("button", { name: "Add cat" }).tap();
    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "eat", "school", "cat"]);

    await page.getByRole("button", { name: "Edit label of cat" }).tap();
    const field = page.getByRole("textbox", { name: "Label" });
    await field.fill("kitten");
    await field.press("Enter");
    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "eat", "school", "kitten"]);

    await page.getByRole("button", { name: "Lock editing" }).tap();
    await expect(page.getByRole("button", { name: "Add pictogram" })).toHaveCount(0);
});

test("opens the print preview and saves a PDF", async ({ page }) => {
    await openSeededSequence(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Print Morning" }).tap();
    await expect(page.getByRole("img", { name: "Page 1 of 1" })).toBeVisible();

    // No share sheet in the test browsers, so it falls back to a download.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).tap();
    expect((await download).suggestedFilename()).toBe("Morning.pdf");
});

test("the print preview shows the whole A4 page on screen", async ({ page }) => {
    await openSeededSequence(page);
    await page.goto("/sequence/s1/print");
    const viewport = page.viewportSize();
    for (const orientation of ["Landscape", "Portrait"]) {
        await page.getByRole("button", { name: orientation }).tap();
        const sheet = await page.getByRole("img", { name: "Page 1 of 1" }).boundingBox();
        expect(sheet.x).toBeGreaterThanOrEqual(0);
        expect(sheet.x + sheet.width).toBeLessThanOrEqual(viewport.width);
        // A4's proportions (297 / 210), whichever way round.
        const ratio = Math.max(sheet.width, sheet.height) / Math.min(sheet.width, sheet.height);
        expect(ratio).toBeCloseTo(297 / 210, 1);
    }
});

test("pages can be stepped through by tapping and each fits the screen", async ({ page }) => {
    await openSeededSequence(page);
    await page.goto("/sequence/s1/print");
    await page.getByRole("button", { name: "Fewer per row" }).tap();
    await page.getByRole("button", { name: "Fewer per row" }).tap();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 of 3");
    await expectNoHorizontalScroll(page, "print with 3 pages");

    const viewport = page.viewportSize();
    for (const n of [2, 3]) {
        await page.getByRole("button", { name: "Next page" }).tap();
        await expect(page.getByTestId("page-indicator")).toHaveText(`Page ${n} of 3`);
        const sheet = page.getByRole("img", { name: `Page ${n} of 3` });
        await expect(sheet).toBeInViewport({ ratio: 0.9 });
        const box = await sheet.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }
});

test("the back arrow and title sit in the same place on the sequence and print pages", async ({ page }) => {
    await openSeededSequence(page);
    const header = async path => {
        await page.goto(path);
        const back = await page.getByRole("link", { name: "Back to collections" }).boundingBox();
        const title = await page.getByRole("heading", { level: 2, name: "Morning" }).boundingBox();
        return [back.x, back.y, back.width, title.x, title.y].map(Math.round);
    };
    expect(await header("/sequence/s1/print")).toEqual(await header("/sequence/s1"));
});

test("adds an own photo and keeps it after a reload", async ({ page, browser }) => {
    await openSeededSequence(page);
    await page.getByRole("button", { name: "Add pictogram" }).tap();
    await page.getByRole("tab", { name: "Own image" }).tap();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    await expect(page.getByTestId("own-image-frame").locator("img")).toBeVisible();

    await page.getByRole("textbox", { name: "Label" }).fill("holiday");
    await page.getByRole("button", { name: "Add", exact: true }).tap();
    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "eat", "school", "holiday"]);

    // Still there after a reload (IndexedDB), on the card and in the list.
    await page.reload();
    expect(await imageSize(page.getByRole("img", { name: "holiday" }))).toEqual([600, 600]);
    await page.goto("/");
    await expect(page.getByText("4 pictograms")).toBeVisible();
});

test("adds a photo from Wikimedia Commons", async ({ page }) => {
    await stubCommons(page);
    await openSeededSequence(page);

    await page.getByRole("button", { name: "Add pictogram" }).tap();
    await page.getByRole("tab", { name: "Photos" }).tap();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("ball");
    await page.getByRole("button", { name: "Search", exact: true }).tap();
    await page.getByRole("button", { name: "Add Red ball" }).tap();

    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "eat", "school", "ball"]);
    expect((await imageSize(page.getByRole("img", { name: "ball" })))[0]).toBeGreaterThan(0);

    await page.goto("/about");
    await expect(page.getByRole("list", { name: "Photos from Wikimedia Commons" })).toHaveText("Ann Example, CC BY 4.0");
});
