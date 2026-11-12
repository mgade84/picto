import { expect, test } from "@playwright/test";
import { landscapePhoto, openSeededSequence, stubCommons } from "./helpers";

// Checks the privacy statement on the About page against what the browser
// actually does. If this fails, either fix the app or update the statement.

function recordRequests(page) {
    const requests = [];
    page.on("request", r => requests.push({ method: r.method(), url: new URL(r.url()), body: r.postData() }));
    return requests;
}

test("using Picto sends no user data anywhere", async ({ page, browser, baseURL }) => {
    const requests = recordRequests(page);
    const app = new URL(baseURL).host;

    // A full session without searching: sequences, own photo, editing,
    // lock, print preview, PDF, settings and About.
    await openSeededSequence(page);
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Own image" }).click();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    await page.getByRole("textbox", { name: "Label" }).fill("our kitchen");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Edit label of our kitchen" }).click();
    await page.getByRole("textbox", { name: "Label" }).fill("kitchen");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Lock editing" }).click();
    await page.getByRole("button", { name: "Lock editing" }).click();
    await page.goto("/sequence/s1/print");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).click();
    await downloading;
    await page.goto("/settings");
    await page.goto("/about");
    await expect(page.getByRole("region", { name: "Privacy and data protection" })).toBeVisible();

    // Nothing is ever uploaded: no request has a body or a writing method.
    expect(requests.filter(r => r.method !== "GET" || r.body)).toEqual([]);
    // Only the app itself and ARASAAC's image server (the seeded
    // pictograms) are contacted; no analytics, fonts or other third parties.
    const hosts = new Set(requests.map(r => r.url.host));
    expect([...hosts].sort()).toEqual([app, "static.arasaac.org"].sort());
    // What the app's own server sees is file requests and page addresses:
    // never labels, sequence names or images.
    for (const r of requests.filter(r => r.url.host === app)) {
        expect(r.url.href).not.toMatch(/kitchen|Morning|wake/i);
        expect(r.url.search).toBe("");
    }
});

test("a search sends only the search word", async ({ page }) => {
    await stubCommons(page);
    await page.route("https://api.arasaac.org/**", route => route.fulfill({ json: [] }));
    await openSeededSequence(page);
    const requests = recordRequests(page);

    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("bath");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/No pictograms found/)).toBeVisible();
    await page.getByRole("tab", { name: "Photos" }).click();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("ball");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Add Red ball" })).toBeVisible();

    const searches = requests.filter(r => /api\.arasaac\.org|commons\.wikimedia\.org/.test(r.url.host));
    expect(searches.map(r => r.method)).toEqual(["GET", "GET"]);
    expect(searches[0].url.pathname).toBe("/v1/pictograms/en/search/bath");
    expect(searches[1].url.searchParams.get("gsrsearch")).toBe("ball filetype:bitmap|drawing");
    // The sequence's contents never go along.
    for (const r of searches) expect(r.url.href).not.toMatch(/Morning|wake|school/i);
});
