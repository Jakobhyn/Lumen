// Sanity checks for the theme, run by CI and before a release:
//   node tools/check.js [--tag vX.Y.Z]
// - skin.json parses and every file it references exists
// - every relative @import / url() in theme CSS points at an existing file
// - every theme script passes `node --check`
// - root-colors.css only holds opaque #hex values (anything else breaks Steam's start)
// - with --tag, the tag matches the version in skin.json
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];
const fail = msg => errors.push(msg);
const exists = rel => fs.existsSync(path.join(root, rel));

let skin;
try {
    skin = JSON.parse(fs.readFileSync(path.join(root, "skin.json"), "utf8"));
} catch (e) {
    console.error(`skin.json: ${e.message}`);
    process.exit(1);
}

for (const key of ["name", "author", "description", "version"]) {
    if (!skin[key]) fail(`skin.json: missing "${key}"`);
}

// Files referenced from skin.json
const refs = new Set();
if (skin.RootColors) refs.add(skin.RootColors);
for (const [i, patch] of (skin.Patches || []).entries()) {
    if (!patch.MatchRegexString) fail(`skin.json: Patches[${i}] has no MatchRegexString`);
    for (const k of ["TargetCss", "TargetJs"]) if (patch[k]) refs.add(patch[k]);
}
for (const [name, cond] of Object.entries(skin.Conditions || {})) {
    if (cond.values && !(cond.default in cond.values)) fail(`skin.json: condition "${name}" default "${cond.default}" is not one of its values`);
    for (const value of Object.values(cond.values || {})) {
        for (const k of ["TargetCss", "TargetJs"]) if (value[k]?.src) refs.add(value[k].src);
    }
}
for (const rel of refs) if (!exists(rel)) fail(`skin.json references missing file: ${rel}`);

// Theme files (everything except dev tooling)
const skip = new Set([".git", ".github", "tools", "dev", "node_modules"]);
function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
        if (skip.has(d.name)) return [];
        const full = path.join(dir, d.name);
        return d.isDirectory() ? walk(full) : [path.relative(root, full).split(path.sep).join("/")];
    });
}
const files = walk(root);

for (const rel of files.filter(f => f.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(root, rel), "utf8");
    for (const [, url] of css.matchAll(/(?:@import\s+url\(|url\()\s*["']?([^"')]+)["']?\s*\)/g)) {
        if (/^(https?:|data:|#)/.test(url)) continue;
        const target = path.posix.join(path.posix.dirname(rel), url);
        if (!exists(target)) fail(`${rel}: url() points at missing file ${url}`);
    }
}

for (const rel of files.filter(f => f.endsWith(".js"))) {
    try {
        execFileSync(process.execPath, ["--check", path.join(root, rel)], { stdio: "pipe" });
    } catch (e) {
        fail(`${rel}: syntax error\n${String(e.stderr).trim()}`);
    }
}

if (skin.RootColors && exists(skin.RootColors)) {
    const css = fs.readFileSync(path.join(root, skin.RootColors), "utf8");
    for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        if (!/^#[0-9a-f]{6}$/i.test(value.trim())) fail(`${skin.RootColors}: ${name} must be an opaque #rrggbb color, got "${value.trim()}"`);
    }
}

const tagArg = process.argv.indexOf("--tag");
if (tagArg !== -1) {
    const tag = process.argv[tagArg + 1] || "";
    if (tag.replace(/^v/, "") !== skin.version) fail(`tag ${tag} does not match skin.json version ${skin.version}`);
}

if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(`\n${errors.length} problem(s) found.`);
    process.exit(1);
}
console.log(`✓ ${skin.name} ${skin.version}: ${refs.size} referenced files, ${files.length} theme files checked.`);
