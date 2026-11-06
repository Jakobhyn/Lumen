// js/motion.js: a page glide when the game page switches to another game.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const gamePage = appid => `
<div class="AppDetailsMain"><div class="AppDetailsOverviewPanel">
  <div class="HeaderBackgroundImage"><div class="ImgContainer">
    <img class="ImgBlur" src="https://steamloopback.host/assets/${appid}/blur.jpg">
    <img id="hero" src="https://steamloopback.host/assets/${appid}/abc/library_hero.jpg">
  </div></div>
</div></div>`;

const client = appid => page(gamePage(appid), { url: "https://steamloopback.host/index.html?LANGUAGE=english" });
const panel = w => w.document.querySelector(".AppDetailsOverviewPanel");

test("opening a game page adds no extra glide", async () => {
    const w = client(570);
    load(w, "js/motion.js");
    await tick(30);
    assert.ok(!panel(w).classList.contains("lumen-enter"));
});

test("switching to another game restarts the glide, and it clears when done", async () => {
    const w = client(570);
    load(w, "js/motion.js");
    await tick(30);
    w.document.getElementById("hero").setAttribute("src", "https://steamloopback.host/assets/1245620/def/library_hero.jpg");
    await tick(30);
    assert.ok(panel(w).classList.contains("lumen-enter"));
    panel(w).dispatchEvent(new w.Event("animationend", { bubbles: true }));
    assert.ok(!panel(w).classList.contains("lumen-enter"));
});

test("the same game again does not glide", async () => {
    const w = client(570);
    load(w, "js/motion.js");
    await tick(30);
    w.document.getElementById("hero").setAttribute("src", "https://steamloopback.host/assets/570/other/library_hero.jpg");
    await tick(30);
    assert.ok(!panel(w).classList.contains("lumen-enter"));
});
