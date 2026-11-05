// store/hero.js on a trimmed copy of a real store page.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const carousel = JSON.stringify({
    appName: "Brotato",
    trailers: [{ featured: true, poster: "https://example.test/poster.jpg", dashManifests: ["https://example.test/dash_h264.mpd"] }],
    screenshots: [
        { full: "https://example.test/ss1.jpg", standard: "https://example.test/ss1_600.jpg" },
        { full: "https://example.test/ss2.jpg", standard: "https://example.test/ss2_600.jpg" },
    ],
}).replace(/"/g, "&quot;");

// A bundle comes first, as on many real pages; the game's own block is second.
const store = `
<div class="page_content_ctn">
  <div class="page_top_area">
    <div class="page_title_area"><div id="appHubAppName">Brotato</div></div>
    <div id="game_highlights"><div class="leftcol"><div class="gamehighlight_desktopcarousel" data-props="${carousel}"></div></div><div class="rightcol">
      <div class="glance_ctn_responsive_left">
        <div class="release_date"><div class="subtitle column">Release Date:</div><div class="date">27 Sep, 2023</div></div>
        <div class="dev_row"><div class="subtitle column">Developer:</div><div class="summary column" id="developers_list"><a href="https://store.steampowered.com/developer/blobfish">Blobfish</a></div></div>
        <div class="dev_row"><div class="subtitle column">Publisher:</div><div class="summary column"><a href="https://store.steampowered.com/publisher/blobfish">Blobfish</a></div></div>
      </div>
      <div class="glance_tags popular_tags">
        <a class="app_tag" href="https://store.steampowered.com/tags/en/Roguelite/" style="display: none;"> Roguelite </a><a class="app_tag" href="https://store.steampowered.com/tags/en/Arena/" style="display: none;"> Arena </a><div class="app_tag add_button" id="addtag">+</div>
      </div>
      <div class="apphub_OtherSiteInfo"><a class="btnv6_blue_hoverfade btn_medium" href="https://steamcommunity.com/app/1942280"><span>Community Hub</span></a></div>
    </div></div>
  </div>
  <div class="game_page_background game">
    <div class="game_description_snippet">A top-down arena shooter roguelite.</div>
    <div id="userReviews">
      <a class="user_reviews_summary_row" data-tooltip-html="78% of the 1,204 user reviews in the last 30 days are positive."><div class="subtitle column">Recent Reviews:</div><div class="summary column"><span class="game_review_summary mixed">Mixed</span><span class="responsive_hidden"> (1,204) </span></div></a>
      <a class="user_reviews_summary_row" data-tooltip-html="94% of the 98,765 user reviews for this game are &lt;b&gt;positive&lt;/b&gt;."><div class="subtitle column all">All Reviews:</div><div class="summary column"><span class="game_review_summary positive">Very Positive</span><span class="responsive_hidden"> (98,765) </span></div></a>
    </div>
    <div class="game_area_purchase_game_wrapper dynamic_bundle_description">
      <div class="game_area_purchase_game">
        <div class="discount_pct">-67%</div><div class="discount_final_price">9,88€</div>
        <div class="btn_addtocart"><a class="btn_green_steamui">Bundle info</a></div>
      </div>
    </div>
    <div class="game_area_purchase_game_wrapper">
      <div class="game_area_purchase_game" id="game_area_purchase_section_add_to_cart_699833">
        <p class="game_purchase_discount_countdown">MIDWEEK DEAL! Offer ends 16 November</p>
        <div class="discount_pct">-50%</div>
        <div class="discount_original_price">4,99€</div><div class="discount_final_price">2,49€</div>
        <div class="btn_addtocart"><a class="btn_green_steamui" id="cart">Add to Cart</a></div>
      </div>
    </div>
    <div id="add_to_wishlist_area"><a href="javascript:AddToWishlist( 1942280, 'add_to_wishlist_area', 'add_to_wishlist_area_success', 'add_to_wishlist_area_fail', &quot;1_client-navigation__&quot;, 'add_to_wishlist_area2' );">Add to your wishlist</a></div>
    <div id="add_to_wishlist_area_success" style="display: none;"><a href="javascript:RemoveFromWishlist( 1942280, 'add_to_wishlist_area_success', 'add_to_wishlist_area', 'add_to_wishlist_area_fail', &quot;1_client-navigation__&quot;, 'add_to_wishlist_area2' );">On Wishlist</a></div>
    <div id="app_reviews_hash"></div>
  </div>
</div>`;

test("builds the hero from the game's own purchase block, not a bundle", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    assert.ok(d.documentElement.classList.contains("lumen-hero-on"));
    assert.strictEqual(d.querySelector(".lumen-hero__final").textContent, "2,49€");
    assert.strictEqual(d.querySelector(".lumen-hero__price s").textContent, "4,99€");
    assert.strictEqual(d.querySelector(".lumen-btn--accent").textContent, "Add to Cart");
    assert.match(d.querySelector(".lumen-chip--deal").textContent, /-50%.*Offer ends 16 November/);
    assert.ok(d.querySelector(".lumen-chip--review.is-positive"));
    assert.strictEqual(d.querySelector(".lumen-hero__desc").textContent, "A top-down arena shooter roguelite.");
});

