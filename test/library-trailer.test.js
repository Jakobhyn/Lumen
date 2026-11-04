// js/library-trailer.js on a trimmed copy of a library game page.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const gamePage = appid => `
<div class="AppDetailsMain">
  <div class="TopCapsule"><div class="HeaderBackgroundImage">
    <div class="ImgContainer"><img class="ImgSrc" src="/assets/${appid}/abc/library_hero.jpg?c=1"></div>
  </div></div>
</div>`;

const movies = {
    1942280: [
        { id: 1, highlight: false, dash_h264: "https://video.test/1942280/other/dash_h264.mpd" },
        { id: 2, highlight: true, dash_h264: "https://video.test/1942280/main/dash_h264.mpd" },
    ],
    1030300: [{ id: 3, highlight: true, dash_h264: "https://video.test/1030300/main/dash_h264.mpd" }],
    999: [],
};

function client(appid) {
    const w = page(gamePage(appid), { url: "https://steamloopback.host/index.html" });
    const requests = [];
    w.fetch = async u => {
        requests.push(u);
        const id = /appids=(\d+)/.exec(u)[1];
        return { json: async () => ({ [id]: { success: true, data: { movies: movies[id] } } }) };
    };
    const played = [];
    w.LumenDash = { play: async (video, manifest) => { played.push(manifest); return true; } };
    load(w, "js/library-trailer.js");
    return { w, requests, played };
}

const videos = w => [...w.document.querySelectorAll(".lumen-trailer")];

test("plays the store's highlighted trailer over the hero art", async () => {
    const { w, played, requests } = client(1942280);
    await tick(50);
    assert.match(requests[0], /store\.steampowered\.com\/api\/appdetails\?appids=1942280&filters=movies/);
    assert.deepStrictEqual(played, ["https://video.test/1942280/main/dash_h264.mpd"]);
    const v = videos(w);
    assert.strictEqual(v.length, 1);
    assert.ok(v[0].muted && v[0].loop);
    assert.strictEqual(v[0].parentElement.className, "HeaderBackgroundImage");
});

test("switching games swaps the trailer", async () => {
    const { w, played } = client(1942280);
    await tick(50);
    w.document.querySelector(".AppDetailsMain").outerHTML = gamePage(1030300);
    await tick(50);
    assert.strictEqual(videos(w).length, 1);
    assert.strictEqual(played.at(-1), "https://video.test/1030300/main/dash_h264.mpd");
});

test("games without trailers keep the art and ask the store only once", async () => {
    const { w, played, requests } = client(999);
    await tick(50);
    w.document.body.append(w.document.createElement("div")); // unrelated DOM churn
    await tick(50);
    assert.strictEqual(videos(w).length, 0);
    assert.deepStrictEqual(played, []);
    assert.strictEqual(requests.length, 1);
});

test("a re-rendered header gets the trailer back without asking the store again", async () => {
    const { w, played, requests } = client(1942280);
    await tick(50);
    videos(w)[0].remove(); // Steam re-rendering drops our element
    await tick(50);
    assert.strictEqual(videos(w).length, 1);
    assert.strictEqual(played.length, 2);
    assert.strictEqual(requests.length, 1);
});

test("pages that are not a game page are left alone", async () => {
    const w = page(`<div class="LibraryHome"></div>`, { url: "https://steamloopback.host/index.html" });
    let fetched = false;
    w.fetch = async () => { fetched = true; };
    load(w, "js/library-trailer.js");
    await tick(50);
    assert.strictEqual(fetched, false);
});
