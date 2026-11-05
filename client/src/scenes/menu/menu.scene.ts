import { RenderKit } from '@horizon/engine';

import { assets } from '@/shared/assets/amball.assets.ts';
import { VIEW_HEIGHT, VIEW_WIDTH } from '@/shared/table-layout.ts';

export default class MenuScene extends RenderKit.Scene {
  protected override readonly bounds = { width: VIEW_WIDTH, height: VIEW_HEIGHT };
  protected override readonly preload = assets;
}
