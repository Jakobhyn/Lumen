// tools/check.js against the real theme and against small broken fixtures.
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const check = path.join(__dirname, "..", "tools", "check.js");
const run = (root, ...args) => spawnSync(process.execPath, [check, ...args], {
    env: { ...process.env, ...(root ? { LUMEN_ROOT: root } : {}) },
    encoding: "utf8",
});

function fixture(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lumen-check-"));
    for (const [name, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
        fs.writeFileSync(path.join(dir, name), typeof content === "string" ? content : JSON.stringify(content));
    }
    return dir;
}

const skin = extra => ({ name: "T", author: "a", description: "d", version: "1.0.0", RootColors: "root.css", Patches: [], ...extra });

test("the theme itself passes", () => {
    const r = run(null);
    assert.strictEqual(r.status, 0, r.stderr);
});

test("a missing file referenced by a patch fails", () => {
    const r = run(fixture({
        "skin.json": skin({ Patches: [{ MatchRegexString: ".*", TargetCss: "nope.css" }] }),
        "root.css": ":root { --a: #112233; }",
    }));
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /missing file: nope\.css/);
});

test("a condition whose default is not one of its values fails", () => {
    const r = run(fixture({
        "skin.json": skin({ Conditions: { X: { default: "C", values: { A: {}, B: {} } } } }),
        "root.css": ":root { --a: #112233; }",
    }));
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /default "C" is not one of its values/);
});

test("non-hex RootColors fail (they break Steam's start)", () => {
    const r = run(fixture({ "skin.json": skin(), "root.css": ":root { --a: rgba(0, 0, 0, 0.3); }" }));
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /opaque #rrggbb/);
});

test("a CSS url() to a missing file fails", () => {
    const r = run(fixture({
        "skin.json": skin(),
        "root.css": ":root { --a: #112233; }",
        "a.css": "@import url(\"./missing.css\");",
    }));
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /a\.css: url\(\) points at missing file/);
});

test("a script with a syntax error fails", () => {
    const r = run(fixture({ "skin.json": skin(), "root.css": ":root { --a: #112233; }", "x.js": "function (" }));
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /x\.js: syntax error/);
});

test("--tag must match the skin.json version", () => {
    const root = fixture({ "skin.json": skin(), "root.css": ":root { --a: #112233; }" });
    assert.strictEqual(run(root, "--tag", "v1.0.0").status, 0);
    const r = run(root, "--tag", "v2.0.0");
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /does not match/);
});
