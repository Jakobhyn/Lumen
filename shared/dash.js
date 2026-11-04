// Lumen: a tiny DASH player for Steam's trailers, shared by the store page
// (store/hero.js) and the library game page (js/library-trailer.js).
// Steam ships trailers only as DASH/HLS streams; this reads a static,
// number-based SegmentTemplate manifest and feeds the video track to Media
// Source, one chunk ahead of playback. Audio is skipped: trailers play muted.
(() => {
    if (window.LumenDash) return;

    function parseDuration(iso) {
        const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/.exec(iso || "");
        return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    }

    // `width` is the on-screen width in device pixels the video should fill.
    function parseManifest(text, url, width) {
        const xml = new DOMParser().parseFromString(text, "application/xml");
        const set = [...xml.querySelectorAll("AdaptationSet")].find(a => a.getAttribute("contentType") === "video");
        if (!set) return null;

        // The smallest stream at least as wide as needed, else the biggest.
        const want = Math.min(1920, width);
        const reps = [...set.querySelectorAll("Representation")].sort((a, b) => a.getAttribute("width") - b.getAttribute("width"));
        const rep = reps.find(r => +r.getAttribute("width") >= want) || reps[reps.length - 1];
        const tpl = rep?.querySelector("SegmentTemplate") || set.querySelector("SegmentTemplate");
        if (!tpl) return null;

        const id = rep.getAttribute("id");
        const total = parseDuration(xml.documentElement.getAttribute("mediaPresentationDuration"));
        const segment = tpl.getAttribute("duration") / (tpl.getAttribute("timescale") || 1);
        const fill = (s, n) => s.replace("$RepresentationID$", id).replace(/\$Number%0(\d+)d\$/, (_, w) => String(n).padStart(+w, "0")).replace("$Number$", n);
        const base = new URL(".", url);
        const first = +(tpl.getAttribute("startNumber") || 1);

        return {
            mime: `${rep.getAttribute("mimeType")}; codecs="${rep.getAttribute("codecs")}"`,
            width: +rep.getAttribute("width"),
            init: new URL(fill(tpl.getAttribute("initialization"), 0), base).href,
            chunks: Array.from({ length: Math.ceil(total / segment) }, (_, i) => new URL(fill(tpl.getAttribute("media"), first + i), base).href),
        };
    }

    // Resolves true once the whole trailer is buffered (the video then loops
    // on its own), false if this browser can't play it. Stops early when the
    // video leaves the page or gets another trailer.
    async function play(video, manifestUrl) {
        video.__lumenTrailer = manifestUrl;
        const current = () => video.isConnected && video.__lumenTrailer === manifestUrl;
        const width = (video.clientWidth || window.innerWidth) * (window.devicePixelRatio || 1);
        const stream = parseManifest(await (await fetch(manifestUrl)).text(), manifestUrl, width);
        if (!stream || !window.MediaSource || !MediaSource.isTypeSupported(stream.mime) || !current()) return false;

        const source = new MediaSource();
        video.src = URL.createObjectURL(source);
        await new Promise(r => source.addEventListener("sourceopen", r, { once: true }));
        const buffer = source.addSourceBuffer(stream.mime);
        const append = data => new Promise((resolve, reject) => {
            buffer.addEventListener("updateend", resolve, { once: true });
            buffer.addEventListener("error", reject, { once: true });
            buffer.appendBuffer(data);
        });
        const get = async url => new Uint8Array(await (await fetch(url)).arrayBuffer());

        await append(await get(stream.init));
        let next = get(stream.chunks[0]);
        for (let i = 0; i < stream.chunks.length; i++) {
            const data = await next;
            if (!current()) return false;
            if (i + 1 < stream.chunks.length) next = get(stream.chunks[i + 1]);
            await append(data);
            if (i === 0) video.play().catch(() => {});
        }
        source.endOfStream();
        return true;
    }

    window.LumenDash = { play, parseManifest, parseDuration };
})();