test("the hero's buy button clicks Steam's add-to-cart link", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    let clicked = false;
    w.document.getElementById("cart").addEventListener("click", () => { clicked = true; });
    w.document.querySelector(".lumen-btn--accent").click();
    assert.ok(clicked);
});

test("hero, facts and media strip sit before Steam's top area", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    const order = [...d.querySelector(".page_content_ctn").children].map(c => c.className);
    assert.deepStrictEqual(order.slice(0, 4), ["lumen-hero", "lumen-facts", "lumen-media", "page_top_area"]);
});

test("the facts row takes Steam's labels, links, tags and the community hub", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    const items = [...d.querySelectorAll(".lumen-facts__item")].map(i => `${i.querySelector("dt").textContent}=${i.querySelector("dd").textContent}`);
    assert.deepStrictEqual(items, ["Release Date=27 Sep, 2023", "Developer=Blobfish", "Publisher=Blobfish"]);
    assert.strictEqual(d.querySelector(".lumen-facts__item dd a").href, "https://store.steampowered.com/developer/blobfish");
    const tags = [...d.querySelectorAll("a.lumen-tag")].map(a => a.textContent);
    assert.deepStrictEqual(tags, ["Roguelite", "Arena"]);
    let added = false;
    d.getElementById("addtag").addEventListener("click", () => { added = true; });
    d.querySelector(".lumen-tag--add").click();
    assert.ok(added);
    assert.strictEqual(d.querySelector(".lumen-facts > a.lumen-btn").href, "https://steamcommunity.com/app/1942280");
});

test("the media strip lists trailers first, then screenshots", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    assert.strictEqual(d.querySelector(".lumen-media__title small").textContent, "3");
    const tiles = [...d.querySelectorAll(".lumen-media__item")];
    assert.deepStrictEqual(tiles.map(t => t.querySelector("img").getAttribute("src")),
        ["https://example.test/poster.jpg", "https://example.test/ss1_600.jpg", "https://example.test/ss2_600.jpg"]);
    assert.ok(tiles[0].classList.contains("is-trailer") && tiles[0].querySelector(".lumen-media__play"));
    assert.ok(!tiles[1].classList.contains("is-trailer"));
});

test("a tile opens the viewer; arrows step through and Escape closes it", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    const key = k => d.dispatchEvent(new w.KeyboardEvent("keydown", { key: k }));
    d.querySelectorAll(".lumen-media__item")[1].click();
    assert.strictEqual(d.querySelector(".lumen-viewer img").getAttribute("src"), "https://example.test/ss1.jpg");
    assert.strictEqual(d.querySelector(".lumen-viewer__count").textContent, "2 / 3");
    key("ArrowRight");
    assert.strictEqual(d.querySelector(".lumen-viewer img").getAttribute("src"), "https://example.test/ss2.jpg");
    key("ArrowRight");
    assert.ok(d.querySelector(".lumen-viewer video"), "wraps around to the trailer");
    d.querySelector(".lumen-viewer__btn.is-prev").click();
    assert.strictEqual(d.querySelector(".lumen-viewer__count").textContent, "3 / 3");
    key("Escape");
    assert.strictEqual(d.querySelector(".lumen-viewer"), null);
});

