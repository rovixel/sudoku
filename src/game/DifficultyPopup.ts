import Phaser from 'phaser';
import { fmtNum, t } from '../i18n';
import type { Layout } from '../layout';
import { Storage } from '../storage';
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../sudoku/rules';
import { C, HEX, textStyle } from '../ui/theme';
import { NeoButton, Popup, drawBox } from '../ui/widgets';

export const bestScoreKey = (d: Difficulty) => `best.${d}`;

/** Four little bars showing the level; fills follow the brand palette. */
const BARS: Record<Difficulty, number[]> = {
  easy: [C.lime, C.white, C.white, C.white],
  medium: [C.ink, C.ink, C.white, C.white],
  hard: [C.orange, C.orange, C.orange, C.white],
  expert: [C.ink, C.ink, C.ink, C.ink],
};

export function difficultyPopup(scene: Phaser.Scene, L: Layout, onPick: (d: Difficulty) => void) {
  const u = L.u;
  const sheet = L.mode === 'portrait';
  const width = sheet ? L.W : 420 * u;
  const rowH = 64 * u;
  const gap = 12 * u;
  const height = (sheet ? 112 : 104) * u + DIFFICULTY_ORDER.length * (rowH + gap) + 40 * u;
  const popup = new Popup(scene, L, width, height, { title: t().chooseDifficulty, onClose: () => popup.close(), sheet });

  const rowW = width - 40 * u - (sheet ? 8 * u : 0);
  const top = -height / 2 + (sheet ? 26 : 22) * u + 44 * u + 20 * u;
  const rows = DIFFICULTY_ORDER.map((d, k) => {
    const y = top + k * (rowH + gap) + rowH / 2;
    const btn = new NeoButton(scene, 0, y, rowW, rowH, { radius: 16 * u, border: 2 * u }, () => onPick(d));
    const left = -rowW / 2 + 16 * u;
    const bars = scene.add.graphics();
    BARS[d].forEach((fill, b) => drawBox(bars, left + b * 11 * u, -11 * u, 8 * u, 22 * u, { fill, radius: 3 * u, border: 2 * u }));
    const name = scene.add.text(left + 58 * u, -10 * u, t().difficulty[d], textStyle(17 * u, HEX.ink, 800)).setOrigin(0, 0.5);
    const [lo, hi] = DIFFICULTIES[d].givens;
    const sub = scene.add.text(left + 58 * u, 12 * u, '', textStyle(13 * u, HEX.muted, 600)).setOrigin(0, 0.5);
    const best = scene.add.text(rowW / 2 - 16 * u, 0, '', textStyle(13 * u, HEX.muted, 700)).setOrigin(1, 0.5);
    btn.face.add([bars, name, sub, best]);
    popup.panel.add(btn);
    return { d, btn, sub, best, lo, hi };
  });
  popup.panel.add(
    scene.add.text(0, top + rows.length * (rowH + gap) + 8 * u, t().rulesFooter, textStyle(12 * u, HEX.muted, 700)).setOrigin(0.5),
  );

  // Best scores and "last played" change during a session, so refresh on every open.
  const open = popup.open.bind(popup);
  popup.open = () => {
    const last = Storage.get<Difficulty | null>('lastDifficulty', null);
    for (const r of rows) {
      const isLast = r.d === last;
      r.btn.setBoxStyle({ fill: isLast ? C.lime : C.white, shadow: isLast ? 4 * u : 0 });
      r.sub.setText(t().givens(r.lo, r.hi) + (isLast ? ` · ${t().lastPlayed}` : ''));
      const best = Storage.get(bestScoreKey(r.d), 0);
      r.best.setText(best ? t().best(fmtNum(best)) : t().notPlayed).setColor(best || isLast ? HEX.ink : HEX.faint);
    }
    return open();
  };
  return popup;
}
