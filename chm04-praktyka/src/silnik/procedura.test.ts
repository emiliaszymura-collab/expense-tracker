// Zdania przepisane z procedury (bezokoliczniki: „odmierzyć pipetą…”, „zmierzyć…”) muszą być rozpoznane.
import { expect, it } from 'vitest';
import { krokPasuje, wariantyWpisu } from './gra';
import { normalizuj } from './dopasowanie';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);
// zdania z czasownikiem czynności (bezokolicznik na -ć/-c), bez nagłówków i objaśnień wzorów
const CZYNNOSC = /\b[a-z]{4,}(c)\b/;

it('zdania z procedur są rozpoznawane', () => {
  const nie: string[] = [];
  let sprawdzone = 0;
  for (const p of poziomy) {
    const proc = p.protokol.find((s) => s.tytul === 'Procedura');
    if (!proc) continue;
    for (const zd of proc.tresc.split(/(?<=\.)\s+|\n/).map((z) => z.trim()).filter((z) => z.length > 12 && CZYNNOSC.test(normalizuj(z)) && !/^(obliczenia|wynik|stężeni|wartości|przeliczyć|poprawka|zawartość cukrów|zawartość delikatnie)/i.test(z) && !z.startsWith('-'))) {
      sprawdzone++;
      const ok = wariantyWpisu(zd).some((w) => p.kroki.some((k) => krokPasuje(k, w)));
      if (!ok) nie.push(`${p.id}: ${zd}`);
    }
  }
  console.log(sprawdzone + ' sprawdzonych, ' + nie.length + '\n' + nie.join('\n'));
  expect(nie).toEqual([]);
});
