// Print the ancestor chain (classes + key styles) of elements found by text or point.
(() => {
  const desc = e => {
    const cs = getComputedStyle(e);
    return `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${String(e.className).trim().split(/\s+/).join(".")} [bg=${cs.backgroundColor}${cs.backgroundImage !== "none" ? " img" : ""} fg=${cs.color} h=${Math.round(e.getBoundingClientRect().height)}]`;
  };
  const chain = (e, n = 6) => { const out = []; for (; e && e !== document.body && out.length < n; e = e.parentElement) out.push(desc(e)); return out; };
  const byText = t => [...document.querySelectorAll("body *")].find(e => e.children.length === 0 && e.textContent.trim() === t);
  const probes = window.__probe || {};
  const result = {};
  for (const [k, v] of Object.entries(probes)) {
    const e = Array.isArray(v) ? document.elementFromPoint(v[0], v[1]) : byText(v);
    result[k] = e ? chain(e) : "not found";
  }
  return result;
})()
