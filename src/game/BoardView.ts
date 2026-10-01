import Phaser from 'phaser';
import type { SudokuGame } from '../sudoku/SudokuGame';
import { BOX_CELLS, COL_CELLS, ROW_CELLS, boxOf, colOf, rowOf } from '../sudoku/rules';
import { C, FONT, HEX } from '../ui/theme';

/** Small note digits 1–9 rendered once into a canvas texture shared by all 729 note slots. */
function ensureNoteTexture(scene: Phaser.Scene, size: number) {
  const key = `notes_${size}`;
  if (scene.textures.exists(key)) return key;
  const tex = scene.textures.createCanvas(key, size * 9, size)!;
  const ctx = tex.getContext();
  ctx.font = `700 ${Math.round(size * 0.82)}px ${FONT}`;
  ctx.fillStyle = HEX.notes;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = 1; d <= 9; d++) {
    ctx.fillText(String(d), (d - 1) * size + size / 2, size / 2 + size * 0.04);
    tex.add(String(d), 0, (d - 1) * size, 0, size, size);
  }
  tex.refresh();
  return key;
}

export class BoardView extends Phaser.GameObjects.Container {
  readonly cell: number;
  private readonly border: number;
  private readonly radius: number;
  private fills: Phaser.GameObjects.Graphics;
  private flash: Phaser.GameObjects.Graphics;
  private marks: Phaser.GameObjects.Graphics;
  private digits: Phaser.GameObjects.Text[] = [];
  private noteImgs: Phaser.GameObjects.Image[][] = [];
  private flashing = new Map<number, number>();

