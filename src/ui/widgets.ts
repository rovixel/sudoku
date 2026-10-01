import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { getLang, setLang } from '../i18n';
import type { Layout } from '../layout';
import { C, HEX, textStyle } from './theme';

export interface BoxStyle {
  fill?: number;
  radius?: number;
  /** Hard shadow offset in px (0 = none). */
  shadow?: number;
  border?: number;
  borderColor?: number;
  /** Per-corner radius override, e.g. a bottom sheet. */
  corners?: Phaser.Types.GameObjects.Graphics.RoundedRectRadius;
}

/** Ink-outlined box with an optional hard offset shadow, drawn at (x, y) top-left. */
export function drawBox(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, s: BoxStyle) {
  const r = s.corners ?? Math.min(s.radius ?? 0, h / 2, w / 2);
  const bw = s.border ?? 0;
  if (s.shadow) g.fillStyle(C.ink).fillRoundedRect(x + s.shadow, y + s.shadow, w, h, r);
  g.fillStyle(s.fill ?? C.white).fillRoundedRect(x, y, w, h, r);
  if (bw) {
    const inset = (v: number) => Math.max(0, v - bw / 2);
    const ir = typeof r === 'number' ? inset(r) : { tl: inset(r.tl ?? 0), tr: inset(r.tr ?? 0), bl: inset(r.bl ?? 0), br: inset(r.br ?? 0) };
    g.lineStyle(bw, s.borderColor ?? C.ink).strokeRoundedRect(x + bw / 2, y + bw / 2, w - bw, h - bw, ir);
  }
  return g;
}

export function box(scene: Phaser.Scene, x: number, y: number, w: number, h: number, s: BoxStyle) {
  return drawBox(scene.add.graphics(), x, y, w, h, s);
}

/**
 * Neo-brutalist button: a face that sinks onto its shadow while pressed.
 * Positioned by its centre; put content in `face` (coordinates relative to centre).
 */
export class NeoButton extends Phaser.GameObjects.Container {
  readonly face: Phaser.GameObjects.Container;
  private shadowG: Phaser.GameObjects.Graphics;
  private bg: Phaser.GameObjects.Graphics;
  private style: BoxStyle;

  constructor(
    scene: Phaser.Scene, x: number, y: number, readonly w: number, readonly h: number,
    style: BoxStyle, onClick: () => void, opts: { sound?: boolean; ariaLabel?: string } = {},
  ) {
    super(scene, x, y);
    this.style = style;
    this.shadowG = scene.add.graphics();
    this.bg = scene.add.graphics();
    this.face = scene.add.container(0, 0, [this.bg]);
    this.add([this.shadowG, this.face]);
    this.redraw();
    this.setSize(w, h).setInteractive({ useHandCursor: true });

    const press = (down: boolean) => {
      const s = this.style.shadow ?? 0;
      this.face.setPosition(down ? s : 0, down ? s : 0);
      this.shadowG.setVisible(!down);
    };
    this.on('pointerdown', () => press(true));
    this.on('pointerout', () => press(false));
    this.on('pointerup', () => {
      press(false);
      if (opts.sound !== false) AudioManager.playSfx(scene, 'sfx_click', 0.6);
      onClick();
    });
    scene.add.existing(this);
  }

  setBoxStyle(patch: Partial<BoxStyle>) {
    this.style = { ...this.style, ...patch };
    this.redraw();
    return this;
  }

  private redraw() {
    const { w, h } = this;
    this.shadowG.clear();
    if (this.style.shadow) {
      this.shadowG.fillStyle(C.ink).fillRoundedRect(-w / 2 + this.style.shadow, -h / 2 + this.style.shadow, w, h, Math.min(this.style.radius ?? 0, h / 2));
    }
    drawBox(this.bg.clear(), -w / 2, -h / 2, w, h, { ...this.style, shadow: 0 });
  }
}

