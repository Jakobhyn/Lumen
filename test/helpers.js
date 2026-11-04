// Runs a theme script inside a jsdom page built from an HTML fixture.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function page(html, { url = "https://store.steampowered.com/app/1942280/Brotato/", vars = {} } = {}) {
    const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
        url,
        runScripts: "outside-only",
        pretendToBeVisual: true,
    });
    const { window } = dom;
    // Settings arrive as CSS variables from the option files; inline them here.
    for (const [name, value] of Object.entries(vars)) window.document.documentElement.style.setProperty(name, value);
    // jsdom lacks these; the theme only needs them to exist.
    window.IntersectionObserver = class { observe() {} disconnect() {} };
    window.matchMedia = () => ({ matches: false, addEventListener() {} });
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.HTMLMediaElement.prototype.pause = () => {};
    window.fetch = () => Promise.reject(new Error("no network in tests"));
    window.console.warn = () => {};
    return window;
}

function load(window, script) {
    window.eval(fs.readFileSync(path.join(__dirname, "..", script), "utf8"));
}

const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

module.exports = { page, load, tick };
