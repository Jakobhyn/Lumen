// Lumen: a tiny DASH player for Steam's trailers, shared by the store page
// (store/hero.js) and the library game page (js/library-trailer.js).
// Steam ships trailers only as DASH/HLS streams; this reads a static,
// number-based SegmentTemplate manifest and feeds it to Media Source, one
// chunk ahead of playback. Background trailers play muted and skip the audio;
// the store's media viewer asks for it.
(() => {
    if (window.LumenDash) return;

    function parseDuration(iso) {
        const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?/.exec(iso || "");
        return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
    }

    // One track of the manifest; `width` picks the video stream (audio has one).
    function parseTrack(xml, type, url, width) {
        const set = [...xml.querySelectorAll("AdaptationSet")].find(a => a.getAttribute("contentType") === type);
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

    // `width` is the on-screen width in device pixels the video should fill.
    // Gives the video track, with the audio track (or null) as `audio`.
    function parseManifest(text, url, width) {
        const xml = new DOMParser().parseFromString(text, "application/xml");
        const video = parseTrack(xml, "video", url, width);
        return video && { ...video, audio: parseTrack(xml, "audio", url, width) };
    }

    // Resolves true once the whole trailer is buffered (the video then loops
    // on its own), false if this browser can't play it. Stops early when the
    // video leaves the page or gets another trailer.
    // `width` (CSS pixels) overrides the video's own width, which is still
    // the 300px default while it has no source.
    async function play(video, manifestUrl, { audio = false, width: cssWidth } = {}) {
        video.__lumenTrailer = manifestUrl;
        const current = () => video.isConnected && video.__lumenTrailer === manifestUrl;
        const width = (cssWidth || video.clientWidth || window.innerWidth) * (window.devicePixelRatio || 1);
        const stream = parseManifest(await (await fetch(manifestUrl)).text(), manifestUrl, width);
        if (!stream || !window.MediaSource || !current()) return false;
        const tracks = [stream, audio && stream.audio].filter(t => t && MediaSource.isTypeSupported(t.mime));
        if (tracks[0] !== stream) return false;

        const source = new MediaSource();
        video.src = URL.createObjectURL(source);
        await new Promise(r => source.addEventListener("sourceopen", r, { once: true }));
        const get = async url => new Uint8Array(await (await fetch(url)).arrayBuffer());

        // Both tracks fill their own buffer side by side; playback starts with
        // the first video chunk.
        const pump = async (track, buffer) => {
            const append = data => new Promise((resolve, reject) => {
                buffer.addEventListener("updateend", resolve, { once: true });
                buffer.addEventListener("error", reject, { once: true });
                buffer.appendBuffer(data);
            });
            await append(await get(track.init));
            let next = get(track.chunks[0]);
            for (let i = 0; i < track.chunks.length; i++) {
                const data = await next;
                if (!current()) return false;
                if (i + 1 < track.chunks.length) next = get(track.chunks[i + 1]);
                await append(data);
                if (i === 0 && track === stream) video.play().catch(() => {});
            }
            return true;
        };
        const buffers = tracks.map(t => source.addSourceBuffer(t.mime));
        const done = await Promise.all(tracks.map((t, i) => pump(t, buffers[i])));
        if (done.includes(false)) return false;
        source.endOfStream();
        return true;
    }

    window.LumenDash = { play, parseManifest, parseDuration };
})();
