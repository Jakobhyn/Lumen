// Lumen: the "More" button under a game page's links (Library page: Cinematic).
// The art fills the first screen, so activity, achievements and the rest
// start below the fold; this button glides down to them and fades out once
// you have scrolled.
(() => {
    if (window.__lumenMore) return;
    window.__lumenMore = true;

    const labels = { german: "Mehr", french: "Plus", spanish: "Más", italian: "Altro", dutch: "Meer", polish: "Więcej" };
    const label = labels[new URLSearchParams(location.search).get("LANGUAGE")] || "More";

    function build(scroller) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "lumen-more";
        button.innerHTML = `<span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M3.5 6l4.5 4.5L12.5 6"/></svg>`;
        button.querySelector("span").textContent = label;
        button.addEventListener("click", () => {
            const content = scroller.querySelector(".ColumnContainer") || button.nextElementSibling;
            if (!content) return;
            const top = content.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
            scroller.scrollTo({ top, behavior: "smooth" });
        });
        return button;
    }

    const watched = new WeakSet();

    function mount() {
        const scroller = document.querySelector(".AppDetailsMain .Body.ScrollContainer");
        const links = scroller?.querySelector(".LinksSection");
        if (!links || links.nextElementSibling?.classList.contains("lumen-more")) return;
        scroller.querySelectorAll(".lumen-more").forEach(b => b.remove());
        const button = build(scroller);
        links.after(button);
        if (!watched.has(scroller)) {
            watched.add(scroller);
            scroller.addEventListener("scroll", () => {
                scroller.querySelector(".lumen-more")?.classList.toggle("is-away", scroller.scrollTop > 40);
            }, { passive: true });
        }
        button.classList.toggle("is-away", scroller.scrollTop > 40);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; mount(); });
    }).observe(document.body, { childList: true, subtree: true });
    mount();
})();
