// Lumen: activity feed on a game page. Steam groups entries under a day
// heading ("TODAY", "NOVEMBER 1"); Lumen shows each entry as its own card
// with the date in its top-right corner, so this copies the day's heading
// onto every entry as data-lumen-date (client.css hides the heading).
(() => {
    if (window.__lumenActivity) return;
    window.__lumenActivity = true;

    const pretty = text => text.charAt(0) + text.slice(1).toLowerCase();

    function label() {
        for (const day of document.querySelectorAll(".AppDetailsMain .AppActivityDay")) {
            const heading = day.querySelector(":scope > .AppActivityDate");
            const date = heading?.textContent.trim();
            if (!date) continue;
            // The outermost .Event elements are the entries; news posts nest another .Event inside.
            for (const entry of day.querySelectorAll(".Event")) {
                if (entry.parentElement.closest(".Event")) continue;
                if (entry.dataset.lumenDate !== pretty(date)) entry.dataset.lumenDate = pretty(date);
            }
        }
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; label(); });
    }).observe(document.body, { childList: true, subtree: true });
    label();
})();
