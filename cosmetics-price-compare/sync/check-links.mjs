#!/usr/bin/env node
// Tester linków Blask: sprawdza, czy adresy sklepów (wyszukiwarki) odpowiadają.
// Uruchamiany w chmurze (GitHub Action) — ma dostęp do sklepów, którego
// lokalne środowisko nie ma. Raportuje status HTTP każdego sklepu.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(here, "..", "renderer", "data.js"), "utf8"), ctx);
const STORES = ctx.STORES;

const TESTQ = "cerave";
const UA = "Mozilla/5.0 (compatible; BlaskLinkCheck/1.0)";

async function check(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA }, signal: ctl.signal });
    clearTimeout(t);
    return { ok: res.ok, status: res.status, final: res.url };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, error: e.code || e.name || String(e).slice(0, 40) };
  }
}

const rows = [];
for (const name of Object.keys(STORES)) {
  const st = STORES[name];
  const url = st.search ? st.search.replace("{q}", encodeURIComponent(TESTQ)) : st.url;
  const r = await check(url);
  const mark = r.ok ? "✓ OK" : (r.status ? "✗ " + r.status : "✗ " + (r.error || "błąd"));
  rows.push({ name, url, mark, ok: r.ok });
  console.log(mark.padEnd(10), name.padEnd(12), url);
}

const bad = rows.filter(r => !r.ok);
console.log("\n──────── PODSUMOWANIE ────────");
console.log("Sprawdzono sklepów:", rows.length, "| działa:", rows.length - bad.length, "| problem:", bad.length);
if (bad.length) {
  console.log("Do naprawy:");
  bad.forEach(r => console.log("  •", r.name, "→", r.mark));
  process.exitCode = 1;
}
