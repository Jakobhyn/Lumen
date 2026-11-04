const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    { ignores: ["node_modules/", "dev/", "tools/.push.js"] },
    js.configs.recommended,
    {
        // Theme scripts (and the probe evaluated by tools/cdp.js) run inside Steam's Chromium windows.
        files: ["store/**/*.js", "js/**/*.js", "shared/**/*.js", "tools/probe.js"],
        languageOptions: { sourceType: "script", globals: { ...globals.browser } },
    },
    {
        files: ["tools/**/*.js", "test/**/*.js", "eslint.config.js"],
        ignores: ["tools/probe.js"],
        languageOptions: { sourceType: "commonjs", globals: { ...globals.node, WebSocket: "readonly" } },
    },
];