/** White glyph icon tinted to ink; text fallback if the icon image is missing. */
export function icon(scene: Phaser.Scene, x: number, y: number, key: string, fallback: string, size: number, tint = C.ink) {
  if (scene.textures.exists(key)) {
    const img = scene.add.image(x, y, key);
    img.setScale(size / Math.max(img.width, img.height));
    img.setTint(tint);
    return img;
  }
  const hex = '#' + tint.toString(16).padStart(6, '0');
  return scene.add.text(x, y, fallback, textStyle(size * 0.8, hex, 800)).setOrigin(0.5);
}

/** Rounded-square icon button (header / home toolbar). */
export function iconButton(scene: Phaser.Scene, L: Layout, x: number, y: number, key: string, fallback: string, onClick: () => void) {
  const u = L.u;
  const b = new NeoButton(scene, x, y, 44 * u, 44 * u, { radius: 14 * u, border: 2 * u, shadow: 3 * u }, onClick);
  b.face.add(icon(scene, 0, 0, key, fallback, 22 * u));
  return b;
}

/** Pill button with a label, orange (primary) or white (secondary). */
export function pillButton(
  scene: Phaser.Scene, L: Layout, x: number, y: number, w: number, label: string, onClick: () => void,
  opts: { primary?: boolean; height?: number; iconKey?: string } = {},
) {
  const u = L.u;
  const h = (opts.height ?? 52) * u;
  const b = new NeoButton(scene, x, y, w, h, {
    fill: opts.primary ? C.orange : C.white, radius: h / 2, border: 2 * u, shadow: 3 * u,
  }, onClick);
  const t = scene.add.text(0, 0, label, textStyle(17 * u, HEX.ink, 800)).setOrigin(0.5);
  b.face.add(t);
  if (opts.iconKey && scene.textures.exists(opts.iconKey)) {
    const ic = icon(scene, 0, 0, opts.iconKey, '', 18 * u);
    const gap = 8 * u;
    const total = ic.displayWidth + gap + t.width;
    ic.setX(-total / 2 + ic.displayWidth / 2);
    t.setX(-total / 2 + ic.displayWidth + gap + t.width / 2);
    b.face.add(ic);
  }
  return b;
}

/** Small ink-outlined pill tag, e.g. the difficulty chip. */
export function tag(scene: Phaser.Scene, L: Layout, x: number, y: number, label: string, fill: number, opts: { square?: boolean; size?: number } = {}) {
  const u = L.u;
  const t = scene.add.text(0, 0, label, textStyle((opts.size ?? 13) * u, HEX.ink, 800)).setOrigin(0.5);
  const w = t.width + 20 * u;
  const h = t.height + 2 * u;
  const c = scene.add.container(x, y);
  c.add([drawBox(scene.add.graphics(), -w / 2, -h / 2, w, h, { fill, radius: opts.square ? 6 * u : h / 2, border: 2 * u }), t]);
  c.setSize(w, h);
  return c;
}

