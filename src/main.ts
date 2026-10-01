import Phaser from 'phaser';
import { AudioManager } from './audio/AudioManager';
import { getLang, setLang } from './i18n';
import { computeGameSize } from './layout';
import { Boot } from './scenes/Boot';
import { Game } from './scenes/Game';
import { Menu } from './scenes/Menu';
import { MusicStreamer } from './scenes/MusicStreamer';
import { Preload } from './scenes/Preload';

const host = document.getElementById('game')!;
const viewport = () => ({ w: host.clientWidth || window.innerWidth, h: host.clientHeight || window.innerHeight });

/** Canvas text can't wait for web fonts by itself, so load them before the first scene draws. */
async function loadFonts() {
  const fonts = ['700 16px Figtree', '800 16px Figtree', '600 16px Figtree', '800 16px "Bricolage Grotesque"'];
  const timeout = new Promise((r) => setTimeout(r, 2500));
  try {
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
  } catch {
    // Fall back to system fonts.
  }
}

async function start() {
  setLang(getLang());
  await loadFonts();
  const v = viewport();
  const size = computeGameSize(v.w, v.h);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: '#FFFFFF',
    width: size.width,
    height: size.height,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 3 },
    scene: [Boot, Preload, Menu, Game, MusicStreamer],
  });

  // Phaser only silences audio when the window loses focus. A page can be hidden without that
  // (switching tabs in some browsers, a collapsed panel or hidden iframe on the host site),
  // which left the music playing in the background — so pause on hidden as well.
  game.events.on(Phaser.Core.Events.HIDDEN, () => game.sound.pauseAll());
  game.events.on(Phaser.Core.Events.VISIBLE, () => {
    game.sound.resumeAll();
    AudioManager.onVisible();
  });

  // Rebuild the layout when the embed is resized or the device rotates.
  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const v = viewport();
      const next = computeGameSize(v.w, v.h);
      const cur = game.scale.gameSize;
      if (next.width === cur.width && next.height === cur.height) return;
      game.scale.setGameSize(next.width, next.height);
      for (const scene of game.scene.getScenes(true)) {
        if (scene.scene.key === 'Game') scene.scene.restart({ resume: true });
        else if (scene.scene.key === 'Menu') scene.scene.restart();
      }
    }, 150);
  });

  // Handy for debugging in the browser console during development.
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
}

// Block long-press context menu and pinch-zoom gestures on mobile browsers.
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());

start();
