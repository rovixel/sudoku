import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { BoardView } from '../game/BoardView';
import { bestScoreKey, difficultyPopup } from '../game/DifficultyPopup';
import { fmtNum, t } from '../i18n';
import { type Layout, layoutOf } from '../layout';
import { Storage } from '../storage';
import { type MoveResult, type SavedGame, SudokuGame } from '../sudoku/SudokuGame';
import type { Difficulty } from '../sudoku/rules';
import { C, HEX, textStyle } from '../ui/theme';
import {
  NeoButton, Popup, addBackground, drawBox, icon, iconButton, langButton, pillButton, soundToggles, tag,
} from '../ui/widgets';
import { fmtTime } from './Menu';

interface GameData {
  difficulty?: Difficulty;
  resume?: boolean;
}

interface Key {
  btn: NeoButton;
  digit: Phaser.GameObjects.Text;
  left: Phaser.GameObjects.Text;
}

export class Game extends Phaser.Scene {
  private game_!: SudokuGame;
  private L!: Layout;
  private board!: BoardView;
  private selected = -1;
  private notesMode = false;
  private paused = false;
  private saveTimer = 0;

  private hud!: { mistakes: Phaser.GameObjects.Text; score: Phaser.GameObjects.Text; time: Phaser.GameObjects.Text };
  private keys: Key[] = [];
  private notesBtn!: NeoButton;
  private notesPill!: { g: Phaser.GameObjects.Graphics; t: Phaser.GameObjects.Text };
  private hintBtn!: Phaser.GameObjects.Container;
  private hintCount!: Phaser.GameObjects.Text;
  private undoBtn!: Phaser.GameObjects.Container;
  private pausePopup!: Popup;
  private overPopup!: Popup;
  private overChanceBtn!: NeoButton;
  private winPopup!: Popup;
  private win!: {
    tags: Phaser.GameObjects.Container;
    time: Phaser.GameObjects.Text;
    score: Phaser.GameObjects.Text;
    mistakes: Phaser.GameObjects.Text;
    prev: Phaser.GameObjects.Text;
  };

  constructor() {
    super('Game');
  }

  init(data: GameData) {
    const saved = data.resume ? Storage.get<SavedGame | null>('save', null) : null;
    this.game_ = saved ? SudokuGame.restore(saved) : SudokuGame.create(data.difficulty ?? 'easy');
    Storage.set('lastDifficulty', this.game_.difficulty);
    this.selected = -1;
    this.notesMode = false;
    this.paused = false;
    this.keys = [];
  }

