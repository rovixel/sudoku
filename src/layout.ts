import Phaser from 'phaser';

export type Mode = 'portrait' | 'landscape';

/** Portrait is designed on a 390-wide grid, landscape on 960×600 (the embed size). */
export const PORTRAIT_W = 1080;
export const PORTRAIT_MIN_H = 1930;
export const PORTRAIT_MAX_H = 2400;
export const LANDSCAPE_H = 1200;
export const LANDSCAPE_MAX_W = 2600;
/** Width/height ratio at which the side-by-side layout takes over. */
export const LANDSCAPE_AT = 1.2;

export interface GameSize {
  width: number;
  height: number;
  mode: Mode;
}

/** Picks a canvas size matching the host's aspect ratio so Scale.FIT barely letterboxes. */
export function computeGameSize(viewW: number, viewH: number): GameSize {
  const aspect = viewW / Math.max(1, viewH);
  if (aspect >= LANDSCAPE_AT) {
    const width = Math.round(Math.min(LANDSCAPE_MAX_W, Math.max(LANDSCAPE_H * LANDSCAPE_AT, LANDSCAPE_H * aspect)));
    return { width, height: LANDSCAPE_H, mode: 'landscape' };
  }
  const height = Math.round(Math.min(PORTRAIT_MAX_H, Math.max(PORTRAIT_MIN_H, PORTRAIT_W / aspect)));
  return { width: PORTRAIT_W, height, mode: 'portrait' };
}

export interface Layout {
  mode: Mode;
  W: number;
  H: number;
  /** Pixels per design unit. */
  u: number;
  /** Design-unit size of the whole screen. */
  wd: number;
  hd: number;
}

export function layoutOf(scene: Phaser.Scene): Layout {
  const W = scene.scale.width;
  const H = scene.scale.height;
  const mode: Mode = W > H ? 'landscape' : 'portrait';
  const u = mode === 'portrait' ? W / 390 : Math.min(H / 600, W / 960);
  return { mode, W, H, u, wd: W / u, hd: H / u };
}