test("the viewer asks the player for the trailer with sound", async () => {
    const w = page(store);
    const calls = [];
    w.LumenDash = { play: (video, url, opts) => { calls.push({ url, opts }); return Promise.resolve(true); } };
    load(w, "store/hero.js");
    await tick();
    calls.length = 0;
    w.document.querySelector(".lumen-media__item").click();
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].url, "https://example.test/dash_h264.mpd");
    assert.strictEqual(calls[0].opts.audio, true);
});

test("the heart runs Steam's wishlist actions and follows the wishlist state", async () => {
    const w = page(store);
    const calls = [];
    // Like Steam: adding swaps the two areas.
    w.AddToWishlist = (...args) => {
        calls.push(["add", ...args]);
        w.document.getElementById("add_to_wishlist_area").style.display = "none";
        w.document.getElementById("add_to_wishlist_area_success").style.display = "";
    };
    w.RemoveFromWishlist = (...args) => calls.push(["remove", ...args]);
    load(w, "store/hero.js");
    await tick();
    const heart = w.document.querySelector(".lumen-wish");
    assert.ok(!heart.classList.contains("is-on"));
    assert.strictEqual(heart.title, "Add to your wishlist");
    heart.click();
    assert.deepStrictEqual(calls[0], ["add", 1942280, "add_to_wishlist_area", "add_to_wishlist_area_success", "add_to_wishlist_area_fail", "1_client-navigation__", "add_to_wishlist_area2"]);
    await tick();
    assert.ok(heart.classList.contains("is-on"));
    assert.strictEqual(heart.title, "On Wishlist");
    heart.click();
    assert.strictEqual(calls[1][0], "remove");
    assert.strictEqual(calls[1][2], "add_to_wishlist_area_success");
});

test("the review chip shows the all-time rating and sums up both rows on hover", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const chip = w.document.querySelector(".lumen-chip--review");
    assert.strictEqual(chip.firstChild.textContent, "Very Positive");
    assert.ok(chip.classList.contains("is-positive"));
    const rows = [...chip.querySelectorAll(".lumen-tip__row")].map(r => [r.querySelector("b").textContent, r.querySelector(".lumen-tip__head span").textContent, r.querySelector(".lumen-tip__detail").textContent]);
    assert.deepStrictEqual(rows, [
        ["All Reviews", "Very Positive · 98,765", "94% of the 98,765 user reviews for this game are positive."],
        ["Recent Reviews", "Mixed · 1,204", "78% of the 1,204 user reviews in the last 30 days are positive."],
    ]);
});

test("the review chip jumps to the reviews", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    let jumped = false;
    w.document.getElementById("app_reviews_hash").scrollIntoView = () => { jumped = true; };
    w.document.querySelector(".lumen-chip--review").click();
    assert.ok(jumped);
});

test("Store trailer: Classic leaves Steam's page alone", async () => {
    const w = page(store, { vars: { "--lumen-hero": "classic" } });
    load(w, "store/hero.js");
    await tick();
    assert.ok(w.document.documentElement.classList.contains("lumen-hero-off"));
    assert.strictEqual(w.document.querySelector(".lumen-hero"), null);
});

test("pages without trailer data fall back to Steam's layout", async () => {
    const w = page(`<div class="game_page_background game"></div>`);
    load(w, "store/hero.js");
    await tick();
    assert.ok(w.document.documentElement.classList.contains("lumen-hero-off"));
});

test("loading the script twice builds one hero", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    load(w, "store/hero.js");
    await tick();
    assert.strictEqual(w.document.querySelectorAll(".lumen-hero").length, 1);
});
