// Lumen: "Continue playing" banner on the library home.
// Puts the game you played last at the top of the home page, with its art,
// logo, when you last played it and a Play button. The library's game data
// lives in the shared Steam context (window.opener).
(() => {
    if (window.__lumenHome) return;
    window.__lumenHome = true;

    const language = new URLSearchParams(location.search).get("LANGUAGE") || "english";
    const english = { label: "Continue playing", play: "Play", install: "Install", page: "Game page", hours: n => `${n} h played`, last: "Last played" };
    const t = {
        german: { label: "Weiterspielen", play: "Spielen", install: "Installieren", page: "Spieleseite", hours: n => `${n} Std. gespielt`, last: "Zuletzt gespielt" },
    }[language] || english;
    const locale = { german: "de", french: "fr", spanish: "es", italian: "it", dutch: "nl", polish: "pl" }[language] || "en";
    const CDN = "https://shared.steamstatic.com/store_item_assets/steam/apps";

    const shared = () => window.opener || window;

    // The most recently played game that shows in the game list.
    function lastPlayed() {
        const s = shared();
        const apps = s.collectionStore?.allAppsCollection?.allApps || s.appStore?.allApps || [];
        let best = null;
        for (const a of apps) {
            if (a.app_type !== 1 || a.visible_in_game_list === false || !a.rt_last_time_played) continue;
            if (!best || a.rt_last_time_played > best.rt_last_time_played) best = a;
        }
        return best;
    }

    function ago(seconds) {
        const diff = seconds - Date.now() / 1000;
        const steps = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
        for (const [unit, size] of steps) if (Math.abs(diff) >= size) return rtf.format(Math.round(diff / size), unit);
        return rtf.format(0, "minute");
    }

    // Hero and logo: the library knows the exact (hashed) files once a game's
    // details are loaded; before that only older games have them at the
    // plain CDN path. Try each source in turn, and ask once more after the
    // details had time to load.
    function images(appid, kind) {
        const store = shared().appDetailsStore;
        let list = [];
        try {
            list = kind === "hero" ? store?.GetHeroImagesForAppId?.(appid)?.rgHeroImages : store?.GetLogoImagesForAppId?.(appid)?.rgLogoImages;
        } catch { /* details not ready */ }
        const local = (list || []).map(u => u.startsWith("/") ? `https://steamloopback.host${u}` : u);
        return [...local, `${CDN}/${appid}/${kind === "hero" ? "library_hero.jpg" : "logo.png"}`];
    }

    function load(img, appid, kind, onFail) {
        let urls = images(appid, kind), i = 0, retried = false;
        img.onerror = () => {
            if (++i < urls.length) img.src = urls[i];
            else if (!retried) {
                retried = true;
                setTimeout(() => { urls = images(appid, kind); i = 0; img.src = urls[0]; }, 1500);
            } else {
                img.onerror = null;
                onFail?.();
            }
        };
        img.src = urls[0];
    }

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    };

    function build(app) {
        const banner = el("section", "lumen-continue");
        banner.dataset.appid = app.appid;

        try { shared().appDetailsStore?.RequestAppDetails?.(app.appid); } catch { /* best effort */ }
        const art = el("img", "lumen-continue__art");
        art.alt = "";
        load(art, app.appid, "hero", () => { art.src = `${CDN}/${app.appid}/header.jpg`; });

        const body = el("div", "lumen-continue__body");
        const name = el("h2", "lumen-continue__name", app.display_name);
        const logo = el("img", "lumen-continue__logo");
        logo.alt = app.display_name;
        logo.onload = () => name.replaceWith(logo);
        load(logo, app.appid, "logo");

        const hours = Math.round((app.minutes_playtime_forever || 0) / 6) / 10;
        const meta = el("p", "lumen-continue__meta", `${t.last} ${ago(app.rt_last_time_played)} · ${t.hours(hours.toLocaleString(locale))}`);

        const actions = el("div", "lumen-continue__actions");
        const installed = app.installed ?? app.per_client_data?.[0]?.installed;
        const play = el("button", "lumen-continue__play", installed === false ? t.install : t.play);
        play.type = "button";
        play.onclick = () => shared().SteamClient?.Apps?.RunGame(String(app.appid), "", -1, 100);
        const page = el("button", "lumen-continue__page", t.page);
        page.type = "button";
        page.onclick = () => shared().SteamUIStore?.Navigate(`/library/app/${app.appid}`);
        actions.append(play, page);

        body.append(el("span", "lumen-continue__label", t.label), name, meta, actions);
        banner.append(art, el("div", "lumen-continue__shade"), body);
        return banner;
    }

    function mount() {
        const updates = document.querySelector(".UpdatesContainer");
        if (!updates) return;
        const app = lastPlayed();
        const current = updates.parentElement.querySelector(":scope > .lumen-continue");
        if (!app) { current?.remove(); return; }
        if (current && current.dataset.appid === String(app.appid)) return;
        const banner = build(app);
        if (current) current.replaceWith(banner);
        else updates.before(banner);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; mount(); });
    }).observe(document.body, { childList: true, subtree: true });
    mount();
})();
