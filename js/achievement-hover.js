// Lumen: achievement details beside the pointer.
// Steam opens an achievement's details card on top of the achievement, so it
// covers the pointer and the entry you are looking at. This keeps the card
// to the right of the pointer (or to its left near the window's edge), and
// it follows the pointer while you move along the entry.
(() => {
    if (window.__lumenAchievementHover) return;
    window.__lumenAchievementHover = true;

    const GAP = 18;     // between pointer and card
    const MARGIN = 8;   // to the window's edges
    let x = 0, y = 0, overAchievement = false, queued = false;

    // Only touch the style when it differs, so our own change does not wake
    // the observer below again.
    function set(box, prop, value) {
        if (box.style.getPropertyValue(prop) === value && box.style.getPropertyPriority(prop) === "important") return;
        box.style.setProperty(prop, value, "important");
    }

    function place() {
        queued = false;
        if (!overAchievement) return;
        for (const box of document.querySelectorAll(".HoverPosition")) {
            if (!box.querySelector(".AppDetailsHover")) continue;
            const { width, height } = box.getBoundingClientRect();
            let left = x + GAP;
            if (left + width > window.innerWidth - MARGIN) left = Math.max(MARGIN, x - GAP - width);
            const top = Math.min(Math.max(MARGIN, y - height / 2), Math.max(MARGIN, window.innerHeight - height - MARGIN));
            set(box, "left", `${Math.round(left)}px`);
            set(box, "top", `${Math.round(top)}px`);
        }
    }

    const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(place);
    };

    document.addEventListener("mousemove", e => {
        x = e.clientX;
        y = e.clientY;
        overAchievement = !!e.target.closest?.("[class*='Achievement']");
        schedule();
    }, { capture: true, passive: true });

    // Steam builds the card after the pointer stops, then reuses it and sets
    // its own position on it each time; move it whenever that happens.
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
})();
