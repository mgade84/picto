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
