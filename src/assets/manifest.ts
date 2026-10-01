// Shape of public/assets/manifest.json. Written by tools/assetgen, read by the Preload scene.

export interface ImageEntry {
  key: string;
  url: string;
  /** Present when the image is a horizontal spritesheet strip. */
  frameWidth?: number;
  frameHeight?: number;
  frames?: number;
  hash: string;
}

export interface AudioEntry {
  key: string;
  url: string;
  kind: 'music' | 'sfx';
  hash: string;
}

export interface AssetManifest {
  images: ImageEntry[];
  audio: AudioEntry[];
}

export const MANIFEST_URL = 'assets/manifest.json';
