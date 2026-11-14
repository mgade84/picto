import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { imageSize, landscapePhoto, openSeededSequence, storedTexts } from "./helpers";

// Real round trips through files and links, in real browsers. A second,
// empty browser context stands in for someone else's phone.

const IMAGE = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
async function stubArasaac(page) {
    await page.route("https://static.arasaac.org/**", route =>
        route.fulfill({ body: IMAGE, contentType: "image/svg+xml", headers: { "access-control-allow-origin": "*" } })
    );
}

async function addOwnPhoto(page, browser, label) {
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Own image" }).click();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    await page.getByRole("textbox", { name: "Label" }).fill(label);
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
}

async function freshPage(browser, baseURL) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("language", JSON.stringify("en")));
    await stubArasaac(page);
    return page;
}

test("backup, delete everything, restore: sequences and own photos come back", async ({ page, browser }, testInfo) => {
    await openSeededSequence(page);
    await addOwnPhoto(page, browser, "kitchen");

    await page.goto("/settings");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save backup" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^picto-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const file = testInfo.outputPath("backup.json");
    await download.saveAs(file);
    const backup = JSON.parse(await readFile(file, "utf8"));
    expect(backup).toMatchObject({ format: "picto", version: 1, kind: "backup" });
    expect(Object.keys(backup.images)).toHaveLength(1);
    // Settings are never part of a backup.
    expect(JSON.stringify(backup)).not.toMatch(/binSide|language|editLocked|printOrientation/);

    // Delete everything.
    await page.getByRole("button", { name: "Clear" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete all" }).click();
    await expect(page.getByText("All sequences deleted.")).toBeVisible();

    // Restore.
    await page.getByTestId("import-input").setInputFiles(file);
    const dialog = page.getByRole("dialog", { name: "Restore backup" });
    await expect(dialog.getByTestId("import-summary")).toHaveText("Sequences1Pictograms4Own images1");
    await dialog.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 sequence added.")).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: /^Morning/ }).click();
    await page.reload();
    expect(await storedTexts(page)).toEqual(["wake up", "eat", "school", "kitchen"]);
    expect(await imageSize(page.getByRole("img", { name: "kitchen" }))).toEqual([600, 600]);
});

test("a sequence shared as a file opens on another device, photo included", async ({ page, browser, baseURL }, testInfo) => {
    await openSeededSequence(page);
    await addOwnPhoto(page, browser, "our car");

    await page.getByRole("button", { name: "Share sequence" }).click();
    const downloading = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("button", { name: "Share as file" }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("Morning.picto.json");
    const file = testInfo.outputPath("Morning.picto.json");
    await download.saveAs(file);

    const other = await freshPage(browser, baseURL);
    await other.goto("/");
    await expect(other.getByText(/No sequences yet/)).toBeVisible();
    await other.getByTestId("import-input").setInputFiles(file);
    await other.getByRole("dialog", { name: "Import sequence" }).getByRole("button", { name: "Add" }).click();

    await expect(other.getByRole("heading", { name: "Morning" })).toBeVisible();
    expect(await imageSize(other.getByRole("img", { name: "our car" }))).toEqual([600, 600]);
    await other.context().close();
});

test("a sequence shared as a link opens on another device without reaching the server", async ({ page, browser, baseURL }) => {
    await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", e => window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    await openSeededSequence(page);
    // Links need pictures from ARASAAC or Commons (the seed uses stub ones).
    await page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem("collections"));
        data.collections[0].pictograms.forEach((p, i) => (p.img = `https://static.arasaac.org/pictograms/${100 + i}/${100 + i}_500.png`));
        localStorage.setItem("collections", JSON.stringify(data));
    });
    await page.reload();
    await page.getByRole("button", { name: "Share sequence" }).click();
    const link = await page.getByRole("textbox", { name: "Link to the sequence" }).inputValue();
    expect(link).toMatch(/\/import#s=[\w-]+$/);

    // The QR code is drawn on the device (a data: SVG), fits the phone and is allowed by the CSP.
    await page.getByRole("button", { name: "QR code" }).click();
    const qr = page.getByRole("img", { name: "QR code for the link" });
    await expect(qr).toBeVisible();
    expect((await imageSize(qr))[0]).toBeGreaterThan(0);
    const dialogBox = await page.getByRole("dialog").boundingBox();
    const qrBox = await qr.boundingBox();
    expect(qrBox.width).toBeGreaterThan(150);
    expect(qrBox.x + qrBox.width).toBeLessThanOrEqual(dialogBox.x + dialogBox.width);
    for (const name of ["Copy link", "QR code"]) {
        const b = await page.getByRole("button", { name }).boundingBox();
        expect(b.height, name).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);

    const other = await freshPage(browser, baseURL);
    const appRequests = [];
    other.on("request", r => r.url().startsWith(baseURL) && appRequests.push(r.url()));
    await other.goto(link);
    await expect(other.getByText("Add the sequence “Morning” with 3 pictograms?")).toBeVisible();
    await other.getByRole("button", { name: "Add" }).click();

    await expect(other.getByRole("heading", { name: "Morning" })).toBeVisible();
    expect(await storedTexts(other)).toEqual(["wake up", "eat", "school"]);
    expect((await imageSize(other.getByRole("img", { name: "eat" })))[0]).toBeGreaterThan(0);
    // The sequence travels only in the fragment, which is never sent.
    for (const url of appRequests) {
        expect(url).not.toContain("#");
        expect(url).not.toContain("s=");
    }
    await other.context().close();
});

test("on a phone, backups and shared sequences go to the share sheet", async ({ browser, baseURL }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "uses its own touch context");
    const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
        window.__shared = [];
        navigator.canShare = () => true;
        navigator.share = async ({ files }) => {
            const [f] = files;
            window.__shared.push({ name: f.name, type: f.type, format: JSON.parse(await f.text()).format });
        };
    });
    await openSeededSequence(page);
    await page.getByRole("button", { name: "Share sequence" }).tap();
    await page.getByRole("dialog").getByRole("button", { name: "Share as file" }).tap();
    await expect
        .poll(() => page.evaluate(() => window.__shared))
        .toEqual([{ name: "Morning.picto.json", type: "application/json", format: "picto" }]);

    await page.goto("/settings"); // a new page: the record starts empty
    await page.getByRole("button", { name: "Save backup" }).tap();
    await expect
        .poll(() => page.evaluate(() => window.__shared))
        .toEqual([{ name: expect.stringMatching(/^picto-backup-\d{4}-\d{2}-\d{2}\.json$/), type: "application/json", format: "picto" }]);
    await context.close();
});
