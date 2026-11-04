// Talk to Steam's CEF windows over the remote debugging port.
//   node cdp.js list
//   node cdp.js eval <target> <file.js | -e "expr">
//   node cdp.js shot <target> <out.png>
//   node cdp.js nav <target> <url>
// <target> matches a window title, else its URL: "^Steam$" is an exact
// match, anything else matches as a substring ("store.steampowered.com/app").
const fs = require("fs");
const [cmd, match, arg, arg2] = process.argv.slice(2);

function matcher(pattern) {
  const exact = /^\^(.*)\$$/.exec(pattern);
  return exact ? s => s === exact[1] : s => s.includes(pattern);
}

async function targets() {
  return (await (await fetch("http://127.0.0.1:8080/json")).json()).filter(t => t.webSocketDebuggerUrl);
}

function session(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  return new Promise((res, rej) => { ws.onopen = () => res({ send, close: () => ws.close() }); ws.onerror = rej; });
}

(async () => {
  const list = await targets();
  if (cmd === "list") { for (const t of list) console.log(`${t.type.padEnd(8)} ${JSON.stringify(t.title).slice(0, 60).padEnd(60)} ${t.url.slice(0, 110)}`); return; }
  const hit = matcher(match);
  const t = list.find(t => hit(t.title)) || list.find(t => hit(t.url));
  if (!t) { console.error("no target for", match); process.exit(1); }
  const s = await session(t.webSocketDebuggerUrl);
  if (cmd === "eval") {
    const expr = arg === "-e" ? arg2 : fs.readFileSync(arg, "utf8");
    const r = await s.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, allowUnsafeEvalBlockedByCSP: true });
    const v = r.result?.result;
    console.log(r.result?.exceptionDetails ? "EXC " + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails) : typeof v?.value === "string" ? v.value : JSON.stringify(v?.value ?? v, null, 1));
  } else if (cmd === "shot") {
    const r = await s.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(arg, Buffer.from(r.result.data, "base64"));
    console.log("saved", arg);
  } else if (cmd === "nav") {
    await s.send("Page.navigate", { url: arg });
    console.log("navigated");
  }
  s.close();
})().catch(e => { console.error(String(e)); process.exit(1); });