  constructor(scene: Phaser.Scene, x: number, y: number, readonly size: number, u: number, onCell: (i: number) => void) {
    super(scene, x, y);
    this.border = 2 * u;
    this.radius = 16 * u;
    this.cell = (size - this.border * 2) / 9;
    const cs = this.cell;

    const base = scene.add.graphics();
    base.fillStyle(C.ink).fillRoundedRect(4 * u, 4 * u, size, size, this.radius);
    base.fillStyle(C.white).fillRoundedRect(0, 0, size, size, this.radius);
    this.fills = scene.add.graphics();
    this.flash = scene.add.graphics();

    const lines = scene.add.graphics();
    const thin = Math.max(1, Math.round(u));
    lines.lineStyle(thin, C.line);
    for (let k = 1; k < 9; k++) {
      if (k % 3 === 0) continue;
      const p = this.border + k * cs;
      lines.lineBetween(p, this.border, p, size - this.border);
      lines.lineBetween(this.border, p, size - this.border, p);
    }
    lines.lineStyle(2 * u, C.ink);
    for (const k of [3, 6]) {
      const p = this.border + k * cs;
      lines.lineBetween(p, this.border, p, size - this.border);
      lines.lineBetween(this.border, p, size - this.border, p);
    }
    lines.lineStyle(this.border, C.ink).strokeRoundedRect(this.border / 2, this.border / 2, size - this.border, size - this.border, this.radius - this.border / 2);
    this.marks = scene.add.graphics();
    this.add([base, this.fills, this.flash, lines, this.marks]);

    const noteSize = Math.round(cs / 3);
    const noteKey = ensureNoteTexture(scene, noteSize * 2);
    for (let i = 0; i < 81; i++) {
      const { x: ox, y: oy } = this.origin(i);
      const imgs: Phaser.GameObjects.Image[] = [];
      for (let d = 1; d <= 9; d++) {
        const nx = ox + ((d - 1) % 3) * (cs / 3) + cs / 6;
        const ny = oy + Math.floor((d - 1) / 3) * (cs / 3) + cs / 6;
        imgs.push(scene.add.image(nx, ny, noteKey, String(d)).setScale(0.5).setVisible(false));
      }
      this.noteImgs.push(imgs);
      this.add(imgs);
      const t = scene.add
        .text(ox + cs / 2, oy + cs / 2, '', { fontFamily: FONT, fontSize: `${Math.round(cs * 0.6)}px`, color: HEX.ink, fontStyle: '800' })
        .setOrigin(0.5);
      this.digits.push(t);
      this.add(t);
    }

    const hit = scene.add.zone(0, 0, size, size).setOrigin(0).setInteractive();
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const c = Math.floor((p.worldX - this.x - this.border) / cs);
      const r = Math.floor((p.worldY - this.y - this.border) / cs);
      onCell(Math.max(0, Math.min(8, r)) * 9 + Math.max(0, Math.min(8, c)));
    });
    this.add(hit);
    scene.add.existing(this);
  }

  private origin(i: number) {
    return { x: this.border + colOf(i) * this.cell, y: this.border + rowOf(i) * this.cell };
  }

  center(i: number) {
    const o = this.origin(i);
    return { x: this.x + o.x + this.cell / 2, y: this.y + o.y + this.cell / 2 };
  }

  /** Fill a cell, rounding it when it sits in a corner of the board. */
  private fillCell(g: Phaser.GameObjects.Graphics, i: number, color: number, alpha = 1) {
    const { x, y } = this.origin(i);
    const r = this.radius - this.border;
    const corners = { tl: i === 0 ? r : 0, tr: i === 8 ? r : 0, bl: i === 72 ? r : 0, br: i === 80 ? r : 0 };
    g.fillStyle(color, alpha);
    if (corners.tl || corners.tr || corners.bl || corners.br) g.fillRoundedRect(x, y, this.cell, this.cell, corners);
    else g.fillRect(x, y, this.cell, this.cell);
  }

  render(game: SudokuGame, selected: number) {
    const sel = selected;
    const selVal = sel >= 0 ? game.value(sel) : 0;
    const g = this.fills.clear();
    const m = this.marks.clear();
    const cs = this.cell;

    for (let i = 0; i < 81; i++) {
      let color: number = C.white;
      if (sel >= 0 && (rowOf(i) === rowOf(sel) || colOf(i) === colOf(sel) || boxOf(i) === boxOf(sel))) color = C.warm;
      if (selVal && game.value(i) === selVal) color = C.limePale;
      if (game.isWrong(i)) color = C.errorBg;
      if (i === sel) color = C.lime;
      if (color !== C.white) this.fillCell(g, i, color);

      const v = game.value(i);
      const t = this.digits[i];
      t.setText(v ? String(v) : '');
      if (v) {
        const given = game.isGiven(i);
        const wrong = game.isWrong(i);
        const col = given ? HEX.ink : wrong ? HEX.wrong : HEX.typed;
        if (t.style.color !== col) t.setColor(col);
        t.setFontStyle(given ? '800' : '700');
        if (wrong) {
          // Underline as well as colour, so errors don't rely on hue alone.
          const { x, y } = this.origin(i);
          m.lineStyle(Math.max(2, cs * 0.05), 0xc8102e).lineBetween(x + cs * 0.32, y + cs * 0.82, x + cs * 0.68, y + cs * 0.82);
        }
      }
      const mask = v ? 0 : game.notes(i);
      for (let d = 1; d <= 9; d++) this.noteImgs[i][d - 1].setVisible(!!(mask & (1 << d)));
    }
  }

  pop(i: number) {
    const t = this.digits[i];
    this.scene.tweens.killTweensOf(t);
    t.setScale(1.45);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' });
  }

  shake(i: number) {
    const t = this.digits[i];
    const x0 = this.origin(i).x + this.cell / 2;
    this.scene.tweens.killTweensOf(t);
    t.x = x0;
    this.scene.tweens.add({ targets: t, x: x0 + this.cell * 0.1, duration: 50, yoyo: true, repeat: 3, onComplete: () => (t.x = x0) });
  }

  /** Ripple a lime highlight outwards from `from` across the completed units. */
  celebrate(from: number, units: { row?: number; col?: number; box?: number }) {
    const cells = new Set<number>();
    if (units.row !== undefined) ROW_CELLS(units.row).forEach((c) => cells.add(c));
    if (units.col !== undefined) COL_CELLS(units.col).forEach((c) => cells.add(c));
    if (units.box !== undefined) BOX_CELLS(units.box).forEach((c) => cells.add(c));
    for (const c of cells) {
      const dist = Math.abs(rowOf(c) - rowOf(from)) + Math.abs(colOf(c) - colOf(from));
      this.flashing.set(c, -dist * 0.05);
    }
  }

  update(dt: number) {
    const g = this.flash.clear();
    if (!this.flashing.size) return;
    const dur = 0.45;
    for (const [c, t0] of this.flashing) {
      const t = t0 + dt;
      if (t >= dur) {
        this.flashing.delete(c);
        continue;
      }
      this.flashing.set(c, t);
      if (t >= 0) this.fillCell(g, c, C.lime, Math.sin((t / dur) * Math.PI) * 0.85);
    }
  }
}
