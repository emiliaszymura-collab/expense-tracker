#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// Blask — masowy import katalogu produktów z Open Beauty Facts.
//
// Open Beauty Facts to otwarta baza (licencja ODbL) setek tysięcy realnych
// kosmetyków: nazwy, marki, zdjęcia, kody EAN, pojemności. Ten skrypt
// pobiera produkty marek z rejestru Blask i zapisuje je do
// renderer/catalog.js jako przeszukiwalny katalog (bez cen — ceny dokłada
// synchronizacja feedów sklepów, sync/sync.mjs).
//
// Uruchomienie:
//   node sync/import-catalog.mjs                 # wszystkie marki z rejestru
//   node sync/import-catalog.mjs "Ziaja" "CeraVe"  # wybrane marki
//   BLASK_MAX_PER_BRAND=60 node sync/import-catalog.mjs
//
// Wymaga dostępu do internetu (world.openbeautyfacts.org).
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.join(here, "..", "renderer");
const outFile = path.join(rendererDir, "catalog.js");
const MAX = parseInt(process.env.BLASK_MAX_PER_BRAND || "40", 10);
const PAGE = 100;

// ── marki: z argumentów albo z rejestru w data.js ──
function loadBrands() {
  if (process.argv.length > 2) return process.argv.slice(2);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(rendererDir, "data.js"), "utf8"), ctx);
  const set = {};
  (ctx.BRANDS || []).forEach(b => set[b] = 1);
  (ctx.P || []).forEach(p => set[p.brand] = 1);
  return Object.keys(set).sort((a, b) => a.localeCompare(b, "pl"));
}

const DIAC = { "ł": "l", "ó": "o", "ą": "a", "ę": "e", "ś": "s", "ż": "z", "ź": "z", "ć": "c", "ń": "n" };
const norm = s => (s || "").toLowerCase().replace(/[łóąęśżźćń]/g, m => DIAC[m] || m);
const compact = s => norm(s).replace(/[^a-z0-9]+/g, "");
function mapCat(s) {
  s = norm(s);
  if (/(perfum|eau de|fragrance|cologne)/.test(s)) return "Zapachy";
  if (/(hair|wlos|szampon|shampoo|conditioner)/.test(s)) return "Włosy";
  if (/(makeup|make-up|makijaz|mascara|lipstick|foundation|nail)/.test(s)) return "Makijaż";
  if (/(body|cial|shower|deodorant|hand|soap)/.test(s)) return "Pielęgnacja ciała";
  return "Pielęgnacja twarzy";
}

async function fetchJSON(url) {
  const backoff = [0, 1500, 3000, 6000];
  let last;
  for (let i = 0; i < backoff.length; i++) {
    if (backoff[i]) await new Promise(r => setTimeout(r, backoff[i]));
    try {
      const res = await fetch(url, { headers: { "user-agent": "BlaskCatalog/1.0 (kontakt: blask.app)" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) { last = e; }
  }
  throw last;
}

// Porządkowanie nazw z OBF: usuwa powtórzoną pojemność, końcowe nawiasy
// z obcymi dopiskami, zdublowany prefiks marki i nadmiar spacji.
function cleanName(name, brand) {
  let s = (name || "").replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\([^()]*\)\s*$/g, " ").trim();            // końcowy nawias
  s = s.replace(/[\s,–-]*\b\d+(?:[.,]\d+)?\s?(ml|g|l|szt)\b\.?$/i, "").trim(); // końcowa pojemność
  if (brand) {                                                 // zdublowany prefiks marki
    const b = brand.trim();
    const re = new RegExp("^(" + b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\s+\\1\\b", "i");
    s = s.replace(re, "$1");
  }
  s = s.replace(/[\s,;:–-]+$/, "").trim();
  return s || name;
}

async function fetchBrand(brand) {
  const items = [];
  const fields = "code,product_name,product_name_pl,brands,quantity,categories," +
    "image_front_small_url,image_front_url,image_small_url,image_url,image_thumb_url";
  for (let page = 1; items.length < MAX; page++) {
    const url = "https://world.openbeautyfacts.org/cgi/search.pl?action=process&json=1" +
      "&tagtype_0=brands&tag_contains_0=contains&tag_0=" + encodeURIComponent(brand) +
      "&page_size=" + PAGE + "&page=" + page + "&sort_by=unique_scans_n&fields=" + fields;
    let js;
    try { js = await fetchJSON(url); } catch { break; }
    const prods = js.products || [];
    if (!prods.length) break;
    for (const p of prods) {
      const rawName = (p.product_name_pl || p.product_name || "").trim();
      if (!rawName) continue;
      const name = cleanName(rawName, brand);
      items.push({
        brand,
        name,
        ean: p.code || "",
        img: p.image_front_small_url || p.image_small_url || p.image_front_url || p.image_url || p.image_thumb_url || "",
        cat: mapCat((p.categories || "") + " " + name),
        vol: (p.quantity || "").trim()
      });
      if (items.length >= MAX) break;
    }
    if (prods.length < PAGE) break;
  }
  return items;
}

// ── główna pętla ──
const brands = loadBrands();
console.log(`Import katalogu z Open Beauty Facts — ${brands.length} marek, do ${MAX} produktów na markę.\n`);

const all = [];
const seen = new Set();
let done = 0;
for (const brand of brands) {
  process.stdout.write(`↓ ${brand} … `);
  let items = [];
  try { items = await fetchBrand(brand); }
  catch (e) { console.log(`błąd (${e.message})`); continue; }
  let added = 0;
  for (const it of items) {
    const key = it.ean || compact(it.brand + it.name);
    if (seen.has(key)) continue;
    seen.add(key); all.push(it); added++;
  }
  done++;
  console.log(`${added} produktów`);
}

if (!all.length) {
  console.log("\nNie pobrano żadnych produktów (brak sieci lub 0 wyników). catalog.js bez zmian.");
  process.exit(0);
}

writeFileSync(outFile,
  "// Wygenerowane przez sync/import-catalog.mjs — " + new Date().toISOString().slice(0, 10) + ".\n" +
  "// Realne produkty z Open Beauty Facts (ODbL). Ceny dokłada sync/sync.mjs.\n" +
  "var FEED_CATALOG = " + JSON.stringify(all) + ";\n");

console.log(`\n──────── PODSUMOWANIE ────────`);
console.log(`Marki przetworzone: ${done}/${brands.length}`);
console.log(`Produkty w katalogu: ${all.length}`);
console.log(`Zapisano: renderer/catalog.js`);
console.log(`Uruchom aplikację: npm start`);
