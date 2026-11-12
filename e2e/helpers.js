import { expect } from "@playwright/test";

// A distinct stub image per pictogram id (URL .../pictograms/{id}/...), so
// tests can tell them apart and the PDF doesn't deduplicate them.
function stubImage(url) {
    const id = Number(url.match(/pictograms\/(\d+)\//)?.[1] ?? 0);
    const r = 15 + ((id * 7) % 30);
    return Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="${r}"/></svg>`
    );
}

export const PICTOGRAMS = ["wake up", "eat", "school"];

/**
 * Seeds one English sequence with three pictograms and opens it. ARASAAC
 * images are stubbed so the tests don't depend on the network.
 */
export async function openSeededSequence(page) {
    await page.route("https://static.arasaac.org/**", route =>
        route.fulfill({
            body: stubImage(route.request().url()),
            contentType: "image/svg+xml",
            headers: { "access-control-allow-origin": "*" },
        })
    );
    await page.addInitScript(texts => {
        if (localStorage.getItem("collections")) return;
        localStorage.setItem("language", JSON.stringify("en"));
        localStorage.setItem(
            "collections",
            JSON.stringify({
                collections: [
                    {
                        id: "s1",
                        name: "Morning",
                        pictograms: texts.map((text, i) => ({
                            id: `p${i}`,
                            img: `https://static.arasaac.org/pictograms/${i}/${i}_500.png`,
                            text,
                        })),
                    },
                ],
            })
        );
    }, PICTOGRAMS);
    await page.goto("/sequence/s1");
    await expect(page.getByRole("heading", { name: "Morning" })).toBeVisible();
}

export function card(page, text) {
    return page.getByRole("button", { name: text, exact: true });
}

export async function storedTexts(page) {
    return page.evaluate(() =>
        JSON.parse(localStorage.getItem("collections")).collections[0].pictograms.map(p => p.text)
    );
}

export async function centerOf(locator) {
    const box = await locator.boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function bin(page) {
    return page.locator('[aria-label="Drop here to delete"]');
}

/**
 * A real landscape PNG (1200x600: red left half, blue right half), made by
 * screenshotting a page, for testing the own-image flow end to end.
 */
export async function landscapePhoto(browser) {
    // deviceScaleFactor 1: phone profiles would otherwise render it at 2-3x.
    const page = await browser.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 });
    await page.setContent(
        '<body style="margin:0;display:flex"><div style="width:600px;height:600px;background:#d00"></div><div style="width:600px;height:600px;background:#00d"></div></body>'
    );
    const buffer = await page.screenshot({ type: "png" });
    await page.close();
    return { name: "holiday.png", mimeType: "image/png", buffer };
}

// Commons API answer with one photo, plus the thumbnail it points to.
export async function stubCommons(page) {
    await page.route("https://commons.wikimedia.org/w/api.php**", route =>
        route.fulfill({
            headers: { "access-control-allow-origin": "*" },
            json: {
                query: {
                    pages: {
                        7: {
                            pageid: 7,
                            index: 1,
                            title: "File:Red ball.png",
                            imageinfo: [
                                {
                                    thumburl: "https://upload.wikimedia.org/thumb/r/rb/Red_ball.png/960px-Red_ball.png?utm_source=commons",
                                    descriptionurl: "https://commons.wikimedia.org/wiki/File:Red_ball.png",
                                    extmetadata: {
                                        Artist: { value: "<b>Ann Example</b>" },
                                        LicenseShortName: { value: "CC BY 4.0" },
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        })
    );
    await page.route("https://upload.wikimedia.org/**", route =>
        route.fulfill({
            headers: { "access-control-allow-origin": "*" },
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="120" fill="red"/></svg>',
        })
    );
}

/** naturalWidth x naturalHeight of an <img>, once it has loaded. */
export async function imageSize(locator) {
    await expect.poll(() => locator.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    return locator.evaluate(img => [img.naturalWidth, img.naturalHeight]);
}
