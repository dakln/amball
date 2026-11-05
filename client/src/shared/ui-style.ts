import type * as Engine from '@horizon/engine';

import { assets } from './assets/amball.assets.ts';

export const INK = 0xfaf1dc;
export const DIM = 0xb4bdb0;
export const GOLD = 0xffcf4a;
export const RED = 0xff7a66;

export const THEME = { font: assets.font, size: 14, color: INK };

const SHADOW = {
  shadowColor: 0x000000,
  shadowSize: 1,
  shadowAlpha: 0.55,
  shadowOffset: { x: 0, y: 3 },
};

export const PANEL: Engine.PanelStyle = {
  color: 0x14221f,
  border: 0x4d6f62,
  borderWidth: 2,
  radius: 7,
  ...SHADOW,
};

function buttonStyle(color: number, light: number, dark: number): Partial<Engine.ButtonProps> {
  return {
    normal: { color, border: light, borderWidth: 2, radius: 6, ...SHADOW },
    hover: { color: light, border: INK, borderWidth: 2, radius: 6, ...SHADOW },
    pressed: { color: dark, border: light, borderWidth: 2, radius: 6 },
    selectedStyle: { color: 0xa87a14, border: GOLD, borderWidth: 2, radius: 6, ...SHADOW },
    disabledStyle: { color: 0x253029, border: 0x36443c, borderWidth: 2, radius: 6 },
    animations: { hover: { scale: 1.07 }, pressed: { scale: 0.92 }, duration: 0.07 },
  };
}

export const BUTTON = buttonStyle(0x2f6152, 0x46897a, 0x224a3e);
export const BUTTON_PLAY = buttonStyle(0x2a6fa8, 0x4596d6, 0x1d5078);
export const BUTTON_CHECK = buttonStyle(0xa83f3a, 0xd65f58, 0x7a2b28);
export const BUTTON_DROP = buttonStyle(0x8a5a1e, 0xb98030, 0x634013);
