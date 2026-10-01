import Phaser from 'phaser';
import type { AssetManifest } from '../assets/manifest';
import { Storage } from '../storage';

const MUSIC_VOLUME = 0.35;
const FADE_MS = 2500;

/**
 * Background playlist + SFX with independent on/off switches (persisted).
 * Music shuffles every downloaded track, plays each once per round
 * (never the same one twice in a row) and fades each in. Missing keys are
 * ignored so the game still runs before assets have been generated.
 */
export class AudioManager {
  private static sm?: Phaser.Sound.BaseSoundManager;
  private static current?: Phaser.Sound.BaseSound;
  private static queue: string[] = [];
  private static last = '';
  private static fadeTimer = 0;
  /** Scene used to (re)start the playlist once the page becomes visible again. */
  private static lastScene?: Phaser.Scene;
  static sfxOn = Storage.get('sfxOn', true);
  static musicOn = Storage.get('musicOn', true);

  private static tracks(scene: Phaser.Scene): string[] {
    const manifest = scene.cache.json.get('manifest') as AssetManifest | undefined;
    return (manifest?.audio ?? []).filter((a) => a.kind === 'music' && scene.cache.audio.exists(a.key)).map((a) => a.key);
  }

  /** Starts the playlist if it isn't already running. Safe to call from every scene. */
  static playMusic(scene: Phaser.Scene) {
    this.sm = scene.sound;
    this.lastScene = scene;
    if (!this.musicOn || this.current?.isPlaying) return;
    // Never start music on a hidden page (e.g. a track finished downloading in a background tab).
    if (document.hidden) return;
    // Paused because the page was hidden, or still waiting for the audio unlock: leave it be.
    if (this.current && (this.current.isPaused || scene.sound.locked)) return;
    this.next(scene);
  }

  /** Page became visible: start the playlist if it was held back while hidden. */
  static onVisible() {
    if (!this.current && this.lastScene) this.playMusic(this.lastScene);
  }

  /** A track finished downloading in the background: start the playlist if nothing is playing yet. */
  static onTrackReady(scene: Phaser.Scene) {
    if (!this.current) this.playMusic(scene);
  }

  private static next(scene: Phaser.Scene) {
    const all = this.tracks(scene);
    if (!all.length || !this.sm) return;
    if (!this.queue.length) {
      this.queue = Phaser.Utils.Array.Shuffle([...all]);
      // A new round must not start with the track that just finished.
      if (this.queue.length > 1 && this.queue[0] === this.last) this.queue.push(this.queue.shift()!);
    }
    const key = this.queue.shift()!;
    this.last = key;

    this.current?.destroy();
    // Never loop: on completion we pick again, so tracks that finish downloading later join the rotation.
    const snd = this.sm.add(key, { volume: 0 }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
    this.current = snd;
    snd.once(Phaser.Sound.Events.COMPLETE, () => {
      if (this.current === snd && this.musicOn) this.next(scene);
    });
    snd.play();
    this.fadeIn(snd);
  }

  /** Plain timer fade: survives scene changes, unlike scene tweens. */
  private static fadeIn(snd: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound) {
    clearInterval(this.fadeTimer);
    const start = performance.now();
    this.fadeTimer = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - start) / FADE_MS);
      if (this.current !== snd) return clearInterval(this.fadeTimer);
      snd.setVolume(MUSIC_VOLUME * k);
      if (k >= 1) clearInterval(this.fadeTimer);
    }, 50);
  }

  static playSfx(scene: Phaser.Scene, key: string, volume = 0.8) {
    if (this.sfxOn && scene.cache.audio.exists(key)) scene.sound.play(key, { volume });
  }

  static setMusic(scene: Phaser.Scene, on: boolean) {
    this.musicOn = on;
    Storage.set('musicOn', on);
    if (on) {
      this.playMusic(scene);
    } else {
      clearInterval(this.fadeTimer);
      this.current?.destroy();
      this.current = undefined;
    }
  }

  static setSfx(on: boolean) {
    this.sfxOn = on;
    Storage.set('sfxOn', on);
  }
}
