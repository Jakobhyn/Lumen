// js/achievement-hover.js: achievement details beside the pointer.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const library = `
<div class="PrimaryAchievement"><div class="AchievementHoverContainer"><img class="Icon"></div><div class="Name">Way of the Blade</div></div>
<div class="Elsewhere">Not an achievement</div>
<div class="HoverPositionOuter"></div>`;

function client() {
    const w = page(library, { url: "https://steamloopback.host/index.html?LANGUAGE=english" });
    Object.defineProperty(w, "innerWidth", { value: 1600, configurable: true });
    Object.defineProperty(w, "innerHeight", { value: 900, configurable: true });
    return w;
}

// Steam's card: a positioned box with the details inside.
function showCard(w, { width = 400, height = 200 } = {}) {
    const box = w.document.createElement("div");
    box.className = "HoverPosition Ready";
    box.style.left = "300px";
    box.style.top = "300px";
    box.getBoundingClientRect = () => ({ width, height, left: 0, top: 0, right: width, bottom: height });
    box.innerHTML = `<div class="AppDetailsHover Hover Achieved">Way of the Blade</div>`;
    w.document.querySelector(".HoverPositionOuter").append(box);
    return box;
}

const move = (w, target, clientX, clientY) =>
    target.dispatchEvent(new w.MouseEvent("mousemove", { bubbles: true, clientX, clientY }));

test("puts the card to the right of the pointer, centred on it", async () => {
    const w = client();
    load(w, "js/achievement-hover.js");
    move(w, w.document.querySelector(".Name"), 500, 400);
    const box = showCard(w);
    await tick(30);
    assert.strictEqual(box.style.left, "518px");
    assert.strictEqual(box.style.top, "300px");
    assert.strictEqual(box.style.getPropertyPriority("left"), "important");
});

test("flips to the left near the right edge and stays inside the window", async () => {
    const w = client();
    load(w, "js/achievement-hover.js");
    move(w, w.document.querySelector(".Name"), 1400, 880);
    const box = showCard(w);
    await tick(30);
    assert.strictEqual(box.style.left, "982px");
    assert.strictEqual(box.style.top, "692px");
});

test("follows the pointer along the entry", async () => {
    const w = client();
    load(w, "js/achievement-hover.js");
    const name = w.document.querySelector(".Name");
    move(w, name, 500, 400);
    const box = showCard(w);
    await tick(30);
    move(w, name, 600, 410);
    await tick(30);
    assert.strictEqual(box.style.left, "618px");
    assert.strictEqual(box.style.top, "310px");
});

test("leaves cards alone when the pointer is not on an achievement", async () => {
    const w = client();
    load(w, "js/achievement-hover.js");
    move(w, w.document.querySelector(".Elsewhere"), 500, 400);
    const box = showCard(w);
    await tick(30);
    assert.strictEqual(box.style.left, "300px");
    assert.strictEqual(box.style.getPropertyPriority("left"), "");
});

test("wins when Steam moves the reused card again", async () => {
    const w = client();
    load(w, "js/achievement-hover.js");
    move(w, w.document.querySelector(".Name"), 500, 400);
    const box = showCard(w);
    await tick(30);
    box.style.left = "300px";   // Steam positions the card on its own
    await tick(30);
    assert.strictEqual(box.style.left, "518px");
});
