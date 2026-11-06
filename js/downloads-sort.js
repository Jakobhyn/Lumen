// Lumen: "Smallest first" on the downloads page.
// One click moves every scheduled update into Up Next and orders the whole
// queue by what is left to download, smallest first, instead of dragging
// each game up by hand. Data and actions come from the shared Steam
// context (window.opener): downloadsStore and SteamClient.Downloads.
(() => {
    if (window.__lumenDownloadsSort) return;
    window.__lumenDownloadsSort = true;

    const language = new URLSearchParams(location.search).get("LANGUAGE") || "english";
    const t = {
        german: { label: "Kleinste zuerst", title: "Alle geplanten Updates in die Warteschlange holen und nach Downloadgröße sortieren, kleinste zuerst" },
    }[language] || { label: "Smallest first", title: "Move all scheduled updates to Up Next and sort the queue by download size, smallest first" };
    const icon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M2.5 4h4M2.5 8h7M2.5 12h11"/></svg>';

    const shared = () => window.opener || window;

    // What is still to download: the largest remaining stage of the update.
    function remaining(transfer) {
        let bytes = 0;
        for (const type of transfer.update_type_info || []) {
            if (!type.has_update) continue;
            for (const p of type.progress || []) bytes = Math.max(bytes, (p.bytes_total || 0) - (p.bytes_in_progress || 0));
        }
        return bytes;
    }

    // Queued first by their current order, then the scheduled ones; the sort
    // is stable, so equal sizes keep that order.
    function plan(store) {
        const queued = [...(store.QueuedTransfers || [])].sort((a, b) => a.queue_index - b.queue_index);
        const scheduled = [...(store.ScheduledTransfers || [])];
        const order = [...queued, ...scheduled]
            .map(tr => ({ appid: tr.appid, bytes: remaining(tr), scheduled: scheduled.includes(tr) }))
            .sort((a, b) => a.bytes - b.bytes);
        return order;
    }

    async function run(button) {
        const s = shared();
        const downloads = s.SteamClient?.Downloads;
        const store = s.downloadsStore;
        if (!downloads || !store) return;
        button.disabled = true;
        try {
            const order = plan(store);
            for (const item of order) if (item.scheduled) downloads.QueueAppUpdate(item.appid);
            // Give Steam a moment to put the scheduled ones into the queue.
            await new Promise(r => setTimeout(r, 400));
            order.forEach((item, index) => downloads.SetQueueIndex(item.appid, index));
        } finally {
            setTimeout(() => { button.disabled = false; }, 600);
        }
    }

    function mount() {
        const store = shared().downloadsStore;
        // Up Next is the first section of the list.
        const header = document.querySelector(".DownloadsPage .ItemListWrapper .Section .SectionTitle");
        if (!header || !store) return;
        const count = (store.QueuedTransfers?.length || 0) + (store.ScheduledTransfers?.length || 0);
        let button = header.querySelector(".lumen-sort-queue");
        if (count < 2) { button?.remove(); return; }
        if (button) return;
        button = document.createElement("button");
        button.type = "button";
        button.className = "lumen-sort-queue";
        button.title = t.title;
        button.innerHTML = `${icon}<span></span>`;
        button.querySelector("span").textContent = t.label;
        button.addEventListener("click", () => run(button));
        const rule = header.querySelector(".Rule");
        if (rule) rule.after(button);
        else header.append(button);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; mount(); });
    }).observe(document.body, { childList: true, subtree: true });
    mount();
})();
