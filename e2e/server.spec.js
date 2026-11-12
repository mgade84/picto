import { expect, test } from "@playwright/test";

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

    expect((await request.get("/manifest.json")).headers()["cache-control"]).toBe("no-cache");
    expect((await request.get("/logo192.png")).headers()["cache-control"]).toBe("public, max-age=86400");
});
