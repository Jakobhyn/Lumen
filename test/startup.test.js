// js/startup.js: the loading screen while the Steam window starts.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const client = html => page(html, { url: "https://steamloopback.host/index.html?LANGUAGE=english" });

test("covers a window that is still loading, and fades once the library is there", async () => {
    const w = client(`<div class="ContentFrame"></div>`);
    load(w, "js/startup.js");
    const splash = w.document.querySelector(".lumen-startup");
    assert.ok(splash);
    assert.ok(!splash.classList.contains("is-done"));
    w.document.querySelector(".ContentFrame").innerHTML = `<div class="TopBar"></div><div class="AppDetailsMain"></div>`;
    await tick(30);
    assert.ok(splash.classList.contains("is-done"));
    await tick(900);
    assert.strictEqual(w.document.querySelector(".lumen-startup"), null, "removed after the fade");
});

test("a window that is already drawn gets no loading screen", async () => {
    const w = client(`<div class="ContentFrame"><div class="TopBar"></div><div class="AppDetailsMain"></div></div>`);
    load(w, "js/startup.js");
    await tick(30);
    assert.strictEqual(w.document.querySelector(".lumen-startup"), null);
});

test("loading the script twice adds one loading screen", async () => {
    const w = client(`<div class="ContentFrame"></div>`);
    load(w, "js/startup.js");
    load(w, "js/startup.js");
    assert.strictEqual(w.document.querySelectorAll(".lumen-startup").length, 1);
});

test("a start on another page clears once the header has stood for a moment", async () => {
    const w = client(`<div class="ContentFrame"></div>`);
    load(w, "js/startup.js");
    w.document.querySelector(".ContentFrame").innerHTML = `<div class="TopBar"></div>`;
    await tick(30);
    assert.ok(!w.document.querySelector(".lumen-startup").classList.contains("is-done"), "not right away");
    await tick(2600);
    assert.ok(w.document.querySelector(".lumen-startup")?.classList.contains("is-done") ?? true);
});
