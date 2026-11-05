// js/library-home.js: the "Continue playing" banner on the library home.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const home = `<div class="Body InnerContainer"><div id="home"><div class="UpdatesContainer"></div><div class="Shelf"></div></div></div>`;
const now = Math.floor(Date.now() / 1000);

// The shared Steam context the library reads its game data from.
function steam(apps, calls = []) {
    return {
        collectionStore: { allAppsCollection: { allApps: apps } },
        appDetailsStore: {
            RequestAppDetails: id => calls.push(["details", id]),
            GetHeroImagesForAppId: id => ({ rgHeroImages: [`/assets/${id}/abc/library_hero.jpg?c=0`] }),
            GetLogoImagesForAppId: id => ({ rgLogoImages: [`/assets/${id}/def/logo.png?c=0`] }),
        },
        SteamClient: { Apps: { RunGame: (...args) => calls.push(["run", ...args]) } },
        SteamUIStore: { Navigate: path => calls.push(["nav", path]) },
    };
}

const games = [
    { appid: 10, display_name: "Older", app_type: 1, rt_last_time_played: now - 86400 * 30, minutes_playtime_forever: 600, installed: true },
    { appid: 20, display_name: "Elden Ring", app_type: 1, rt_last_time_played: now - 7200, minutes_playtime_forever: 2058, installed: true },
    { appid: 30, display_name: "A tool", app_type: 4, rt_last_time_played: now, minutes_playtime_forever: 5 },
    { appid: 40, display_name: "Hidden", app_type: 1, rt_last_time_played: now - 60, visible_in_game_list: false },
];

function client(apps, { language = "english", calls } = {}) {
    const w = page(home, { url: `https://steamloopback.host/index.html?LANGUAGE=${language}` });
    Object.defineProperty(w, "opener", { value: steam(apps, calls), configurable: true });
    return w;
}

test("shows the most recently played visible game above What's New", async () => {
    const w = client(games);
    load(w, "js/library-home.js");
    await tick(30);
    const banner = w.document.querySelector(".lumen-continue");
    assert.ok(banner);
    assert.strictEqual(banner.nextElementSibling.className, "UpdatesContainer");
    assert.strictEqual(banner.dataset.appid, "20");
    assert.strictEqual(banner.querySelector(".lumen-continue__name").textContent, "Elden Ring");
    assert.strictEqual(banner.querySelector(".lumen-continue__meta").textContent, "Last played 2 hours ago · 34.3 h played");
    assert.strictEqual(banner.querySelector(".lumen-continue__art").getAttribute("src"), "https://steamloopback.host/assets/20/abc/library_hero.jpg?c=0");
});

test("Play starts the game and the second button opens its page", async () => {
    const calls = [];
    const w = client(games, { calls });
    load(w, "js/library-home.js");
    await tick(30);
    w.document.querySelector(".lumen-continue__play").click();
    w.document.querySelector(".lumen-continue__page").click();
    assert.deepStrictEqual(calls.filter(c => c[0] !== "details"), [["run", "20", "", -1, 100], ["nav", "/library/app/20"]]);
});

test("labels follow Steam's language, and a game that is not installed offers Install", async () => {
    const w = client([{ ...games[1], installed: false }], { language: "german" });
    load(w, "js/library-home.js");
    await tick(30);
    const banner = w.document.querySelector(".lumen-continue");
    assert.strictEqual(banner.querySelector(".lumen-continue__label").textContent, "Weiterspielen");
    assert.strictEqual(banner.querySelector(".lumen-continue__play").textContent, "Installieren");
    assert.match(banner.querySelector(".lumen-continue__meta").textContent, /^Zuletzt gespielt vor 2 Stunden · 34,3 Std\. gespielt$/);
});

test("follows a newly played game and stays single", async () => {
    const apps = games.map(g => ({ ...g }));
    const w = client(apps);
    load(w, "js/library-home.js");
    await tick(30);
    apps[0].rt_last_time_played = now;
    w.document.querySelector(".Shelf").append(w.document.createElement("div"));
    await tick(30);
    const banners = w.document.querySelectorAll(".lumen-continue");
    assert.strictEqual(banners.length, 1);
    assert.strictEqual(banners[0].dataset.appid, "10");
});

test("no played games, no banner", async () => {
    const w = client([{ appid: 1, display_name: "New", app_type: 1, rt_last_time_played: 0 }]);
    load(w, "js/library-home.js");
    await tick(30);
    assert.strictEqual(w.document.querySelector(".lumen-continue"), null);
});
