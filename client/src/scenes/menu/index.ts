import { defineScene } from '@horizon/engine';

import Menu from './menu.scene.ts';
import MenuUI from './menu.ui.tsx';

export const menuScene = defineScene({
  scene: Menu,
  plan: 'menu',
  ui: MenuUI,
});
