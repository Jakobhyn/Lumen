// Lumen: a page glide when you switch from one game to another.
// Steam keeps the game page and only swaps what is in it, so a CSS
// entrance would never run again. This watches which game the page shows
// and restarts the entrance (options/motion-smooth.css) when it changes.
(() => {
    if (window.__lumenMotion) return;
    window.__lumenMotion = true;

    let shown = null;

    // The game a page shows, from its hero art (.../assets/<appid>/...).
    function current() {
        const img = document.querySelector(".AppDetailsMain .HeaderBackgroundImage .ImgContainer img:not(.ImgBlur)");
        return (/\/assets\/(\d+)\//.exec(img?.getAttribute("src") || "") || [])[1] || null;
    }

    function check() {
        const panel = document.querySelector(".AppDetailsMain .AppDetailsOverviewPanel");
        const appid = panel ? current() : null;
        if (!appid || appid === shown) { if (!panel) shown = null; return; }
        const first = shown === null;
        shown = appid;
        if (first) return;  // Opening a game page from elsewhere is a fresh page already.
        panel.classList.remove("lumen-enter");
        void panel.offsetWidth;  // restart the animation
        panel.classList.add("lumen-enter");
    }

    document.addEventListener("animationend", e => {
        if (e.target.classList?.contains("lumen-enter")) e.target.classList.remove("lumen-enter");
    });

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; check(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    check();
})();
