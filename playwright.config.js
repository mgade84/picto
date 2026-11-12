import { defineConfig, devices } from "@playwright/test";

// Run via `docker compose run --rm e2e`, which serves the production build
// as http://picto-web:8080. Drag and drop can't be exercised in jsdom, so it is
// tested here in a real browser.
//
// Picto is mainly used on phones: phone.spec.js runs on an iPhone profile
// (WebKit, the engine behind every iOS browser) and an Android one
// (Chromium). touch.spec.js needs raw touch events via the Chrome DevTools
// Protocol, so it runs on Android only.
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    reporter: [["list"]],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8090",
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "desktop",
            // Tall enough that all three seeded cards are on screen.
            use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 1000 } },
            testMatch: /(drag|print|crop)\.spec/,
        },
        { name: "android", use: { ...devices["Pixel 7"] }, testMatch: /(touch|phone|crop)\.spec/ },
        { name: "iphone", use: { ...devices["iPhone SE (3rd gen)"] }, testMatch: /(phone|crop)\.spec/ },
    ],
});
