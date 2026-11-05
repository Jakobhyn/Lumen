// shared/dash.js: reading Steam's trailer manifests.
const { test } = require("node:test");
const assert = require("node:assert");
const { page, load } = require("./helpers");

// Trimmed from a real store trailer manifest (Brotato, dash_h264.mpd).
const url = "https://video.fastly.steamstatic.com/store_trailers/1942280/776977/abc/1750742089/dash_h264.mpd?t=1729849696";
const mpd = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT1M0.0S">
  <Period id="0" start="PT0.0S">
    <AdaptationSet id="0" contentType="video">
      <Representation id="0" mimeType="video/mp4" codecs="avc1.640029" width="1920" height="1080">
        <SegmentTemplate timescale="1000000" duration="3000000" initialization="dash_h264/init-stream$RepresentationID$.m4s" media="dash_h264/chunk-stream$RepresentationID$-$Number%05d$.m4s" startNumber="1"/>
      </Representation>
      <Representation id="1" mimeType="video/mp4" codecs="avc1.640029" width="1280" height="720">
        <SegmentTemplate timescale="1000000" duration="3000000" initialization="dash_h264/init-stream$RepresentationID$.m4s" media="dash_h264/chunk-stream$RepresentationID$-$Number%05d$.m4s" startNumber="1"/>
      </Representation>
      <Representation id="2" mimeType="video/mp4" codecs="avc1.640029" width="854" height="480">
        <SegmentTemplate timescale="1000000" duration="3000000" initialization="dash_h264/init-stream$RepresentationID$.m4s" media="dash_h264/chunk-stream$RepresentationID$-$Number%05d$.m4s" startNumber="1"/>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="1" contentType="audio">
      <Representation id="4" mimeType="audio/mp4" codecs="mp4a.40.2">
        <SegmentTemplate timescale="1000000" duration="3000000" initialization="dash_h264/init-stream$RepresentationID$.m4s" media="dash_h264/chunk-stream$RepresentationID$-$Number%05d$.m4s" startNumber="1"/>
      </Representation>
    </AdaptationSet>
  </Period>
</MPD>`;

function dash() {
    const w = page("");
    load(w, "shared/dash.js");
    return w.LumenDash;
}

test("parses ISO durations", () => {
    const { parseDuration } = dash();
    assert.strictEqual(parseDuration("PT1M0.0S"), 60);
    assert.strictEqual(parseDuration("PT1H2M3.5S"), 3723.5);
    assert.strictEqual(parseDuration(""), 0);
});

test("picks the smallest video stream that fills the width", () => {
    const { parseManifest } = dash();
    assert.strictEqual(parseManifest(mpd, url, 1700).width, 1920);
    assert.strictEqual(parseManifest(mpd, url, 1000).width, 1280);
    assert.strictEqual(parseManifest(mpd, url, 600).width, 854);
    assert.strictEqual(parseManifest(mpd, url, 5000).width, 1920);
});

test("builds init and chunk URLs next to the manifest", () => {
    const s = dash().parseManifest(mpd, url, 1000);
    const base = "https://video.fastly.steamstatic.com/store_trailers/1942280/776977/abc/1750742089/dash_h264/";
    assert.strictEqual(s.mime, 'video/mp4; codecs="avc1.640029"');
    assert.strictEqual(s.init, base + "init-stream1.m4s");
    assert.strictEqual(s.chunks.length, 20);
    assert.strictEqual(s.chunks[0], base + "chunk-stream1-00001.m4s");
    assert.strictEqual(s.chunks[19], base + "chunk-stream1-00020.m4s");
});

test("reads the audio track alongside the video", () => {
    const { audio } = dash().parseManifest(mpd, url, 1000);
    const base = "https://video.fastly.steamstatic.com/store_trailers/1942280/776977/abc/1750742089/dash_h264/";
    assert.strictEqual(audio.mime, 'audio/mp4; codecs="mp4a.40.2"');
    assert.strictEqual(audio.init, base + "init-stream4.m4s");
    assert.strictEqual(audio.chunks[0], base + "chunk-stream4-00001.m4s");
    const silent = mpd.replace(/<AdaptationSet id="1"[\s\S]*?<\/AdaptationSet>/, "");
    assert.strictEqual(dash().parseManifest(silent, url, 1000).audio, null);
});

test("manifests without video give nothing", () => {
    const audioOnly = mpd.replace(/<AdaptationSet id="0"[\s\S]*?<\/AdaptationSet>/, "");
    assert.strictEqual(dash().parseManifest(audioOnly, url, 1000), null);
});

test("loading the file twice keeps the first player", () => {
    const w = page("");
    load(w, "shared/dash.js");
    const first = w.LumenDash;
    load(w, "shared/dash.js");
    assert.strictEqual(w.LumenDash, first);
});
