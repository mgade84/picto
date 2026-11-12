import { expect, test } from "@playwright/test";
import { bin, card, centerOf, openSeededSequence, storedTexts } from "./helpers";

test.beforeEach(async ({ page }) => {
    await openSeededSequence(page);
});

async function startDrag(page, text) {
    const from = await centerOf(card(page, text));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    // Past the 8px activation distance.
    await page.mouse.move(from.x, from.y + 20, { steps: 5 });
    return from;
}

test("drags a card to reorder", async ({ page }) => {
    await expect(bin(page)).toHaveCSS("opacity", "0");

    await startDrag(page, "school");
    await expect(bin(page)).toHaveCSS("opacity", "1");

    const target = await card(page, "wake up").boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + 10, { steps: 15 });
    await page.mouse.up();

    await expect.poll(() => storedTexts(page)).toEqual(["school", "wake up", "eat"]);
    await expect(bin(page)).toHaveCSS("opacity", "0");

    // The cards on screen follow, and the order survives a reload.
    await page.reload();
    await expect(page.locator("img[alt]:not([alt=''])").first()).toBeVisible();
    const order = await page.locator("img[alt]:not([alt=''])").evaluateAll(imgs => imgs.map(i => i.alt));
    expect(order).toEqual(["school", "wake up", "eat"]);
});

test("drops a card on the bin to delete it, with undo", async ({ page }) => {
    await startDrag(page, "eat");
    const target = await centerOf(bin(page));
    await page.mouse.move(target.x, target.y, { steps: 15 });
    // The bin lights up while the card is over it.
    await expect(bin(page)).toHaveCSS("background-color", "rgb(211, 47, 47)");
    await page.mouse.up();

    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "school"]);
    await expect(card(page, "eat")).toHaveCount(0);
    await expect(page.getByText("“eat” deleted")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "eat", "school"]);
    await expect(card(page, "eat")).toBeVisible();
});

test("dropping back in place or pressing Escape changes nothing", async ({ page }) => {
    const from = await startDrag(page, "eat");
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await startDrag(page, "eat");
    await page.mouse.move(from.x, from.y, { steps: 5 });
    await page.mouse.up();
    expect(await storedTexts(page)).toEqual(["wake up", "eat", "school"]);
});

test("clicking the label edits it instead of dragging", async ({ page }) => {
    await page.getByRole("button", { name: "Edit label of eat" }).click();
    const field = page.getByRole("textbox", { name: "Label" });
    await expect(field).toBeFocused();
    await field.fill("breakfast");
    await field.press("Enter");
    await expect.poll(() => storedTexts(page)).toEqual(["wake up", "breakfast", "school"]);

    // Selecting text in the editor with the mouse doesn't start a drag.
    await page.getByRole("button", { name: "Edit label of breakfast" }).click();
    const box = await page.getByRole("textbox", { name: "Label" }).boundingBox();
    await page.mouse.move(box.x + 5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 5, box.y + box.height / 2 + 30, { steps: 10 });
    await expect(bin(page)).toHaveCSS("opacity", "0");
    await page.mouse.up();
});

test("reorders with the keyboard", async ({ page }) => {
    // dnd-kit's screen-reader announcements double as sync points: each
    // key must finish its move before the next one is pressed.
    const live = page.locator("[id^=DndLiveRegion]");
    await card(page, "wake up").focus();
    await page.keyboard.press("Space");
    await expect(live).toHaveText("wake up is over position 1 of 3.");
    // Keyboard drags reorder only; the bin stays hidden (Delete deletes).
    await expect(bin(page)).toHaveCSS("opacity", "0");
    await page.keyboard.press("ArrowDown");
    await expect(live).toHaveText("wake up is over position 2 of 3.");
    await page.keyboard.press("ArrowDown");
    await expect(live).toHaveText("wake up is over position 3 of 3.");
    await page.keyboard.press("Space");
    await expect(live).toHaveText("wake up dropped at position 3 of 3.");
    await expect.poll(() => storedTexts(page)).toEqual(["eat", "school", "wake up"]);
});

test("cards can't be dragged while editing is locked", async ({ page }) => {
    await page.getByRole("button", { name: "Lock editing" }).click();
    const from = await centerOf(page.getByRole("img", { name: "school" }));
    const to = await page.getByRole("img", { name: "wake up" }).boundingBox();
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 10, { steps: 15 });
    await expect(bin(page)).toHaveCount(0); // no drag-and-drop at all while locked
    await page.mouse.up();
    expect(await storedTexts(page)).toEqual(["wake up", "eat", "school"]);
});

for (const side of ["left", "right"]) {
    test(`shows the bin on the ${side} and deletes there`, async ({ page }) => {
        if (side === "right") {
            await page.goto("/settings");
            await page.getByRole("radio", { name: "Right" }).check();
            await page.goto("/sequence/s1");
        }
        await startDrag(page, "eat");
        const box = await bin(page).boundingBox();
        const viewport = page.viewportSize();
        if (side === "left") expect(box.x).toBeLessThan(viewport.width / 4);
        else expect(box.x + box.width).toBeGreaterThan((viewport.width * 3) / 4);

        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
        await page.mouse.up();
        await expect.poll(() => storedTexts(page)).toEqual(["wake up", "school"]);
    });
}
