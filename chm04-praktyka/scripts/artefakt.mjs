// Składa zbudowaną grę (dist/) w stronę do publikacji jako Artifact:
// strona = <title> + style inline + <div id="root"> + skrypt modułu z pliku assets/*.js
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const out = 'artefakt';
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'assets'), { recursive: true });

const assets = readdirSync(join(dist, 'assets'));
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
if (js.length !== 1) throw new Error(`Oczekiwano 1 pliku JS, jest: ${js}`);

for (const f of js) copyFileSync(join(dist, 'assets', f), join(out, 'assets', f));
// modele, tekstury i HDRI (public/zasoby) – ładowane przez grę względnymi adresami
if (existsSync(join(dist, 'zasoby'))) cpSync(join(dist, 'zasoby'), join(out, 'zasoby'), { recursive: true });
const style = css.map((f) => readFileSync(join(dist, 'assets', f), 'utf8')).join('\n');

const strona = `<title>Lab CHM.04</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
${style}
</style>
<div id="root"></div>
<script type="module" src="assets/${js[0]}"></script>
`;
writeFileSync(join(out, 'index.html'), strona);
console.log(`artefakt/index.html + assets/${js[0]}`);
