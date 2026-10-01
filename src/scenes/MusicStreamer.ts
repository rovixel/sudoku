import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import type { AudioEntry } from '../assets/manifest';

/**
 * Invisible scene that downloads the music tracks in the background (in random
 * order) so the game never waits for megabytes of audio before the menu.
 * It keeps running across Menu/Game switches; each finished track joins the playlist.
 */
export class MusicStreamer extends Phaser.Scene {
  constructor() {
    super('MusicStreamer');
  }

  create(data: { tracks: AudioEntry[] }) {
    if (!data.tracks?.length) return;
    for (const a of Phaser.Utils.Array.Shuffle([...data.tracks])) this.load.audio(a.key, `${a.url}?v=${a.hash}`);
    this.load.on(Phaser.Loader.Events.FILE_COMPLETE, () => AudioManager.onTrackReady(this));
    this.load.start();
  }
}
