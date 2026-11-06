// Lumen: a calm loading screen while the Steam window starts.
// Steam builds its main window in steps (frame, header, game list, page),
// which flickers through half-drawn states. If this script runs before the
// library is there, it covers the window with a Lumen surface, a soft accent
// glow and a progress ring, and fades it away once the library is ready
// (or after a few seconds at most).
(() => {
    if (window.__lumenStartup) return;
    window.__lumenStartup = true;

    const MAX_MS = 8000;
    const ready = () => !!document.querySelector(".AppDetailsMain") && !!document.querySelector(".LeftListSizableContainer, .ContentFrame .TopBar");

    // Already drawn (the theme was loaded into a running Steam): nothing to cover.
    if (ready()) return;

    const splash = document.createElement("div");
    splash.className = "lumen-startup";
    splash.setAttribute("aria-hidden", "true");
    splash.innerHTML = '<div class="lumen-startup__ring"></div><div class="lumen-startup__bar"><span></span></div>';
    (document.body || document.documentElement).append(splash);
    window.__lumenStartupShown = true;

    let done = false;
    function finish() {
        if (done) return;
        done = true;
        observer.disconnect();
        splash.classList.add("is-done");
        // Remove after the fade (and anyway, in case transitions don't run).
        splash.addEventListener("transitionend", () => splash.remove(), { once: true });
        setTimeout(() => splash.remove(), 800);
    }

    const observer = new MutationObserver(() => { if (ready()) finish(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(finish, MAX_MS);
})();
