// store/hover.js: header art on top of Steam's game hover box.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const frame = () => new Promise(r => setTimeout(r, 30));

test("adds the game's header art when Steam fills the hover box", async () => {
    const w = page(`<div id="global_hover"><div class="hover_box"><div id="global_hover_content"></div></div></div>`, { url: "https://store.steampowered.com/" });
    load(w, "store/hover.js");
    const content = w.document.getElementById("global_hover_content");
    content.innerHTML = `<div id="hover_app_1942280"><div class="hover_top_area"></div><h4 class="hover_title">Brotato</h4></div>`;
    await frame();
    const art = content.querySelector(".lumen-hover__art");
    assert.ok(art);
    assert.strictEqual(art.getAttribute("src"), "https://cdn.cloudflare.steamstatic.com/steam/apps/1942280/header.jpg");
    assert.strictEqual(content.firstElementChild.firstElementChild, art, "art comes first");

    // Another game replaces the box.
    content.innerHTML = `<div id="hover_app_570"><h4 class="hover_title">Dota 2</h4></div>`;
    await frame();
    assert.match(content.querySelector(".lumen-hover__art").getAttribute("src"), /\/apps\/570\/header\.jpg$/);
    assert.strictEqual(content.querySelectorAll(".lumen-hover__art").length, 1);
});

test("finds a hover box that Steam adds later, and leaves packages alone", async () => {
    const w = page("", { url: "https://store.steampowered.com/" });
    load(w, "store/hover.js");
    await tick();
    w.document.body.insertAdjacentHTML("beforeend", `<div id="global_hover"><div id="global_hover_content"><div id="hover_sub_12345"><h4>Bundle</h4></div></div></div>`);
    await frame();
    assert.strictEqual(w.document.querySelector(".lumen-hover__art"), null);
    w.document.getElementById("global_hover_content").innerHTML = `<div id="hover_app_620"></div>`;
    await frame();
    assert.ok(w.document.querySelector("#hover_app_620 .lumen-hover__art"));
});
