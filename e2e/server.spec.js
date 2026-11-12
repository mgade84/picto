import { expect, test } from "@playwright/test";
import { landscapePhoto, openSeededSequence, stubCommons } from "./helpers";

// The production nginx config: compression (Picto is mostly used on phones,
// often on mobile data) and caching that lets updates reach users at once.

test("serves the app compressed, with caching that suits each file", async ({ request }) => {
    const html = await request.get("/", { headers: { "Accept-Encoding": "gzip" } });
    expect(html.headers()["content-encoding"]).toBe("gzip");
    expect(html.headers()["cache-control"]).toBe("no-cache");

    const script = (await html.text()).match(/\/assets\/index-[^"]+\.js/)[0];
    const js = await request.get(script, { headers: { "Accept-Encoding": "gzip" } });
    expect(js.headers()["content-encoding"]).toBe("gzip");
    expect(js.headers()["vary"]).toMatch(/Accept-Encoding/);
    expect(js.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");

    // App routes get the entry point, revalidated like index.html.
    const route = await request.get("/sequence/abc/print");
    expect(route.status()).toBe(200);
    expect(route.headers()["cache-control"]).toBe("no-cache");
    expect(await route.text()).toContain('<div id="root">');

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.headers()["cache-control"]).toBe("no-cache");
    expect(manifest.headers()["content-type"]).toBe("application/manifest+json");
    expect((await manifest.json()).short_name).toBe("Picto");
    expect((await request.get("/logo192.png")).headers()["cache-control"]).toBe("public, max-age=86400");
});

test("sends a Content Security Policy on every response", async ({ request }) => {
    const html = await request.get("/");
    const csp = html.headers()["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self';"); // no inline scripts, no eval
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");

    const script = (await html.text()).match(/\/assets\/index-[^"]+\.js/)[0];
    for (const path of [script, "/manifest.webmanifest", "/logo192.png", "/sequence/x/print", "/assets/missing.js"]) {
        expect((await request.get(path)).headers()["content-security-policy"], path).toBe(csp);
    }
});

test("the app works under its Content Security Policy without violations", async ({ page, browser }) => {
    await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener("securitypolicyviolation", e =>
            window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`)
        );
    });
    await stubCommons(page);
    await openSeededSequence(page);

    // Own photo through the cropper (blob: images, inline styles).
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Own image" }).click();
    await page.getByTestId("own-image-input").setInputFiles(await landscapePhoto(browser));
    await expect(page.getByTestId("own-image-frame").locator("img")).toBeVisible();
    await page.getByRole("textbox", { name: "Label" }).fill("holiday");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // Wikimedia Commons search and photo.
    await page.getByRole("button", { name: "Add pictogram" }).click();
    await page.getByRole("tab", { name: "Photos" }).click();
    await page.getByRole("textbox", { name: "Search pictograms" }).fill("ball");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Add Red ball" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("img", { name: "holiday" })).toBeVisible();

    // Drag and drop (inline transform styles).
    const card = await page.getByRole("button", { name: "school", exact: true }).boundingBox();
    await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
    await page.mouse.down();
    await page.mouse.move(card.x + card.width / 2, card.y - 100, { steps: 10 });
    await page.mouse.up();

    // Print preview and PDF (jsPDF chunk, fetching every picture).
    await page.goto("/sequence/s1/print");
    await expect(page.getByRole("img", { name: /^Page 1 of/ })).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save PDF" }).click();
    await downloading;
    await page.goto("/about"); // the inlined logo (data:)
    await expect(page.getByRole("img", { name: "Picto logo" })).toBeVisible();

    expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});
