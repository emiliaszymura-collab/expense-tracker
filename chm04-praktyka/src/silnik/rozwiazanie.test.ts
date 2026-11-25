import { expect, it } from 'vitest';
import { losujPomiary, wypelnijRozwiazanie } from './karta';
import type { Poziom } from './typy';

const poziomy = Object.values(import.meta.glob<{ default: Poziom }>('../procedury/*.json', { eager: true })).map((m) => m.default);

it('rozwiązania krok po kroku nie mają pustych miejsc', () => {
  for (const p of poziomy.filter((x) => x.karta?.rozwiazanie))
    for (let i = 0; i < 50; i++) {
      const linie = wypelnijRozwiazanie(p.karta!, losujPomiary(p.karta!));
      expect(linie.join('\n'), p.id).not.toContain('?');
    }
  const p = poziomy.find((x) => x.id === '05-nacl-mohr')!;
  console.log(wypelnijRozwiazanie(p.karta!, losujPomiary(p.karta!)).join('\n'));
});
