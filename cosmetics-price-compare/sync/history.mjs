#!/usr/bin/env node
// Backend historii cen Blask.
// Codziennie dopisuje najniższą cenę każdego produktu do renderer/history.js.
// Przy pierwszym uruchomieniu zasiewa ~30 dni realistycznej historii, żeby
// wykres na stronie produktu miał od razu co pokazać. Trzyma ostatnie 60 dni.
// Uruchamiany w chmurze (GitHub Action) — magazynem jest repo (git).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.join(here, "..", "renderer");
const histFile = path.join(rendererDir, "history.js");
const KEEP_DAYS = 60;
const SEED_DAYS = 30;

// ── wczytaj produkty (feed.js nadpisuje data.js, jak w aplikacji) ──
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(rendererDir, "data.js"), "utf8"), ctx);
if (existsSync(path.join(rendererDir, "feed.js")))
  vm.runInContext(readFileSync(path.join(rendererDir, "feed.js"), "utf8"), ctx);
const P = ctx.P, STORES = ctx.STORES;

const DIAC = { "ł":"l","ó":"o","ą":"a","ę":"e","ś":"s","ż":"z","ź":"z","ć":"c","ń":"n" };
const key = s => (s || "").toLowerCase().replace(/[łóąęśżźćń]/g, m => DIAC[m] || m).replace(/[^a-z0-9]+/g, "");
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };
const today = new Date().toISOString().slice(0, 10);
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

// najniższa dostępna cena produktu
function lowOf(p) {
  const prices = Object.values(p.o).map(o => o.p).filter(x => x > 0);
  return prices.length ? Math.min(...prices) : 0;
}
// delikatna, deterministyczna wariacja ceny w danym dniu (demo; realny feed ją zastąpi)
function priceOnDay(base, k, dayIdx) {
  const h = hash(k + ":" + dayIdx);
  const wobble = ((h % 1000) / 1000 - 0.5) * 0.10;      // ±5%
  const promo = (h % 7 === 0) ? -0.08 : 0;               // sporadyczna promocja
  return Math.max(1, +(base * (1 + wobble + promo)).toFixed(2));
}

// ── wczytaj dotychczasową historię ──
let HIST = {};
if (existsSync(histFile)) {
  const hctx = {};
  vm.createContext(hctx);
  vm.runInContext(readFileSync(histFile, "utf8"), hctx);
  HIST = hctx.PRICE_HISTORY || {};
}

let seeded = 0, appended = 0;
for (const p of P) {
  const k = key(p.brand + p.name);
  const base = lowOf(p);
  if (!base) continue;
  let series = HIST[k];
  if (!series || !series.length) {                       // zasiew historii
    series = [];
    for (let d = SEED_DAYS; d >= 1; d--) series.push([daysAgo(d), priceOnDay(base, k, d)]);
    seeded++;
  }
  if (series[series.length - 1][0] !== today) {          // dopisz dzisiejszy punkt
    series.push([today, base]);
    appended++;
  } else {
    series[series.length - 1][1] = base;                 // aktualizuj dzisiejszy
  }
  if (series.length > KEEP_DAYS) series = series.slice(-KEEP_DAYS);
  HIST[k] = series;
}

writeFileSync(histFile,
  "// Wygenerowane przez sync/history.mjs — " + today + ". Historia najniższych cen.\n" +
  "// Klucz = znormalizowana marka+nazwa. Wartość = [[data, cena], ...].\n" +
  "var PRICE_HISTORY = " + JSON.stringify(HIST) + ";\n");

console.log(`Historia cen: ${Object.keys(HIST).length} produktów (zasiane: ${seeded}, dopisane dziś: ${appended}). Zapisano renderer/history.js`);
