// Lumen: the two jump buttons of a game page (Library page: Cinematic).
// "More" under the links glides down to activity and achievements, since the
// art fills the first screen; "Top" floats at the bottom centre of the page
// once you have scrolled down and glides back up. Both are centred on the
// game page itself, and Top replaces Steam's own scroll-to-top bar there.
(() => {
    if (window.__lumenMore) return;
    window.__lumenMore = true;

    const language = new URLSearchParams(location.search).get("LANGUAGE");
    const moreLabels = { german: "Mehr", french: "Plus", spanish: "Más", italian: "Altro", dutch: "Meer", polish: "Więcej" };
    const topLabels = { german: "Nach oben", french: "Haut", spanish: "Arriba", italian: "Su", dutch: "Omhoog", polish: "Do góry" };
    const chevron = d => `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
    const SHOW_TOP_AFTER = 400;

    function button(className, html, label, onClick) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = className;
        b.innerHTML = html;
        b.querySelector("span").textContent = label;
        b.addEventListener("click", onClick);
        return b;
    }

    const buildMore = scroller => button("lumen-more", `<span></span>${chevron("M3.5 6l4.5 4.5L12.5 6")}`, moreLabels[language] || "More", () => {
        const content = scroller.querySelector(".ColumnContainer");
        if (!content) return;
        const top = content.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 16;
        scroller.scrollTo({ top, behavior: "smooth" });
    });

    const buildTop = scroller => button("lumen-top", `${chevron("M3.5 10l4.5-4.5L12.5 10")}<span></span>`, topLabels[language] || "Top", () => {
        scroller.scrollTo({ top: 0, behavior: "smooth" });
    });

    function sync(scroller) {
        scroller.querySelector(".lumen-more")?.classList.toggle("is-away", scroller.scrollTop > 40);
        scroller.querySelector(":scope > .lumen-top-dock .lumen-top")?.classList.toggle("is-shown", scroller.scrollTop > SHOW_TOP_AFTER);
    }

    const watched = new WeakSet();

    function mount() {
        const page = document.querySelector(".AppDetailsMain");
        const scroller = page?.querySelector(".Body.ScrollContainer");
        if (!scroller) return;

        const links = scroller.querySelector(".LinksSection");
        if (links && !links.nextElementSibling?.classList.contains("lumen-more")) {
            scroller.querySelectorAll(".lumen-more").forEach(b => b.remove());
            links.after(buildMore(scroller));
        }
        // Docked as the scroller's last child with position: sticky, so it stays
        // at the bottom centre of the page while scrolling (the page frame
        // itself has no height to anchor to).
        if (!scroller.querySelector(":scope > .lumen-top-dock")) {
            const dock = document.createElement("div");
            dock.className = "lumen-top-dock";
            dock.append(buildTop(scroller));
            scroller.append(dock);
        }

        if (!watched.has(scroller)) {
            watched.add(scroller);
            scroller.addEventListener("scroll", () => sync(scroller), { passive: true });
        }
        sync(scroller);
    }

    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; mount(); });
    }).observe(document.body, { childList: true, subtree: true });
    mount();
})();
