// Lumen: cinematic store page.
// Plays the game's trailer muted across the whole window and lays the logo,
// short description, price and buttons over it. Steam ships trailers only as
// DASH/HLS streams, so a tiny Media Source player feeds the video chunks.
(() => {
    if (window.__lumenHero) return;
    window.__lumenHero = true;

    const root = document.documentElement;
    const giveUp = () => root.classList.add("lumen-hero-off");

    // ---- tiny DASH player (static, number-based SegmentTemplate, video only) ----

    function parseDuration(iso) {
        const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/.exec(iso || "");
        return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    }

    async function loadManifest(url) {
        const xml = new DOMParser().parseFromString(await (await fetch(url)).text(), "application/xml");
        const set = [...xml.querySelectorAll("AdaptationSet")].find(a => a.getAttribute("contentType") === "video");
        if (!set) return null;

        // Pick the stream that fits the window: smallest one at least as wide, else the biggest.
        const want = Math.min(1920, window.innerWidth * (window.devicePixelRatio || 1));
        const reps = [...set.querySelectorAll("Representation")].sort((a, b) => a.getAttribute("width") - b.getAttribute("width"));
        const rep = reps.find(r => +r.getAttribute("width") >= want) || reps[reps.length - 1];
        const tpl = rep.querySelector("SegmentTemplate") || set.querySelector("SegmentTemplate");
        if (!tpl) return null;

        const id = rep.getAttribute("id");
        const total = parseDuration(xml.documentElement.getAttribute("mediaPresentationDuration"));
        const segment = tpl.getAttribute("duration") / (tpl.getAttribute("timescale") || 1);
        const fill = (s, n) => s.replace("$RepresentationID$", id).replace(/\$Number%0(\d+)d\$/, (_, w) => String(n).padStart(+w, "0")).replace("$Number$", n);
        const base = new URL(".", url);
        const first = +(tpl.getAttribute("startNumber") || 1);

        return {
            mime: `${rep.getAttribute("mimeType")}; codecs="${rep.getAttribute("codecs")}"`,
            init: new URL(fill(tpl.getAttribute("initialization"), 0), base).href,
            chunks: Array.from({ length: Math.ceil(total / segment) }, (_, i) => new URL(fill(tpl.getAttribute("media"), first + i), base).href),
        };
    }

    async function play(video, manifestUrl) {
        const stream = await loadManifest(manifestUrl);
        if (!stream || !window.MediaSource || !MediaSource.isTypeSupported(stream.mime)) return false;

        const source = new MediaSource();
        video.src = URL.createObjectURL(source);
        await new Promise(r => source.addEventListener("sourceopen", r, { once: true }));
        const buffer = source.addSourceBuffer(stream.mime);
        const append = data => new Promise((resolve, reject) => {
            buffer.addEventListener("updateend", resolve, { once: true });
            buffer.addEventListener("error", reject, { once: true });
            buffer.appendBuffer(data);
        });
        const get = async url => new Uint8Array(await (await fetch(url)).arrayBuffer());

        await append(await get(stream.init));
        // Fetch one chunk ahead so playback never waits on the network.
        let next = get(stream.chunks[0]);
        for (let i = 0; i < stream.chunks.length; i++) {
            const data = await next;
            if (i + 1 < stream.chunks.length) next = get(stream.chunks[i + 1]);
            await append(data);
            if (i === 0) video.play().catch(() => {});
            if (!video.isConnected) return true;
        }
        source.endOfStream();
        return true;
    }

    // ---- hero ----

    const text = sel => document.querySelector(sel)?.textContent.trim() || "";
    const el = (tag, cls, html) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    };

    function build() {
        if (getComputedStyle(root).getPropertyValue("--lumen-hero").trim() === "classic") return giveUp();
        const page = document.querySelector(".game_page_background.game");
        const carousel = document.querySelector(".gamehighlight_desktopcarousel");
        if (!page || !carousel) return giveUp();

        let media;
        try { media = JSON.parse(carousel.dataset.props); } catch { return giveUp(); }
        const appid = (/\/app\/(\d+)/.exec(location.pathname) || [])[1];
        const name = media.appName || text("#appHubAppName");
        const trailer = (media.trailers || []).find(t => t.featured) || (media.trailers || [])[0];
        const still = media.screenshots?.[0]?.full;

        const hero = el("section", "lumen-hero");
        const backdrop = el("div", "lumen-hero__backdrop");
        if (trailer?.poster || still) backdrop.style.backgroundImage = `url("${still || trailer.poster}")`;
        const video = el("video", "lumen-hero__video");
        Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true });
        backdrop.append(video, el("div", "lumen-hero__shade"));

        const body = el("div", "lumen-hero__body");

        // The game's own purchase block (bundles come first on many pages); fall back to any.
        const buy = document.querySelector("[id^='game_area_purchase_section_add_to_cart_']:not(.demo_above_purchase)")
            || document.querySelector(".game_area_purchase_game_wrapper:not(.dynamic_bundle_description) .game_area_purchase_game");
        const inBuy = sel => buy?.querySelector(sel)?.textContent.trim() || "";

        // Badges: the running deal and the review summary.
        const badges = el("div", "lumen-hero__badges");
        const pct = inBuy(".discount_pct");
        const countdown = inBuy(".game_purchase_discount_countdown");
        if (pct) badges.append(el("span", "lumen-chip lumen-chip--deal", `<b>${pct}</b>${countdown ? " " + countdown.replace(/^[^!]*!\s*/, "") : ""}`));
        const review = document.querySelector("#userReviews .user_reviews_summary_row:last-of-type .game_review_summary, #userReviews .game_review_summary");
        if (review) badges.append(el("span", `lumen-chip lumen-chip--review ${review.classList.contains("positive") ? "is-positive" : review.classList.contains("negative") ? "is-negative" : ""}`, review.textContent.trim()));

        // Logo: the library logo if the game has one, else the name in big type.
        const title = el("h1", "lumen-hero__title", name);
        if (appid) {
            const logo = new Image();
            logo.className = "lumen-hero__logo";
            logo.alt = name;
            logo.onload = () => title.replaceWith(logo);
            logo.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/logo.png`;
        }

        const desc = el("p", "lumen-hero__desc", text(".game_description_snippet"));

        const price = el("div", "lumen-hero__price");
        const final = buy?.querySelector(".discount_final_price, .game_purchase_price")?.textContent.trim();
        const original = buy?.querySelector(".discount_original_price")?.textContent.trim();
        if (final) price.innerHTML = `<span class="lumen-hero__final">${final}</span>${original ? `<s>${original}</s>` : ""}${pct ? `<span class="lumen-chip lumen-chip--deal">${pct}</span>` : ""}`;

        const actions = el("div", "lumen-hero__actions");
        const cart = buy?.querySelector(".btn_addtocart a, .btn_addtocart .btn_green_steamui, a.btn_green_steamui");
        if (cart) {
            const b = el("button", "lumen-btn lumen-btn--accent", `<span>${cart.textContent.trim()}</span>`);
            b.onclick = () => cart.click();
            actions.append(b);
        }
        const mediaBtn = el("button", "lumen-btn", "<span>▶ Media</span>");
        mediaBtn.onclick = () => document.querySelector(".lumen-media")?.scrollIntoView({ behavior: "smooth", block: "start" });
        actions.append(mediaBtn);
        const wish = document.querySelector("#add_to_wishlist_area a, #add_wishlist_button");
        if (wish && document.querySelector("#add_to_wishlist_area")?.offsetParent !== null) {
            const w = el("button", "lumen-btn lumen-btn--icon", "<span>♥</span>");
            w.title = wish.textContent.trim();
            w.onclick = () => { wish.click(); w.classList.add("is-on"); };
            actions.append(w);
        }

        body.append(badges, title, desc, price, actions);
        hero.append(backdrop, body);

        const top = document.querySelector(".page_top_area");
        top.parentElement.insertBefore(hero, top);
        document.querySelector("#game_highlights .leftcol")?.classList.add("lumen-media");
        root.classList.add("lumen-hero-on");

        // Only spend bandwidth on the video when the trailer is actually wanted.
        const manifest = trailer?.dashManifests?.find(u => u.includes("h264"));
        if (manifest && getComputedStyle(root).getPropertyValue("--lumen-hero-video").trim() !== "off") {
            video.addEventListener("playing", () => hero.classList.add("is-playing"), { once: true });
            play(video, manifest).catch(e => console.warn("[Lumen] trailer:", e));
            // Pause when scrolled away, resume when back.
            new IntersectionObserver(([e]) => e.isIntersecting ? video.play().catch(() => {}) : video.pause()).observe(hero);
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
    else build();
})();