  create() {
    this.L = layoutOf(this);
    addBackground(this, this.L);
    AudioManager.playMusic(this);
    if (this.L.mode === 'portrait') this.buildPortrait();
    else this.buildLandscape();
    this.buildPopups();
    this.bindKeyboard();
    this.makeConfettiTexture();

    // Auto-pause when the tab / host page goes to the background.
    const onHidden = () => this.pause();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.save();
    });

    this.refresh();
    if (this.game_.status === 'lost') this.showGameOver();
  }

  update(_time: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    this.board.update(dt);
    if (this.paused || this.game_.status !== 'playing') return;
    this.game_.tick(dt);
    this.hud.time.setText(fmtTime(this.game_.elapsed));
    this.saveTimer += dt;
    if (this.saveTimer > 5) this.save();
  }

  // ---------- layout ----------

  private px = (v: number) => v * this.L.u;

  private buildPortrait() {
    const { wd, hd } = this.L;
    const px = this.px;
    // Minimum stack is ~696 units tall; spread any extra height so the controls
    // don't drift far from the board on tall phones.
    const board = wd - 32;
    const minH = 140 + board + 16 + 76 + 18 + 62 + 26;
    const extra = Math.max(0, hd - minH);
    const top = extra * 0.35;
    const mid = extra * 0.35;
    this.buildHeader(16, wd - 16, top + 38);
    this.buildStats(16, top + 76, wd - 32, 50);
    this.board = new BoardView(this, px(16), px(top + 140), px(board), this.L.u, (i) => this.select(i));
    const toolsTop = top + 140 + board + 16 + mid;
    this.buildTools(16, toolsTop, wd - 32, 50);
    this.buildNumpad(16, toolsTop + 76 + 18, wd - 32, 9, 62, 5);
  }

  private buildLandscape() {
    const px = this.px;
    const offX = (this.L.wd - 960) / 2;
    this.board = new BoardView(this, px(offX + 30), px(33), px(534), this.L.u, (i) => this.select(i));
    const x0 = offX + 596;
    const w = 330;
    this.buildHeader(x0, x0 + w, 54);
    this.buildStats(x0, 92, w, 50);
    this.buildTools(x0, 160, w, 46);
    this.buildNumpad(x0, 252, w, 3, 60, 8);
    const diff = difficultyPopup(this, this.L, (d) => this.newGame(d));
    pillButton(this, this.L, px(x0 + w / 2), px(543), px(w), t().newGame, () => diff.open(), { primary: true, height: 46 });
  }

  private buildHeader(left: number, right: number, cy: number) {
    const px = this.px;
    iconButton(this, this.L, px(left + 22), px(cy), 'icon_home', '⌂', () => this.scene.start('Menu'));
    iconButton(this, this.L, px(right - 22), px(cy), 'icon_pause', 'II', () => this.pause());
    const title = this.add.text(0, px(cy), t().title, textStyle(px(24), HEX.ink, 800, true)).setOrigin(0, 0.5);
    const chip = tag(this, this.L, 0, px(cy), t().difficulty[this.game_.difficulty], C.lime);
    const total = title.width + px(8) + chip.width;
    const mid = px((left + right) / 2);
    title.setX(mid - total / 2);
    chip.setX(mid - total / 2 + title.width + px(8) + chip.width / 2);
  }

  private buildStats(x: number, y: number, w: number, h: number) {
    const px = this.px;
    const gap = 8;
    const cw = (w - gap * 2) / 3;
    const g = this.add.graphics();
    const card = (k: number, label: string) => {
      const cx = x + k * (cw + gap);
      drawBox(g, px(cx), px(y), px(cw), px(h), { radius: px(14), border: px(2) });
      this.add.text(px(cx + 12), px(y + 15), label, textStyle(px(12), HEX.muted, 700)).setOrigin(0, 0.5);
      return this.add.text(px(cx + 12), px(y + 34), '', textStyle(px(18), HEX.ink, 800)).setOrigin(0, 0.5);
    };
    this.hud = { mistakes: card(0, t().mistakes), score: card(1, t().score), time: card(2, t().time) };
  }

  private buildTools(x: number, y: number, w: number, d: number) {
    const px = this.px;
    const u = this.L.u;
    const tool = (k: number, key: string, fallback: string, label: string, onClick: () => void) => {
      const cx = px(x + (w * (2 * k + 1)) / 8);
      const btn = new NeoButton(this, cx, px(y + d / 2), px(d), px(d), { radius: px(d / 2), border: 2 * u }, onClick, { sound: false });
      btn.face.add(icon(this, 0, 0, key, fallback, px(d * 0.44)));
      this.add.text(cx, px(y + d + 16), label, textStyle(px(13), HEX.ink, 700)).setOrigin(0.5);
      return btn;
    };
    this.undoBtn = tool(0, 'icon_undo', '↶', t().undo, () => this.undo());
    tool(1, 'icon_erase', '⌫', t().erase, () => this.erase());
    this.notesBtn = tool(2, 'icon_notes', '✎', t().notes, () => this.toggleNotes());
    const pg = this.add.graphics();
    const pt = this.add.text(px(d / 2 - 2), -px(d / 2 - 2), '', textStyle(px(11), HEX.ink, 800)).setOrigin(0.5);
    this.notesBtn.face.add([pg, pt]);
    this.notesPill = { g: pg, t: pt };

    this.hintBtn = tool(3, 'icon_hint', '?', t().hint, () => this.hint());
    const hb = this.add.graphics();
    drawBox(hb, px(d / 2 - 15), -px(d / 2 + 7), px(22), px(22), { fill: C.orange, radius: px(11), border: 2 * u });
    this.hintCount = this.add.text(px(d / 2 - 4), -px(d / 2 - 4), '', textStyle(px(12), HEX.ink, 800)).setOrigin(0.5);
    (this.hintBtn as NeoButton).face.add([hb, this.hintCount]);
  }

  private buildNumpad(x: number, y: number, w: number, cols: number, h: number, gap: number) {
    const px = this.px;
    const kw = (w - gap * (cols - 1)) / cols;
    for (let d = 1; d <= 9; d++) {
      const c = (d - 1) % cols;
      const r = Math.floor((d - 1) / cols);
      const cx = x + c * (kw + gap) + kw / 2;
      const cy = y + r * (h + gap) + h / 2;
      const btn = new NeoButton(this, px(cx), px(cy), px(kw), px(h), { radius: px(12), border: px(2), shadow: px(2) }, () => this.input_(d), { sound: false });
      const digit = this.add.text(0, -px(8), String(d), textStyle(px(cols === 9 ? 28 : 30), HEX.ink, 800)).setOrigin(0.5);
      const left = this.add.text(0, px(h / 2 - 13), '', textStyle(px(11), HEX.notes, 700)).setOrigin(0.5);
      btn.face.add([digit, left]);
      this.keys.push({ btn, digit, left });
    }
  }

  private buildPopups() {
    const L = this.L;
    const px = this.px;
    const cardW = Math.min(L.W - px(32), px(346));
    const btnW = cardW - px(44);
    const diff = difficultyPopup(this, L, (d) => this.newGame(d));

    // Pause
    this.pausePopup = new Popup(this, L, cardW, px(440), { title: t().paused, onClose: () => this.resume() });
    const p = this.pausePopup.panel;
    const top = -px(220);
    p.add(pillButton(this, L, 0, top + px(108), btnW, t().resume, () => this.resume(), { primary: true, iconKey: 'icon_play' }));
    p.add(pillButton(this, L, 0, top + px(174), btnW, t().restart, () => this.restartSame()));
    p.add(pillButton(this, L, 0, top + px(240), btnW, t().newGame, () => diff.open()));
    p.add(pillButton(this, L, 0, top + px(306), btnW, t().home, () => this.scene.start('Menu')));
    const rowY = top + px(380);
    p.add(langButton(this, L, -btnW / 2, rowY, () => this.scene.restart({ resume: true })));
    p.add(soundToggles(this, L, { sfx: [btnW / 2 - px(22 + 54), rowY], music: [btnW / 2 - px(22), rowY] }));

    // Game over
    this.overPopup = new Popup(this, L, cardW, px(380), { title: t().gameOver });
    const o = this.overPopup.panel;
    const ot = -px(190);
    o.add(this.add.text(-btnW / 2, ot + px(84), t().outOfMistakes(this.game_.rule.maxMistakes), textStyle(px(15), HEX.muted, 700)).setOrigin(0, 0.5));
    this.overChanceBtn = pillButton(this, L, 0, ot + px(142), btnW, t().secondChance, () => {
      if (this.game_.secondChance()) {
        this.overPopup.close();
        this.refresh();
      }
    }, { primary: true });
    o.add(this.overChanceBtn);
    o.add(pillButton(this, L, 0, ot + px(208), btnW, t().restart, () => this.restartSame()));
    o.add(pillButton(this, L, 0, ot + px(274), btnW, t().newGame, () => diff.open()));

    // Win
    const winH = px(420);
    this.winPopup = new Popup(this, L, cardW, winH);
    const w = this.winPopup.panel;
    const wt = -winH / 2;
    if (this.textures.exists('trophy')) {
      const tr = this.add.image(0, wt + px(10), 'trophy');
      tr.setScale(px(132) / Math.max(tr.width, tr.height));
      w.add(tr);
    }
    w.add(this.add.text(0, wt + px(96), t().solved, textStyle(px(38), HEX.ink, 800, true)).setOrigin(0.5));
    const tags = this.add.container(0, wt + px(140));
    w.add(tags);
    const stats = this.add.graphics();
    w.add(stats);
    const sw = (btnW - px(16)) / 3;
    const statCard = (k: number, label: string, lime = false) => {
      const sx = -btnW / 2 + k * (sw + px(8));
      drawBox(stats, sx, wt + px(166), sw, px(62), { radius: px(14), border: px(2), fill: lime ? C.lime : C.white });
      w.add(this.add.text(sx + sw / 2, wt + px(184), label, textStyle(px(12), lime ? HEX.ink : HEX.muted, 700)).setOrigin(0.5));
      const v = this.add.text(sx + sw / 2, wt + px(208), '', textStyle(px(20), HEX.ink, 800)).setOrigin(0.5);
      w.add(v);
      return v;
    };
    const time = statCard(0, t().time);
    const score = statCard(1, t().score, true);
    const mistakes = statCard(2, t().mistakes);
    const prev = this.add.text(0, wt + px(248), '', textStyle(px(13), HEX.muted, 700)).setOrigin(0.5);
    w.add(prev);
    w.add(pillButton(this, L, 0, wt + px(298), btnW, t().playAgain, () => diff.open(), { primary: true }));
    w.add(pillButton(this, L, 0, wt + px(364), btnW, t().home, () => this.scene.start('Menu')));
    this.win = { tags, time, score, mistakes, prev };

    // Popups opened from other popups must sit on top.
    diff.setDepth(200);
  }

  private bindKeyboard() {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (this.paused) return;
      if (e.key >= '1' && e.key <= '9') this.input_(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') this.erase();
      else if (e.key === 'n' || e.key === 'N') this.toggleNotes();
      else if (e.key === 'h' || e.key === 'H') this.hint();
      else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) this.undo();
      else if (e.key === 'Escape') this.pause();
      else if (e.key.startsWith('Arrow')) {
        const i = this.selected < 0 ? 40 : this.selected;
        const r = Math.floor(i / 9);
        const c = i % 9;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key] ?? [0, 0];
        this.select(((r + dr + 9) % 9) * 9 + ((c + dc + 9) % 9), false);
      }
    });
  }

  // ---------- actions ----------

  private select(i: number, sound = true) {
    if (this.paused || this.game_.status !== 'playing') return;
    this.selected = i;
    if (sound) AudioManager.playSfx(this, 'sfx_click', 0.35);
    this.refresh();
  }

  private input_(d: number) {
    if (this.paused || this.selected < 0) return;
    const i = this.selected;
    this.handle(i, this.game_.enter(i, d, this.notesMode));
  }

  private erase() {
    if (this.paused || this.selected < 0) return;
    this.handle(this.selected, this.game_.erase(this.selected));
  }

  private undo() {
    if (this.paused) return;
    const cell = this.game_.undo();
    if (cell === undefined) return;
    AudioManager.playSfx(this, 'sfx_undo');
    this.selected = cell;
    this.save();
    this.refresh();
  }

  private hint() {
    if (this.paused) return;
    const h = this.game_.hint(this.selected);
    if (!h) return;
    AudioManager.playSfx(this, 'sfx_hint');
    this.selected = h.cell;
    this.handle(h.cell, h.result, true);
  }

  private toggleNotes() {
    if (this.paused) return;
    this.notesMode = !this.notesMode;
    AudioManager.playSfx(this, 'sfx_notes');
    this.refresh();
  }

  private handle(i: number, r: MoveResult, fromHint = false) {
    switch (r.kind) {
      case 'noop':
        return;
      case 'note':
        AudioManager.playSfx(this, 'sfx_notes', 0.6);
        break;
      case 'erase':
        AudioManager.playSfx(this, 'sfx_erase');
        break;
      case 'wrong':
        AudioManager.playSfx(this, 'sfx_wrong');
        this.cameras.main.shake(120, 0.004);
        this.refresh();
        this.board.shake(i);
        if (r.lost) this.time.delayedCall(500, () => this.showGameOver());
        this.save();
        return;
      case 'correct': {
        const { completed, won, points } = r;
        if (!fromHint) AudioManager.playSfx(this, 'sfx_correct', 0.7);
        const any = completed.row !== undefined || completed.col !== undefined || completed.box !== undefined;
        if (any && !won) {
          this.board.celebrate(i, completed);
          AudioManager.playSfx(this, 'sfx_complete', 0.7);
        }
        if (points) this.floatScore(i, points);
        this.refresh();
        this.board.pop(i);
        if (won) this.onWin();
        else this.save();
        return;
      }
    }
    this.save();
    this.refresh();
  }

  private floatScore(i: number, points: number) {
    const { x, y } = this.board.center(i);
    const txt = this.add.text(x, y - this.px(10), `+${points}`, textStyle(this.px(18), HEX.typed, 800)).setOrigin(0.5).setDepth(50);
    txt.setStroke('#FFFFFF', this.px(4));
    this.tweens.add({ targets: txt, y: y - this.px(48), alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => txt.destroy() });
  }

  // ---------- state ----------

  private refresh() {
    const g = this.game_;
    const u = this.L.u;
    this.board.render(g, this.selected);
    this.hud.mistakes.setText(`${g.mistakes}/${g.rule.maxMistakes}`).setColor(g.mistakes ? HEX.wrong : HEX.ink);
    this.hud.score.setText(fmtNum(g.score));
    this.hud.time.setText(fmtTime(g.elapsed));

    for (let d = 1; d <= 9; d++) {
      const k = this.keys[d - 1];
      const left = 9 - g.placedCount(d);
      k.left.setText(left > 0 ? String(left) : '✓');
      k.btn.setBoxStyle(left > 0
        ? { borderColor: C.ink, shadow: 2 * u, fill: C.white }
        : { borderColor: C.disabled, shadow: 0, fill: C.white });
      k.digit.setColor(left > 0 ? HEX.ink : HEX.disabled);
    }

    // Notes toggle: lime with a shadow while on, plus an ON/OFF pill.
    const on = this.notesMode;
    this.notesBtn.setBoxStyle({ fill: on ? C.lime : C.white, shadow: on ? 2 * u : 0 });
    const { g: pg, t: pt } = this.notesPill;
    pt.setText(on ? t().on : t().off).setColor(on ? '#D4F53C' : HEX.ink);
    const pw = pt.width + 12 * u;
    const ph = pt.height + 2 * u;
    drawBox(pg.clear(), pt.x - pw / 2, pt.y - ph / 2, pw, ph, { fill: on ? C.ink : C.white, radius: ph / 2, border: 2 * u });

    this.hintCount.setText(String(g.hintsLeft));
    this.hintBtn.setAlpha(g.hintsLeft > 0 ? 1 : 0.45);
    this.undoBtn.setAlpha(g.canUndo ? 1 : 0.45);
  }

  private save() {
    this.saveTimer = 0;
    if (this.game_.status === 'won') Storage.remove('save');
    else Storage.set('save', this.game_.serialize());
  }

  private pause() {
    if (this.paused || this.game_.status !== 'playing') return;
    this.paused = true;
    this.save();
    this.pausePopup.open();
  }

  private resume() {
    this.paused = false;
    this.pausePopup.close();
  }

  private newGame(d: Difficulty) {
    this.scene.start('Game', { difficulty: d });
  }

  private restartSame() {
    this.game_ = this.game_.restart();
    this.selected = -1;
    this.notesMode = false;
    this.paused = false;
    this.pausePopup.close();
    this.overPopup.close();
    this.save();
    this.refresh();
  }

  private showGameOver() {
    AudioManager.playSfx(this, 'sfx_lose');
    this.overChanceBtn.setVisible(this.game_.canSecondChance);
    this.overPopup.open();
  }

  private onWin() {
    const g = this.game_;
    this.save();
    const key = bestScoreKey(g.difficulty);
    const best = Storage.get(key, 0);
    const isBest = g.score > best;
    if (isBest) Storage.set(key, g.score);

    this.selected = -1;
    this.refresh();
    AudioManager.playSfx(this, 'sfx_win');
    this.confetti();

    const { tags, time, score, mistakes, prev } = this.win;
    tags.removeAll(true);
    const chips = [tag(this, this.L, 0, 0, t().difficulty[g.difficulty], C.lime)];
    if (isBest) chips.push(tag(this, this.L, 0, 0, t().newRecord, C.orange, { square: true, size: 12 }));
    const gap = this.px(8);
    const total = chips.reduce((s, c) => s + c.width, 0) + gap * (chips.length - 1);
    let x = -total / 2;
    for (const c of chips) {
      c.setX(x + c.width / 2);
      x += c.width + gap;
      tags.add(c);
    }
    time.setText(fmtTime(g.elapsed));
    score.setText(fmtNum(g.score));
    mistakes.setText(`${g.mistakes}/${g.rule.maxMistakes}`);
    prev.setText(best ? t().previousBest(fmtNum(best)) : '');
    this.time.delayedCall(1100, () => this.winPopup.open());
  }

  private makeConfettiTexture() {
    if (this.textures.exists('confetti')) return;
    const g = this.make.graphics({}, false);
    g.fillStyle(C.ink).fillRect(0, 0, 22, 34);
    g.fillStyle(0xffffff).fillRect(4, 4, 14, 26);
    g.generateTexture('confetti', 22, 34);
    g.destroy();
  }

  private confetti() {
    const { W, H } = this.L;
    for (const x of [W * 0.2, W * 0.8]) {
      const em = this.add.particles(x, H + 20, 'confetti', {
        speedY: { min: -H * 1.15, max: -H * 0.75 },
        speedX: { min: -W * 0.4, max: W * 0.4 },
        gravityY: H * 1.05,
        rotate: { min: 0, max: 360 },
        scale: { min: this.L.u * 0.35, max: this.L.u * 0.6 },
        lifespan: 2400,
        tint: [C.orange, C.lime, 0xffffff],
        emitting: false,
      });
      em.setDepth(90); // behind popups (100) so it never covers the result card
      em.explode(60);
      this.time.delayedCall(2600, () => em.destroy());
    }
  }
}
