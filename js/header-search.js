// Lumen: the game search in the middle of the header (Header: Compact).
// The field mirrors what you type into Steam's own library search, so the
// game list filters exactly like Steam does it. From the store or community
// it switches to the library first. The filter icon opens Steam's filter.
(() => {
    if (window.__lumenSearch) return;
    window.__lumenSearch = true;

    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const librarySearch = () => document.querySelector(".LeftListSizableContainer .SearchInput input");
    const enabled = () => getComputedStyle(document.documentElement).getPropertyValue("--lumen-header").trim() === "compact";

    function waitFor(get, ms = 2000) {
        return new Promise(resolve => {
            const start = performance.now();
            (function poll() {
                const el = get();
                if (el || performance.now() - start > ms) resolve(el);
                else requestAnimationFrame(poll);
            })();
        });
    }

    async function target() {
        let input = librarySearch();
        if (!input) {
            [...document.querySelectorAll(".SuperNavMenu .MenuButton")][1]?.click(); // Library
            input = await waitFor(librarySearch);
        }
        return input;
    }

    function build() {
        const box = document.createElement("div");
        box.className = "lumen-search";
        box.innerHTML = `
            <svg class="lumen-search__icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M6.5 1a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 0 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 6.5 1Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>
            <input class="lumen-search__input" type="text" spellcheck="false">
            <button class="lumen-search__filter" type="button" title="Filter"><svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.75 3h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Zm2 4h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1 0-1.5Zm2.5 4h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1 0-1.5Z"/></svg></button>`;

        const input = box.querySelector("input");
        input.placeholder = librarySearch()?.placeholder || "Search by Name";

        input.addEventListener("input", async () => {
            const lib = await target();
            if (!lib) return;
            setValue.call(lib, input.value);
            lib.dispatchEvent(new Event("input", { bubbles: true }));
        });
        input.addEventListener("keydown", e => {
            if (e.key === "Escape") { input.value = ""; input.dispatchEvent(new Event("input")); input.blur(); }
        });
        box.querySelector(".lumen-search__filter").addEventListener("click", async () => {
            const lib = await target();
            lib?.closest(".SearchInput")?.nextElementSibling?.querySelector(".tool-tip-source, [class*=Focusable]")?.click();
        });
        return box;
    }

    // Steam re-renders the header now and then; keep the field in place.
    let box;
    function mount() {
        const bar = document.querySelector(".TopBar");
        if (!bar || !enabled()) return;
        if (!box) box = build();
        if (box.parentElement !== bar) bar.append(box);
        // Keep the field in step when the library search is changed or cleared elsewhere.
        const lib = librarySearch();
        if (lib && document.activeElement !== box.querySelector("input")) box.querySelector("input").value = lib.value;
    }

    new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });
    mount();
})();
