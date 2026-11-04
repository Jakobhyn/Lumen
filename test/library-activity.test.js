// js/library-activity.js on a trimmed copy of a game page's activity feed.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const feed = `
<div class="AppDetailsMain">
  <div class="AppActivityDay">
    <h4 class="Reset AppActivityDate">TODAY<div class="Rule"></div></h4>
    <div><div class="Panel"><div class="Event Panel" id="news"><div class="Panel"><div class="PartnerEvent Event" id="inner"></div></div></div></div></div>
  </div>
  <div class="AppActivityDay">
    <h4 class="Reset AppActivityDate">NOVEMBER 1<div class="Rule"></div></h4>
    <div>
      <div class="Event Panel" id="a"><div class="EventHeadline"></div></div>
      <div class="Event Panel" id="b"><div class="EventHeadline"></div></div>
    </div>
  </div>
</div>`;

test("every entry carries its day as data-lumen-date", async () => {
    const w = page(feed, { url: "https://steamloopback.host/index.html" });
    load(w, "js/library-activity.js");
    await tick(30);
    const d = w.document;
    assert.strictEqual(d.getElementById("news").dataset.lumenDate, "Today");
    assert.strictEqual(d.getElementById("a").dataset.lumenDate, "November 1");
    assert.strictEqual(d.getElementById("b").dataset.lumenDate, "November 1");
});

test("news posts get one date, not a second one on the nested event", async () => {
    const w = page(feed, { url: "https://steamloopback.host/index.html" });
    load(w, "js/library-activity.js");
    await tick(30);
    assert.strictEqual(w.document.getElementById("inner").dataset.lumenDate, undefined);
    assert.strictEqual(w.document.querySelectorAll("[data-lumen-date]").length, 3);
});

test("entries loaded later (Load More Activity) are labelled too", async () => {
    const w = page(feed, { url: "https://steamloopback.host/index.html" });
    load(w, "js/library-activity.js");
    await tick(30);
    const day = w.document.createElement("div");
    day.className = "AppActivityDay";
    day.innerHTML = `<h4 class="AppActivityDate">OCTOBER 31</h4><div><div class="Event Panel" id="late"></div></div>`;
    w.document.querySelector(".AppDetailsMain").append(day);
    await tick(50);
    assert.strictEqual(w.document.getElementById("late").dataset.lumenDate, "October 31");
});
