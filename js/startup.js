// Lumen: a calm loading screen while the Steam window starts.
// Steam builds its main window in steps (frame, header, game list, page),
// which flickers through half-drawn states. If this script runs before the
// library is there, it covers the window with a Lumen surface and a progress
// ring, and fades it away once the window is ready.
(() => {
    if (window.__lumenStartup) return;
    window.__lumenStartup = true;

    // Steam creates the main window hidden while you are still signing in,
    // so the safety limit only counts while the window is visible.
    const MAX_VISIBLE_MS = 20000;
    // A start on another page (store, community) has no library page; the
    // header standing for a moment is enough then.
    const HEADER_GRACE_MS = 2500;

    const hasHeader = () => !!document.querySelector(".ContentFrame .TopBar, .TopBar");
    const hasLibrary = () => !!document.querySelector(".AppDetailsMain");

    // Already drawn (the theme was loaded into a running Steam): nothing to cover.
    if (hasHeader() && hasLibrary()) return;

    const splash = document.createElement("div");
    splash.className = "lumen-startup";
    splash.setAttribute("aria-hidden", "true");
    splash.innerHTML = '<div class="lumen-startup__ring"></div><div class="lumen-startup__bar"><span></span></div>';
    (document.body || document.documentElement).append(splash);
    window.__lumenStartupShown = true;

    let done = false, headerTimer = 0, maxTimer = 0;

    function finish() {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(headerTimer);
        clearTimeout(maxTimer);
        document.removeEventListener("visibilitychange", startMaxTimer);
        splash.classList.add("is-done");
        // Remove after the fade (and anyway, in case transitions don't run).
        splash.addEventListener("transitionend", () => splash.remove(), { once: true });
        setTimeout(() => splash.remove(), 800);
    }

    function check() {
        if (hasHeader() && hasLibrary()) return finish();
        if (hasHeader() && !headerTimer) headerTimer = setTimeout(finish, HEADER_GRACE_MS);
    }

    function startMaxTimer() {
        if (maxTimer || document.visibilityState !== "visible") return;
        maxTimer = setTimeout(finish, MAX_VISIBLE_MS);
    }

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", startMaxTimer);
    startMaxTimer();
    check();
})();
