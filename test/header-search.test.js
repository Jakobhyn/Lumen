// js/header-search.js on a trimmed copy of the client's main window.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const client = `
<div class="TopBar">
  <div class="SuperNav">
    <div class="SuperNavMenu"><div class="MenuButton">Store</div></div>
    <div class="SuperNavMenu"><div class="MenuButton" id="library-tab">Library</div></div>
  </div>
</div>
<div class="LeftListSizableContainer" id="sidebar"></div>`;

const librarySearch = `
<div class="Container">
  <div class="SearchInput"><input id="lib" placeholder="Search by Name"></div>
  <div class="Filter"><div class="tool-tip-source" id="filter"></div></div>
</div>`;

const opts = { url: "https://steamloopback.host/index.html", vars: { "--lumen-header": "compact" } };

test("adds one search field to the header", async () => {
    const w = page(client + librarySearch.replace("<div class=\"Container\">", "<div class=\"LeftListSizableContainer\"><div class=\"Container\">") + "</div>", opts);
    load(w, "js/header-search.js");
    await tick();
    const fields = w.document.querySelectorAll(".TopBar .lumen-search");
    assert.strictEqual(fields.length, 1);
    assert.strictEqual(fields[0].querySelector("input").placeholder, "Search by Name");
});

test("typing filters through Steam's own library search", async () => {
    const w = page(client, opts);
    w.document.getElementById("sidebar").innerHTML = librarySearch;
    load(w, "js/header-search.js");
    await tick();
    const lib = w.document.getElementById("lib");
    const seen = [];
    lib.addEventListener("input", () => seen.push(lib.value));

    const field = w.document.querySelector(".lumen-search__input");
    field.focus();
    field.value = "hollow";
    field.dispatchEvent(new w.Event("input"));
    await tick();
    assert.strictEqual(lib.value, "hollow");
    assert.deepStrictEqual(seen, ["hollow"]);
});

test("from the store it switches to the library first", async () => {
    const w = page(client, opts);
    load(w, "js/header-search.js");
    await tick();
    // Clicking the Library tab renders the library sidebar, like Steam does.
    w.document.getElementById("library-tab").addEventListener("click", () => {
        w.document.getElementById("sidebar").innerHTML = librarySearch;
    });

    const field = w.document.querySelector(".lumen-search__input");
    field.focus();
    field.value = "sekiro";
    field.dispatchEvent(new w.Event("input"));
    await tick(100);
    assert.strictEqual(w.document.getElementById("lib").value, "sekiro");
});

test("Escape clears the field and the library search", async () => {
    const w = page(client, opts);
    w.document.getElementById("sidebar").innerHTML = librarySearch;
    load(w, "js/header-search.js");
    await tick();
    const field = w.document.querySelector(".lumen-search__input");
    field.focus();
    field.value = "x";
    field.dispatchEvent(new w.Event("input"));
    await tick();
    field.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    assert.strictEqual(field.value, "");
    assert.strictEqual(w.document.getElementById("lib").value, "");
});

test("Header: Classic adds no search field", async () => {
    const w = page(client, { url: opts.url });
    load(w, "js/header-search.js");
    await tick();
    assert.strictEqual(w.document.querySelector(".lumen-search"), null);
});
