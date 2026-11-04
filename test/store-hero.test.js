// store/hero.js on a trimmed copy of a real store page.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load, tick } = require("./helpers");

const carousel = JSON.stringify({
    appName: "Brotato",
    trailers: [{ featured: true, poster: "https://example.test/poster.jpg", dashManifests: ["https://example.test/dash_h264.mpd"] }],
    screenshots: [{ full: "https://example.test/ss.jpg" }],
}).replace(/"/g, "&quot;");

// A bundle comes first, as on many real pages; the game's own block is second.
const store = `
<div class="page_content_ctn">
  <div class="page_top_area">
    <div class="page_title_area"><div id="appHubAppName">Brotato</div></div>
    <div id="game_highlights"><div class="leftcol"><div class="gamehighlight_desktopcarousel" data-props="${carousel}"></div></div><div class="rightcol"></div></div>
  </div>
  <div class="game_page_background game">
    <div class="game_description_snippet">A top-down arena shooter roguelite.</div>
    <div id="userReviews"><div class="user_reviews_summary_row"><span class="game_review_summary positive">Very Positive</span></div></div>
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
    <div id="add_to_wishlist_area"><a>Add to your wishlist</a></div>
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

test("the hero sits before Steam's top area and the media moves below it", async () => {
    const w = page(store);
    load(w, "store/hero.js");
    await tick();
    const d = w.document;
    assert.strictEqual(d.querySelector(".lumen-hero").nextElementSibling, d.querySelector(".page_top_area"));
    assert.ok(d.querySelector("#game_highlights .leftcol").classList.contains("lumen-media"));
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
