#!/bin/sh
# Live-inject a theme CSS file into a Steam window for quick iteration:
#   sh push.sh <target> <css file> [screenshot.png]
T="$1"; CSS="$2"; SHOT="$3"
node -e '
const css = require("fs").readFileSync(process.argv[1], "utf8");
process.stdout.write(`(() => { let s = document.getElementById("lumen-dev"); if (!s) { s = document.createElement("style"); s.id = "lumen-dev"; document.head.append(s); } s.textContent = ${JSON.stringify(css)}; return "pushed " + s.textContent.length; })()`);
' "$CSS" > "$(dirname "$0")/.push.js"
node "$(dirname "$0")/cdp.js" eval "$T" "$(dirname "$0")/.push.js"
[ -n "$SHOT" ] && sleep 1 && node "$(dirname "$0")/cdp.js" shot "$T" "$SHOT"