/** White page with the site's faint dot grid. */
export function addBackground(scene: Phaser.Scene, L: Layout) {
  const step = Math.round(18 * L.u);
  const key = `dots_${step}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, step, step)!;
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, step, step);
    ctx.fillStyle = 'rgba(23,22,28,0.14)';
    ctx.beginPath();
    ctx.arc(step / 2, step / 2, Math.max(1.2, 1.3 * L.u), 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
  }
  return scene.add.tileSprite(0, 0, L.W, L.H, key).setOrigin(0);
}

/** Modal card (or bottom sheet) over a dimmed backdrop. Add content to `panel`, centred at (0, 0). */
export class Popup extends Phaser.GameObjects.Container {
  readonly panel: Phaser.GameObjects.Container;
  readonly width_: number;
  readonly height_: number;
  private sheet: boolean;

  constructor(
    scene: Phaser.Scene, L: Layout, width: number, height: number,
    opts: { title?: string; onClose?: () => void; sheet?: boolean } = {},
  ) {
    super(scene, 0, 0);
    const u = L.u;
    this.width_ = width;
    this.height_ = height;
    this.sheet = !!opts.sheet;
    const shade = scene.add.rectangle(0, 0, L.W, L.H, C.ink, 0.45).setOrigin(0).setInteractive();
    this.add(shade);

    const cy = this.sheet ? L.H - height / 2 : L.H / 2;
    this.panel = scene.add.container(L.W / 2, cy);
    const g = scene.add.graphics();
    if (this.sheet) {
      // Extend below the screen so only the rounded top edge and border show.
      drawBox(g, -width / 2 - 4 * u, -height / 2, width + 8 * u, height + 40 * u, { radius: 24 * u, border: 2 * u });
      g.fillStyle(C.ink).fillRoundedRect(-22 * u, -height / 2 + 10 * u, 44 * u, 5 * u, 3 * u);
    } else {
      drawBox(g, -width / 2, -height / 2, width, height, { radius: 24 * u, border: 2 * u, shadow: 6 * u });
    }
    this.panel.add(g);

    const top = -height / 2 + (this.sheet ? 26 * u : 22 * u);
    if (opts.title) {
      const tt = scene.add.text(-width / 2 + 22 * u, top + 22 * u, opts.title, textStyle(26 * u, HEX.ink, 800, true)).setOrigin(0, 0.5);
      this.panel.add(tt);
    }
    if (opts.onClose) {
      const close = iconButton(scene, L, width / 2 - 22 * u - 22 * u, top + 22 * u, 'icon_close', '✕', opts.onClose);
      this.panel.add(close);
    }
    this.add(this.panel);
    this.setDepth(100).setVisible(false);
    scene.add.existing(this);
  }

  open() {
    this.setVisible(true);
    if (this.sheet) {
      const y = this.panel.y;
      this.panel.setY(y + this.height_);
      this.scene.tweens.add({ targets: this.panel, y, duration: 260, ease: 'Cubic.out' });
    } else {
      this.panel.setScale(0.7).setAlpha(0);
      this.scene.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    }
    return this;
  }

  close() {
    this.setVisible(false);
    return this;
  }
}

/** Sound / music toggles: the icon button turns lime while on. */
export function soundToggles(scene: Phaser.Scene, L: Layout, positions: { sfx: [number, number]; music: [number, number] }) {
  const make = (pos: [number, number], key: string, fallback: string, get: () => boolean, set: (on: boolean) => void) => {
    let btn: NeoButton;
    const slash = scene.add.graphics();
    const paint = () => {
      btn.setBoxStyle({ fill: get() ? C.white : C.warm });
      slash.clear();
      if (!get()) slash.lineStyle(3 * L.u, C.ink).lineBetween(-12 * L.u, -12 * L.u, 12 * L.u, 12 * L.u);
    };
    btn = iconButton(scene, L, pos[0], pos[1], key, fallback, () => {
      set(!get());
      paint();
    });
    btn.face.add(slash);
    paint();
    return btn;
  };
  return [
    make(positions.sfx, 'icon_sound', '♪', () => AudioManager.sfxOn, (on) => AudioManager.setSfx(on)),
    make(positions.music, 'icon_music', '♫', () => AudioManager.musicOn, (on) => AudioManager.setMusic(scene, on)),
  ];
}

/** "EN" / "中文" switch with its left edge at x; restarts the scene so every label is rebuilt. */
export function langButton(scene: Phaser.Scene, L: Layout, x: number, y: number, restart: () => void) {
  const u = L.u;
  const label = getLang() === 'en' ? '中文' : 'EN';
  const t = scene.add.text(0, 0, label, textStyle(14 * u, HEX.ink, 800));
  const iconSize = 18 * u;
  const w = iconSize + 6 * u + t.width + 24 * u;
  const b = new NeoButton(scene, x + w / 2, y, w, 44 * u, { radius: 14 * u, border: 2 * u, shadow: 3 * u }, () => {
    setLang(getLang() === 'en' ? 'zh' : 'en');
    restart();
  });
  const ic = icon(scene, -w / 2 + 12 * u + iconSize / 2, 0, 'icon_globe', '🌐', iconSize);
  t.setOrigin(0, 0.5).setX(-w / 2 + 12 * u + iconSize + 6 * u);
  b.face.add([ic, t]);
  return b;
}
