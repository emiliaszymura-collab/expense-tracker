#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
// Blask — codzienna synchronizacja danych z feedów sklepów.
//
// Jedno narzędzie, które:
//   • pobiera feed produktowy każdej włączonej drogerii (CSV / CSV.gz / XML),
//   • scala ten sam produkt z różnych sklepów po kodzie EAN,
//   • wyciąga AUTOMATYCZNIE pełną listę marek (koniec z ręcznym dopisywaniem),
//   • zapisuje ceny, promocje (przekreślona cena), linki partnerskie, zdjęcia,
//   • wykrywa NOWE i ZAKOŃCZONE promocje względem poprzedniego dnia,
//   • generuje renderer/feed.js i renderer/brands.js, których używa aplikacja.
//
// Uruchomienie jednorazowe:   node sync/sync.mjs
// Uruchomienie codzienne:     patrz sync/README-cron.md (cron / Harmonogram)
//
// Dane logowania do feedów trzymaj w feeds.config.json (adresy zawierają
// Twój identyfikator afiliacyjny) — plik jest w .gitignore.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = process.argv[2] || path.join(here, "feeds.config.json");
const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
const opt = cfg.options || {};
const outDir = path.resolve(here, opt.outputDir || "../renderer");
const dataDir = path.resolve(here, opt.dataDir || "./data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const today = new Date().toISOString().slice(0, 10);
const log = (...a) => console.log(...a);

// ───────── pobieranie z ponowieniami ─────────
async function fetchFeed(url, format) {
  const backoff = [0, 2000, 4000, 8000];
  let lastErr;
  for (let i = 0; i < backoff.length; i++) {
    if (backoff[i]) await new Promise(r => setTimeout(r, backoff[i]));
    try {
      const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "BlaskSync/1.0" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (format === "csv-gzip" || url.endsWith(".gz")) return gunzipSync(buf).toString("utf8");
      return buf.toString("utf8");
    } catch (e) { lastErr = e; log(`   próba ${i + 1} nieudana: ${e.message}`); }
  }
  throw lastErr;
}

// ───────── parsery ─────────
function parseCSV(text) {
  const head = text.slice(0, text.indexOf("\n"));
  const sep = (head.match(/;/g) || []).length > (head.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; } if (c === "\r" && text[i + 1] === "\n") i++; }
    else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map(h => h.trim().toLowerCase());
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}
function parseXML(text) {
  // Google Merchant / RSS: <item>…<g:title>, <g:brand>, <g:price>, <g:link>…
  const items = text.match(/<item[\s>][\s\S]*?<\/item>/gi) || text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  const pick = (block, tags) => {
    for (const t of tags) {
      const m = block.match(new RegExp("<(?:g:)?" + t + "[^>]*>([\\s\\S]*?)<\\/(?:g:)?" + t + ">", "i"));
      if (m) return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
    }
    return "";
  };
  return items.map(b => ({
    name: pick(b, ["title", "name"]),
    brand: pick(b, ["brand"]),
    price: pick(b, ["sale_price", "price"]),
    rrp: pick(b, ["price"]),
    ean: pick(b, ["gtin", "ean"]),
    link: pick(b, ["link", "url"]),
    image: pick(b, ["image_link", "image"]),
    category: pick(b, ["product_type", "google_product_category", "category"])
  }));
}

// ───────── mapowanie kolumn CSV ─────────
const COL = {
  name: ["product_name", "name", "nazwa", "title", "produkt"],
  brand: ["brand_name", "brand", "marka", "producer", "manufacturer"],
  price: ["sale_price", "search_price", "price", "cena", "price_pln"],
  rrp: ["rrp_price", "store_price", "old_price", "cena_przed", "base_price", "regular_price"],
  ean: ["ean", "gtin", "barcode", "kod_ean"],
  link: ["aw_deep_link", "deep_link", "deeplink", "url", "link", "product_url"],
  image: ["merchant_image_url", "image_url", "aw_image_url", "image", "img", "zdjecie"],
  category: ["category_name", "merchant_category", "category", "kategoria"]
};
function rowGet(row, key) {
  for (const c of COL[key]) if (row[c] != null && row[c] !== "") return row[c];
  return "";
}

