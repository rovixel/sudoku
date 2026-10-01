import Phaser from 'phaser';
import { MANIFEST_URL } from '../assets/manifest';

/** Loads only the asset manifest, then hands off to Preload. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.load.json('manifest', MANIFEST_URL);
  }

  create() {
    this.scene.start('Preload');
  }
}
