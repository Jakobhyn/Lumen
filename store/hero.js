// Lumen: cinematic store page.
// Plays the game's trailer muted across the whole window and lays the logo,
// short description, price and buttons over it. Steam ships trailers only as
// DASH/HLS streams; shared/dash.js (window.LumenDash) plays them.
(() => {
    if (window.__lumenHero) return;
    window.__lumenHero = true;

    const root = document.documentElement;
    const giveUp = () => root.classList.add("lumen-hero-off");

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
        top.before(hero, buildFacts(), buildMedia(media, video));
        root.classList.add("lumen-hero-on");

        // Only spend bandwidth on the video when the trailer is actually wanted.
        const manifest = trailer?.dashManifests?.find(u => u.includes("h264"));
        if (manifest && getComputedStyle(root).getPropertyValue("--lumen-hero-video").trim() !== "off") {
            video.addEventListener("playing", () => hero.classList.add("is-playing"), { once: true });
            window.LumenDash?.play(video, manifest)?.catch(e => console.warn("[Lumen] trailer:", e));
            // Pause when scrolled away, resume when back.
            new IntersectionObserver(([e]) => e.isIntersecting ? video.play().catch(() => {}) : video.pause()).observe(hero);
        }
    }

    // ---- facts: release date, developer, publisher, tags, community hub ----
    // Steam's own glance block sits in the hidden right column; its labels
    // already come in the store's language.

    function buildFacts() {
        const facts = el("section", "lumen-facts");
        const list = el("dl", "lumen-facts__list");
        for (const row of document.querySelectorAll(".glance_ctn_responsive_left > .release_date, .glance_ctn_responsive_left > .dev_row")) {
            const label = row.querySelector(".subtitle")?.textContent.trim().replace(/:$/, "");
            const value = row.querySelector(".date, .summary");
            if (!label || !value?.textContent.trim()) continue;
            const item = el("div", "lumen-facts__item");
            const dd = el("dd");
            dd.append(...[...value.childNodes].map(n => n.cloneNode(true)));
            item.append(el("dt", null, ""), dd);
            item.firstChild.textContent = label;
            list.append(item);
        }

        const tags = el("div", "lumen-facts__tags");
        for (const tag of [...document.querySelectorAll(".glance_tags.popular_tags a.app_tag")].slice(0, 8)) {
            const a = el("a", "lumen-tag");
            a.href = tag.href;
            a.textContent = tag.textContent.trim();
            tags.append(a);
        }
        const addTag = document.querySelector(".glance_tags.popular_tags .app_tag.add_button");
        if (addTag && tags.childElementCount) {
            const b = el("button", "lumen-tag lumen-tag--add", "+");
            b.type = "button";
            b.onclick = () => addTag.click();
            tags.append(b);
        }

        facts.append(list, tags);
        const hub = document.querySelector(".apphub_OtherSiteInfo a");
        if (hub) {
            const a = el("a", "lumen-btn lumen-btn--subtle");
            a.href = hub.href;
            a.textContent = hub.textContent.trim();
            facts.append(a);
        }
        return facts;
    }

    // ---- media: a strip of trailers and screenshots, opened in a viewer ----

    const language = new URLSearchParams(location.search).get("l") || document.documentElement.lang;
    const mediaLabel = { german: "Medien", de: "Medien", french: "Médias", fr: "Médias", spanish: "Multimedia", es: "Multimedia" }[language] || "Media";
    const icon = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
    const PREV = "M10 3.5L5.5 8l4.5 4.5", NEXT = "M6 3.5L10.5 8 6 12.5", CLOSE = "M4 4l8 8M12 4l-8 8";

    function buildMedia(media, heroVideo) {
        const items = [
            ...(media.trailers || []).map(t => ({ trailer: t, thumb: t.poster || t.thumbnail })),
            ...(media.screenshots || []).map(s => ({ still: s.full || s.standard, thumb: s.standard || s.thumbnail })),
        ].filter(i => i.thumb);

        const section = el("section", "lumen-media");
        if (!items.length) return section;
        const head = el("h2", "lumen-media__title", `<span></span><small>${items.length}</small>`);
        head.firstChild.textContent = mediaLabel;

        const rail = el("div", "lumen-media__rail");
        const track = el("div", "lumen-media__track");
        items.forEach((item, i) => {
            const tile = el("button", `lumen-media__item${item.trailer ? " is-trailer" : ""}`);
            tile.type = "button";
            const img = new Image();
            img.loading = "lazy";
            img.alt = "";
            img.src = item.thumb;
            tile.append(img);
            if (item.trailer) tile.append(el("span", "lumen-media__play"));
            tile.onclick = () => openViewer(items, i, heroVideo);
            track.append(tile);
        });

        const nav = (cls, d, dir) => {
            const b = el("button", `lumen-media__nav ${cls}`, icon(d));
            b.type = "button";
            b.onclick = () => track.scrollBy({ left: dir * track.clientWidth, behavior: "smooth" });
            return b;
        };
        const prev = nav("is-prev", PREV, -1), next = nav("is-next", NEXT, 1);
        const sync = () => {
            prev.hidden = track.scrollLeft <= 1;
            next.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
        };
        track.addEventListener("scroll", sync, { passive: true });
        window.addEventListener("resize", sync);
        requestAnimationFrame(sync);

        rail.append(prev, track, next);
        section.append(head, rail);
        return section;
    }

    function openViewer(items, start, heroVideo) {
        document.querySelector(".lumen-viewer")?.remove();
        heroVideo?.pause();
        const viewer = el("div", "lumen-viewer");
        viewer.setAttribute("role", "dialog");
        viewer.setAttribute("aria-modal", "true");
        const stage = el("div", "lumen-viewer__stage");
        const count = el("div", "lumen-viewer__count");
        const button = (cls, d, onClick) => {
            const b = el("button", `lumen-viewer__btn ${cls}`, icon(d));
            b.type = "button";
            b.onclick = e => { e.stopPropagation(); onClick(); };
            return b;
        };

        let index = start;
        const show = i => {
            index = (i + items.length) % items.length;
            const item = items[index];
            // A fresh element per item: the old trailer stops loading once detached.
            stage.replaceChildren();
            if (item.trailer) {
                const v = el("video", "lumen-viewer__media");
                Object.assign(v, { controls: true, playsInline: true, autoplay: true });
                v.poster = item.trailer.poster || "";
                stage.append(v);
                const manifest = item.trailer.dashManifests?.find(u => u.includes("h264"));
                if (manifest) window.LumenDash?.play(v, manifest, { audio: true, width: stage.clientWidth })?.catch(e => console.warn("[Lumen] viewer:", e));
            } else {
                const img = el("img", "lumen-viewer__media");
                img.alt = "";
                img.src = item.still;
                stage.append(img);
            }
            count.textContent = `${index + 1} / ${items.length}`;
        };

        const close = () => {
            viewer.remove();
            document.removeEventListener("keydown", onKey, true);
            const hero = document.querySelector(".lumen-hero");
            if (heroVideo && hero && hero.getBoundingClientRect().bottom > 0) heroVideo.play().catch(() => {});
        };
        const onKey = e => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") show(index - 1);
            else if (e.key === "ArrowRight") show(index + 1);
            else return;
            e.preventDefault();
            e.stopPropagation();
        };
        document.addEventListener("keydown", onKey, true);
        viewer.onclick = e => { if (e.target === viewer || e.target === stage) close(); };

        viewer.append(stage, count, button("is-close", CLOSE, close));
        if (items.length > 1) viewer.append(button("is-prev", PREV, () => show(index - 1)), button("is-next", NEXT, () => show(index + 1)));
        document.body.append(viewer);
        show(start);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build, { once: true });
    else build();
})();
