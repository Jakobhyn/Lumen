// Lumen: the store's game hover box. Steam fills #global_hover_content when
// you rest the pointer on a game; this adds the game's header art on top so
// the (wider, restyled) box shows what it is about at a glance.
(() => {
    if (window.__lumenHover) return;
    window.__lumenHover = true;

    function enrich(content) {
        const app = content.querySelector(":scope > div[id^='hover_app_']");
        if (!app || app.querySelector(".lumen-hover__art")) return;
        const appid = app.id.slice("hover_app_".length);
        if (!/^\d+$/.test(appid)) return;
        const art = new Image();
        art.className = "lumen-hover__art";
        art.alt = "";
        art.decoding = "async";
        art.onerror = () => art.remove();
        art.src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
        // Steam hides its own (usually empty) top area, so the art goes first.
        app.prepend(art);
    }

    // Steam creates (and may recreate) the hover box on demand, so watch the
    // page and look at whatever box is current, once per frame at most.
    function check() {
        const content = document.getElementById("global_hover_content");
        if (content) enrich(content);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; check(); });
    }).observe(document.documentElement, { childList: true, subtree: true });
    check();
})();
