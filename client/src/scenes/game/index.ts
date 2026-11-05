import { defineScene } from '@horizon/engine';

import Game from './game.scene.ts';
import GameHud from './game.hud.tsx';

export const gameScene = defineScene({
  scene: Game,
  plan: 'game',
  ui: GameHud,
});
