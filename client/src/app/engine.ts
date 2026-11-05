import { createApp } from '@horizon/engine';

import { gameScene } from '@/scenes/game';
import { menuScene } from '@/scenes/menu';

import { VIEW_HEIGHT, VIEW_WIDTH } from '@/shared/table-layout.ts';

import { plans } from './plans.ts';

const scenes = {
  menu: menuScene,
  game: gameScene,
} as const;

export const app = createApp({
  plans,
  scenes,
  firstScene: 'menu',
  viewport: { width: VIEW_WIDTH, height: VIEW_HEIGHT, mode: 'fill' },
  background: '#17352b',
  scaleMode: 'nearest',
  resolution: 'device',
});

declare module '@horizon/engine' {
  interface Register {
    app: typeof app;
    plans: typeof plans;
  }
}
