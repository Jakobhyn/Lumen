// Lumen: the store trailer behind a game's library page (Library trailer: On).
// Reads the game's trailers from the store API, picks the highlighted one and
// plays it muted over the hero art with shared/dash.js. The art stays as the
// poster until the video runs, and comes back if a game has no trailer.
(() => {
    if (window.__lumenLibraryTrailer) return;
    window.__lumenLibraryTrailer = true;

    const cache = new Map();
    const noTrailer = new Set();
    let shownFor = null;

    const appIdOf = img => (/\/(?:assets|apps)\/(\d+)\//.exec(img?.getAttribute("src") || "") || [])[1];

    async function trailerFor(appid) {
        if (!cache.has(appid)) {
            cache.set(appid, fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=movies`)
                .then(r => r.json())
                .then(j => {
                    const movies = j?.[appid]?.data?.movies || [];
                    const movie = movies.find(m => m.highlight) || movies[0];
                    return movie?.dash_h264 || null;
                })
                .catch(() => null));
        }
        return cache.get(appid);
    }

    const visible = new IntersectionObserver(entries => {
        for (const e of entries) {
            if (e.isIntersecting && !document.hidden) e.target.play().catch(() => {});
            else e.target.pause();
        }
    });

    document.addEventListener("visibilitychange", () => {
        const video = document.querySelector(".lumen-trailer");
        if (!video) return;
        if (document.hidden) video.pause();
        else video.play().catch(() => {});
    });

    let loading = null;

    async function show(header, appid) {
        shownFor = appid;
        loading = header;
        header.querySelector(".lumen-trailer")?.remove();
        const manifest = await trailerFor(appid);
        if (loading === header) loading = null;
        if (!manifest) noTrailer.add(appid);
        if (!manifest || shownFor !== appid || !header.isConnected || header.querySelector(".lumen-trailer")) return;

        const video = document.createElement("video");
        video.className = "lumen-trailer";
        Object.assign(video, { muted: true, loop: true, playsInline: true, autoplay: true });
        video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
        header.append(video);
        visible.observe(video);
        window.LumenDash?.play(video, manifest)?.catch(e => console.warn("[Lumen] library trailer:", e));
    }

    function update() {
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const header = document.querySelector(".AppDetailsMain .HeaderBackgroundImage");
        const appid = appIdOf(header?.querySelector(".ImgContainer img:not(.ImgBlur)"));
        if (!header || !appid) { shownFor = null; return; }
        if (appid === shownFor && noTrailer.has(appid)) return;
        // A new game, or Steam re-rendered the header and dropped the video.
        if (appid !== shownFor || (loading !== header && !header.querySelector(".lumen-trailer"))) show(header, appid);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; update(); });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    update();
})();
