import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { bestScoreKey, difficultyPopup } from '../game/DifficultyPopup';
import { fmtNum, t } from '../i18n';
import { layoutOf } from '../layout';
import { takeStartDifficulty } from '../startOptions';
import { Storage } from '../storage';
import type { SavedGame } from '../sudoku/SudokuGame';
import { DIFFICULTY_ORDER, type Difficulty } from '../sudoku/rules';
import { C, HEX, textStyle } from '../ui/theme';
import { Popup, addBackground, drawBox, iconButton, langButton, pillButton, soundToggles, tag } from '../ui/widgets';

export const fmtTime = (sec: number) => {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export class Menu extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const L = layoutOf(this);
    const { u } = L;
    const px = (v: number) => v * u;
    addBackground(this, L);
    AudioManager.playMusic(this);

    const land = L.mode === 'landscape';
    const offX = land ? (L.wd - 960) / 2 : 0;
    const right = land ? offX + 930 : L.wd - 16;
    const left = land ? offX + 30 : 16;

    // Top bar: language on the left, sound / music / help on the right.
    langButton(this, L, px(left), px(36), () => this.scene.restart());
    soundToggles(this, L, { sfx: [px(right - 22 - 108), px(36)], music: [px(right - 22 - 54), px(36)] });
    const help = new Popup(this, L, Math.min(L.W - px(32), px(420)), px(420), { title: t().howToPlay, onClose: () => help.close() });
    help.panel.add(
      this.add.text(-px(188), -px(120), t().help, { ...textStyle(px(15), HEX.ink, 600), lineSpacing: px(8) }).setOrigin(0, 0),
    );
    iconButton(this, L, px(right - 22), px(36), 'icon_help', '?', () => help.open());

    const diff = difficultyPopup(this, L, (d) => this.startGame(d));
    const saved = Storage.get<SavedGame | null>('save', null);

    // ?difficulty= from the host page starts a new puzzle right away, but never
    // over a saved game: then the menu shows so the player can continue it.
    const start = takeStartDifficulty();
    if (start && !saved) {
      this.startGame(start);
      return;
    }

    // Right/bottom column: continue card, new game, best scores.
    const colW = land ? 380 : L.wd - 40;
    const colX = land ? offX + 520 : 20;
    const cardH = 140;
    const bestH = 76;
    const blockH = (saved ? cardH + 16 : 0) + 52 + 24 + bestH;
    const colTop = land ? Math.max(84, (600 - blockH) / 2 + 20) : L.hd - 28 - blockH;
    let y = colTop;
    if (saved) {
      this.continueCard(L, colX, y, colW, cardH, saved);
      y += cardH + 16;
    }
    pillButton(this, L, px(colX + colW / 2), px(y + 26), px(colW), t().newGame, () => diff.open());
    y += 52 + 24;
    this.bestScores(L, colX, y, colW);

    // Hero: mascot, title, tag line.
    const heroX = land ? offX + 250 : L.wd / 2;
    const heroTop = land ? 100 : 70;
    const heroBottom = land ? 520 : colTop - 16;
    const heroH = 190 + 6 + 66 + 12 + 24;
    const hy = heroTop + Math.max(0, (heroBottom - heroTop - heroH) / 2);
    if (this.textures.exists('mascot')) {
      const m = this.add.image(px(heroX), px(hy + 95), 'mascot');
      m.setScale(px(190) / Math.max(m.width, m.height));
      this.tweens.add({ targets: m, y: m.y - px(6), duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.add.text(px(heroX), px(hy + 190 + 6 + 33), t().title, textStyle(px(66), HEX.ink, 800, true)).setOrigin(0.5);
    const tagY = hy + 190 + 6 + 66 + 12 + 12;
    const pill = tag(this, L, 0, px(tagY), 'PUZZLE', C.orange, { square: true, size: 12 });
    const line = this.add.text(0, px(tagY), t().tagline, textStyle(px(15), HEX.muted, 600)).setOrigin(0, 0.5);
    const total = pill.width + px(8) + line.width;
    pill.setX(px(heroX) - total / 2 + pill.width / 2);
    line.setX(px(heroX) - total / 2 + pill.width + px(8));
  }

  private startGame(d: Difficulty) {
    Storage.set('lastDifficulty', d);
    this.scene.start('Game', { difficulty: d });
  }

  private continueCard(L: ReturnType<typeof layoutOf>, x: number, y: number, w: number, h: number, saved: SavedGame) {
    const { u } = L;
    const px = (v: number) => v * u;
    const g = this.add.graphics();
    drawBox(g, px(x), px(y), px(w), px(h), { radius: px(18), border: px(2), shadow: px(4) });
    this.add.text(px(x + 16), px(y + 26), `${t().lastGame} · ${t().difficulty[saved.difficulty]}`, textStyle(px(16), HEX.ink, 800)).setOrigin(0, 0.5);
    this.add
      .text(px(x + w - 16), px(y + 26), `${fmtTime(saved.elapsed)} · ${fmtNum(saved.score)} ${t().points}`, textStyle(px(13), HEX.muted, 700))
      .setOrigin(1, 0.5);

    let open = 0;
    let done = 0;
    saved.puzzle.forEach((v, i) => {
      if (v) return;
      open++;
      if (saved.values[i] === saved.solution[i]) done++;
    });
    const barY = y + 48;
    const barW = w - 32;
    drawBox(g, px(x + 16), px(barY), px(barW), px(12), { radius: px(6), border: px(2) });
    const fillW = Math.max(0, (barW - 4) * (open ? done / open : 0));
    if (fillW > 0) g.fillStyle(C.lime).fillRoundedRect(px(x + 18), px(barY + 2), px(fillW), px(8), px(4));

    pillButton(this, L, px(x + w / 2), px(y + h - 16 - 26), px(w - 32), t().continueGame, () => this.scene.start('Game', { resume: true }), {
      primary: true, iconKey: 'icon_play',
    });
  }

  private bestScores(L: ReturnType<typeof layoutOf>, x: number, y: number, w: number) {
    const { u } = L;
    const px = (v: number) => v * u;
    this.add.text(px(x), px(y + 8), t().bestScores, textStyle(px(12), HEX.muted, 800)).setOrigin(0, 0.5);
    const last = Storage.get<Difficulty | null>('lastDifficulty', null);
    const gap = 8;
    const cw = (w - gap * 3) / 4;
    const g = this.add.graphics();
    DIFFICULTY_ORDER.forEach((d, k) => {
      const cx = x + k * (cw + gap);
      const best = Storage.get(bestScoreKey(d), 0);
      drawBox(g, px(cx), px(y + 22), px(cw), px(52), {
        radius: px(12), border: px(2), borderColor: best ? C.ink : C.disabled, fill: d === last && best ? C.lime : C.white,
      });
      this.add.text(px(cx + cw / 2), px(y + 22 + 16), t().difficulty[d], textStyle(px(12), best ? HEX.ink : HEX.muted, 700)).setOrigin(0.5);
      this.add.text(px(cx + cw / 2), px(y + 22 + 36), best ? fmtNum(best) : '—', textStyle(px(16), best ? HEX.ink : HEX.faint, 800)).setOrigin(0.5);
    });
  }
}
