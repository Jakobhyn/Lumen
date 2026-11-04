// js/library-more.js on a trimmed copy of a library game page.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const gamePage = `
<div class="AppDetailsMain"><div class="Body ScrollContainer" id="scroller">
  <div class="TopCapsule"></div>
  <div class="AppDetailsSection LinksSection"></div>
  <div class="ColumnContainer"></div>
</div></div>`;

const client = (language = "english") =>
    page(gamePage, { url: `https://steamloopback.host/index.html?LANGUAGE=${language}` });

test("adds one More button right after the links", async () => {
    const w = client();
    load(w, "js/library-more.js");
    await tick(30);
    const buttons = w.document.querySelectorAll(".lumen-more");
    assert.strictEqual(buttons.length, 1);
    assert.ok(buttons[0].previousElementSibling.classList.contains("LinksSection"));
    assert.strictEqual(buttons[0].textContent.trim(), "More");
});

test("the label follows Steam's language", async () => {
    const w = client("german");
    load(w, "js/library-more.js");
    await tick(30);
    assert.strictEqual(w.document.querySelector(".lumen-more").textContent.trim(), "Mehr");
});

test("clicking glides the page down to the content", async () => {
    const w = client();
    load(w, "js/library-more.js");
    await tick(30);
    const scroller = w.document.getElementById("scroller");
    const calls = [];
    scroller.scrollTo = opts => calls.push(opts);
    w.document.querySelector(".lumen-more").click();
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].behavior, "smooth");
});

test("the button fades out once the page is scrolled", async () => {
    const w = client();
    load(w, "js/library-more.js");
    await tick(30);
    const scroller = w.document.getElementById("scroller");
    scroller.scrollTop = 200;
    scroller.dispatchEvent(new w.Event("scroll"));
    assert.ok(w.document.querySelector(".lumen-more").classList.contains("is-away"));
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new w.Event("scroll"));
    assert.ok(!w.document.querySelector(".lumen-more").classList.contains("is-away"));
});

test("a re-rendered page gets its button back, never two", async () => {
    const w = client();
    load(w, "js/library-more.js");
    await tick(30);
    w.document.querySelector(".lumen-more").remove();
    await tick(30);
    w.document.querySelector(".ColumnContainer").append(w.document.createElement("div"));
    await tick(30);
    assert.strictEqual(w.document.querySelectorAll(".lumen-more").length, 1);
});