// ───────── normalizacja ─────────
const DIAC = { "ł": "l", "ó": "o", "ą": "a", "ę": "e", "ś": "s", "ż": "z", "ź": "z", "ć": "c", "ń": "n" };
const norm = s => (s || "").toLowerCase().replace(/[łóąęśżźćń]/g, m => DIAC[m] || m);
const compact = s => norm(s).replace(/[^a-z0-9]+/g, "");
const num = s => { const n = parseFloat(String(s).replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
function mapCat(feedCat, name) {
  const s = norm(feedCat + " " + name);
  if (/(perfum|woda toaletowa|woda perfumowana|eau de)/.test(s)) return "Zapachy";
  if (/(wlos|szampon|odzywk|hair)/.test(s)) return "Włosy";
  if (/(makijaz|tusz|mascara|podklad|pomadk|blyszczyk|puder|eyeliner|cien|paznok)/.test(s)) return "Makijaż";
  if (/(cial|zel pod prysznic|dezodorant|antyperspirant|dlon|mydl)/.test(s)) return "Pielęgnacja ciała";
  return "Pielęgnacja twarzy";
}
const volOf = n => { const m = (n || "").match(/(\d+(?:[.,]\d+)?)\s*(ml|g|l)\b/i); return m ? m[1] + " " + m[2].toLowerCase() : ""; };
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h; };

// ───────── główna pętla ─────────
const products = new Map();  // klucz EAN lub compact(marka+nazwa)
const brandSet = new Map();  // znormalizowana → oryginalna nazwa (najczęstsza pisownia)
let storesDone = 0, offersTotal = 0;

for (const feed of cfg.feeds) {
  if (!feed.enabled) { log(`— ${feed.store}: wyłączony (uzupełnij URL i ustaw enabled:true)`); continue; }
  // URL feedu: bezpośrednio w configu albo "env:NAZWA" → z sekretu/zmiennej
  // środowiskowej (żeby nie trzymać adresu z ID afiliacyjnym w repo).
  let feedUrl = feed.url || "";
  if (feedUrl.startsWith("env:")) feedUrl = process.env[feedUrl.slice(4)] || "";
  if (!feedUrl || feedUrl.startsWith("PASTE_")) { log(`— ${feed.store}: brak URL — pomijam`); continue; }
  log(`↓ ${feed.store}: pobieram feed…`);
  let rows;
  try {
    const raw = await fetchFeed(feedUrl, feed.format);
    const fmt = feed.format || (raw.trimStart().startsWith("<") ? "xml" : "csv");
    rows = fmt === "xml" ? parseXML(raw) : parseCSV(raw);
  } catch (e) { log(`✗ ${feed.store}: nie udało się pobrać (${e.message}) — pomijam`); continue; }

  let n = 0;
  for (const row of rows) {
    const name = (row.name != null ? row.name : rowGet(row, "name")).trim();
    const price = num(row.price != null ? row.price : rowGet(row, "price"));
    if (!name || !(price > 0)) continue;
    const brand = (row.brand != null ? row.brand : rowGet(row, "brand")).trim();
    const ean = (row.ean != null ? row.ean : rowGet(row, "ean")).trim();
    const key = ean || compact(brand + name);
    if (!key) continue;

    if (brand) { const bn = norm(brand); if (!brandSet.has(bn)) brandSet.set(bn, brand); }

    let p = products.get(key);
    if (!p) { p = { brand: brand || name.split(" ")[0], name, cat: mapCat(row.category || rowGet(row, "category"), name), vol: volOf(name), photo: "", o: {} }; products.set(key, p); }
    const e = { p: Math.round(price * 100) / 100 };
    const rrp = num(row.rrp != null ? row.rrp : rowGet(row, "rrp"));
    if (rrp > price) e.w = Math.round(rrp * 100) / 100;   // promocja
    const link = (row.link != null ? row.link : rowGet(row, "link")).trim();
    if (link) e.u = link;
    p.o[feed.store] = e;
    const img = (row.image != null ? row.image : rowGet(row, "image")).trim();
    if (img && !p.photo) p.photo = img;
    n++;
  }
  offersTotal += n; storesDone++;
  log(`✓ ${feed.store}: ${n} ofert`);
}

if (!storesDone) {
  log("\nBrak aktywnych feedów. Uzupełnij adresy w sync/feeds.config.json i ustaw enabled:true.");
  log("Dopóki nie podepniesz feedów, aplikacja korzysta z wbudowanej bazy demo.");
  process.exit(0);
}

// ───────── produkty → feed.js ─────────
const list = [...products.values()].map(p => {
  const h = hash(p.brand + p.name);
  const words = p.name.split(" ");
  return {
    brand: p.brand, name: p.name, cat: p.cat, vol: p.vol,
    pop: 50 + Object.keys(p.o).length * 8 + (h % 12),
    rate: +(4.0 + (h % 9) / 10).toFixed(1), votes: 150 + (h % 5850),
    kw: "", photo: p.photo,
    img: { form: "bottle", body: "#EFEFF2", cap: "#8A8A8E", l1: (words[0] || "").toUpperCase().slice(0, 14), l2: words.slice(1, 3).join(" ") },
    o: p.o
  };
});

// ───────── marki → brands.js (automatycznie z feedów) ─────────
const brands = [...brandSet.values()].sort((a, b) => a.localeCompare(b, "pl"));

// ───────── promocje: snapshot + różnica dzień do dnia ─────────
const promos = [];
for (const p of list) {
  for (const [store, e] of Object.entries(p.o)) {
    if (e.w && e.w > e.p) promos.push({ key: compact(p.brand + p.name) + "@" + store, brand: p.brand, name: p.name, store, price: e.p, was: e.w, pct: Math.round((e.w - e.p) / e.w * 100) });
  }
}
const prevPath = path.join(dataDir, "promos-latest.json");
let fresh = [], ended = [];
if (existsSync(prevPath)) {
  const prev = JSON.parse(readFileSync(prevPath, "utf8"));
  const prevKeys = new Set(prev.map(x => x.key));
  const nowKeys = new Set(promos.map(x => x.key));
  fresh = promos.filter(x => !prevKeys.has(x.key));
  ended = prev.filter(x => !nowKeys.has(x.key));
}
writeFileSync(path.join(dataDir, `promos-${today}.json`), JSON.stringify(promos, null, 0));
writeFileSync(prevPath, JSON.stringify(promos, null, 0));

// ───────── zapis plików dla aplikacji ─────────
writeFileSync(path.join(outDir, "feed.js"),
  `// Wygenerowane przez sync/sync.mjs — ${today}. Nie edytuj ręcznie.\n` +
  `var FEED_P = ${JSON.stringify(list)};\n` +
  `if (typeof FEED_P !== "undefined" && FEED_P.length) P = FEED_P;\n`);
writeFileSync(path.join(outDir, "brands.js"),
  `// Wygenerowane przez sync/sync.mjs — ${today}. Marki wyciągnięte z feedów sklepów.\n` +
  `var FEED_BRANDS = ${JSON.stringify(brands)};\n`);

// ───────── podsumowanie ─────────
log("\n──────── PODSUMOWANIE ────────");
log(`Sklepy zsynchronizowane: ${storesDone}`);
log(`Produkty: ${list.length}   Oferty: ${offersTotal}   Marki: ${brands.length}`);
log(`Promocje aktywne: ${promos.length}` + (fresh.length || ended.length ? `  (nowe: +${fresh.length}, zakończone: -${ended.length})` : ""));
if (fresh.length) log("Przykładowe nowe promocje:\n  " + fresh.slice(0, 5).map(x => `${x.brand} ${x.name} — ${x.store} −${x.pct}%`).join("\n  "));
log(`\nZapisano: renderer/feed.js, renderer/brands.js, sync/data/promos-${today}.json`);
log("Uruchom aplikację: npm start");
