import { expect, test } from "@playwright/test";
import { bin, card, centerOf, openSeededSequence, storedTexts } from "./helpers";

// Playwright has no touch-drag API, so raw touch events go through the
// Chrome DevTools Protocol.
async function touch(page) {
    const cdp = await page.context().newCDPSession(page);
    const send = (type, points) =>
        cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    return {
        start: p => send("touchStart", [p]),
        move: p => send("touchMove", [p]),
        end: () => send("touchEnd", []),
        async path(from, to, steps = 15) {
            for (let i = 1; i <= steps; i++) {
                await this.move({
                    x: from.x + ((to.x - from.x) * i) / steps,
                    y: from.y + ((to.y - from.y) * i) / steps,
                });
                await page.waitForTimeout(16);
            }
        },
    };
}

test.beforeEach(async ({ page }) => {
    await openSeededSequence(page);
});

test("long-press and drag reorders on touch", async ({ page }) => {
    const t = await touch(page);
    const from = await centerOf(card(page, "school"));
    const to = await card(page, "wake up").boundingBox();

    await t.start(from);
    await page.waitForTimeout(400); // past the 250ms press delay
    await expect(bin(page)).toHaveCSS("opacity", "1");
    await t.path(from, { x: to.x + to.width / 2, y: to.y + 10 });
    await t.end();

    await expect.poll(() => storedTexts(page)).toEqual(["school", "wake up", "eat"]);
});

test("long-press and drag onto the bin deletes on touch", async ({ page }) => {
    const t = await touch(page);
    const from = await centerOf(card(page, "eat"));

    await t.start(from);
    await page.waitForTimeout(400);
    await t.path(from, await centerOf(bin(page)));
    await t.end();

    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "school"]);
    await expect(page.getByText("“eat” deleted")).toBeVisible();
});

test("a quick swipe does not start a drag", async ({ page }) => {
    const t = await touch(page);
    const from = await centerOf(card(page, "eat"));

    await t.start(from);
    await t.path(from, { x: from.x, y: from.y - 150 }, 5); // moves before 250ms
    await expect(bin(page)).toHaveCSS("opacity", "0");
    await t.end();
    expect(await storedTexts(page)).toEqual(["wake up", "eat", "school"]);
});

test("tapping the label opens the editor", async ({ page }) => {
    await page.getByRole("button", { name: "Edit label of eat" }).tap();
    await expect(page.getByRole("textbox", { name: "Label" })).toBeFocused();
});

test("swiping left and right moves between print pages", async ({ page }) => {
    await page.goto("/sequence/s1/print");
    await page.getByRole("button", { name: "Fewer per row" }).tap();
    await page.getByRole("button", { name: "Fewer per row" }).tap();
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 of 3");

    const t = await touch(page);
    const box = await page.getByRole("region", { name: "Print preview" }).boundingBox();
    const y = box.y + box.height / 2;
    const swipe = async (fromX, toX) => {
        await t.start({ x: fromX, y });
        await t.path({ x: fromX, y }, { x: toX, y }, 10);
        await t.end();
    };

    await swipe(box.x + box.width * 0.85, box.x + box.width * 0.15); // swipe left
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 2 of 3");
    await expect(page.getByRole("img", { name: "Page 2 of 3" })).toBeInViewport({ ratio: 0.9 });

    await swipe(box.x + box.width * 0.15, box.x + box.width * 0.85); // swipe right
    await expect(page.getByTestId("page-indicator")).toHaveText("Page 1 of 3");
});
