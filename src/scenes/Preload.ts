import Phaser from 'phaser';
import type { AssetManifest } from '../assets/manifest';
import { layoutOf } from '../layout';
import { C } from '../ui/theme';
import { addBackground, drawBox } from '../ui/widgets';

/** Queues everything listed in the manifest and shows a progress bar. */
export class Preload extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    const L = layoutOf(this);
    const u = L.u;
    addBackground(this, L);
    const w = Math.min(L.W * 0.6, 300 * u);
    const h = 16 * u;
    const x = (L.W - w) / 2;
    const y = (L.H - h) / 2;
    drawBox(this.add.graphics(), x, y, w, h, { radius: h / 2, border: 2 * u, shadow: 3 * u });
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear().fillStyle(C.lime).fillRoundedRect(x + 3 * u, y + 3 * u, Math.max(0, (w - 6 * u) * p), h - 6 * u, (h - 6 * u) / 2);
    });

    const manifest = this.cache.json.get('manifest') as AssetManifest | undefined;
    if (!manifest) return;
    for (const img of manifest.images) {
      const url = `${img.url}?v=${img.hash}`;
      if (img.frameWidth && img.frameHeight) {
        this.load.spritesheet(img.key, url, { frameWidth: img.frameWidth, frameHeight: img.frameHeight });
      } else {
        this.load.image(img.key, url);
      }
    }
    // Sound effects are tiny and needed at once; music streams in afterwards (MusicStreamer).
    for (const a of manifest.audio) if (a.kind === 'sfx') this.load.audio(a.key, `${a.url}?v=${a.hash}`);
  }

  create() {
    const manifest = this.cache.json.get('manifest') as AssetManifest | undefined;
    this.scene.launch('MusicStreamer', { tracks: manifest?.audio.filter((a) => a.kind === 'music') ?? [] });
    this.scene.start('Menu');
  }
}
