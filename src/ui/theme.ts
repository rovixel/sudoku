// Rovixel brand: white dotted ground, ink outlines with hard offset shadows,
// orange for calls to action, lime for "current / active" state.
export const FONT = 'Figtree, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, sans-serif';
export const FONT_DISPLAY = '"Bricolage Grotesque", Figtree, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export const C = {
  ink: 0x17161c,
  white: 0xffffff,
  orange: 0xff5b24,
  lime: 0xd4f53c,
  limePale: 0xeefac0,
  warm: 0xf4f3ee,
  errorBg: 0xffe1e1,
  line: 0xe4e2dc,
  disabled: 0xc9c7c0,
};

export const HEX = {
  ink: '#17161C',
  muted: '#5F5D68',
  faint: '#8E8C96',
  notes: '#6B6975',
  typed: '#3D6B00',
  wrong: '#C8102E',
  disabled: '#A9A7B0',
  white: '#FFFFFF',
};

export function textStyle(px: number, color = HEX.ink, weight: 600 | 700 | 800 = 700, display = false): Phaser.Types.GameObjects.Text.TextStyle {
  return { fontFamily: display ? FONT_DISPLAY : FONT, fontSize: `${Math.round(px)}px`, color, fontStyle: String(weight) };
}
