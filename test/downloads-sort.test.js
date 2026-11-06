// js/downloads-sort.js: "Smallest first" on the downloads page.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const downloadsPage = `
<div class="DownloadsPage">
  <div class="ItemListWrapper">
    <div class="Section"><h3 class="SectionTitle"><div class="TitleAndCount"><span class="Title">Up Next</span></div><div class="Rule"></div><div class="AutoUpdates">Auto-updates enabled</div></h3></div>
    <div class="Section"><h3 class="SectionTitle"><div class="TitleAndCount"><span class="Title">Scheduled</span></div><div class="Rule"></div></h3></div>
  </div>
</div>`;

// A transfer as Steam reports it: the download stage carries the bytes.
const transfer = (appid, total, done = 0, queue_index = -1) => ({
    appid, queue_index,
    update_type_info: [
        { has_update: true, progress: [{ bytes_total: 0, bytes_in_progress: 0 }, { bytes_total: total, bytes_in_progress: done }] },
        { has_update: false, progress: [{ bytes_total: 999e9, bytes_in_progress: 0 }] },
    ],
});

function client({ queued = [], scheduled = [], language = "english" } = {}) {
    const calls = [];
    const w = page(downloadsPage, { url: `https://steamloopback.host/index.html?LANGUAGE=${language}` });
    Object.defineProperty(w, "opener", {
        configurable: true,
        value: {
            downloadsStore: { QueuedTransfers: queued, ScheduledTransfers: scheduled },
            SteamClient: { Downloads: {
                QueueAppUpdate: appid => calls.push(["queue", appid]),
                SetQueueIndex: (appid, index) => calls.push(["index", appid, index]),
            } },
        },
    });
    return { w, calls };
}

test("adds the button to the Up Next header, after the rule", async () => {
    const { w } = client({ queued: [transfer(1, 5e9, 0, 0)], scheduled: [transfer(2, 1e6)] });
    load(w, "js/downloads-sort.js");
    await tick(30);
    const buttons = w.document.querySelectorAll(".lumen-sort-queue");
    assert.strictEqual(buttons.length, 1);
    assert.ok(buttons[0].previousElementSibling.classList.contains("Rule"));
    assert.strictEqual(buttons[0].closest(".Section"), w.document.querySelector(".Section"));
    assert.strictEqual(buttons[0].textContent, "Smallest first");
});

test("queues every scheduled update, then orders all by what is left, smallest first", async () => {
    const { w, calls } = client({
        // A big download half done (2 GB left) and a small one, in Steam's order.
        queued: [transfer(10, 4e9, 2e9, 0), transfer(11, 3e9, 0, 1)],
        scheduled: [transfer(20, 850e6), transfer(21, 80), transfer(22, 25e9)],
    });
    load(w, "js/downloads-sort.js");
    await tick(30);
    w.document.querySelector(".lumen-sort-queue").click();
    await tick(500);
    assert.deepStrictEqual(calls.filter(c => c[0] === "queue").map(c => c[1]).sort(), [20, 21, 22]);
    assert.deepStrictEqual(calls.filter(c => c[0] === "index"), [
        ["index", 21, 0], ["index", 20, 1], ["index", 10, 2], ["index", 11, 3], ["index", 22, 4],
    ]);
});

test("German label, and no button with fewer than two downloads", async () => {
    const one = client({ scheduled: [transfer(2, 1e6)], language: "german" });
    load(one.w, "js/downloads-sort.js");
    await tick(30);
    assert.strictEqual(one.w.document.querySelector(".lumen-sort-queue"), null);

    const two = client({ scheduled: [transfer(2, 1e6), transfer(3, 2e6)], language: "german" });
    load(two.w, "js/downloads-sort.js");
    await tick(30);
    assert.strictEqual(two.w.document.querySelector(".lumen-sort-queue").textContent, "Kleinste zuerst");
});
