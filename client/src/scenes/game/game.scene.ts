import { RenderKit } from '@horizon/engine';

import { assets } from '@/shared/assets/amball.assets.ts';
import { match } from '@/shared/net/match.store.ts';

import { handCardAt, VIEW_HEIGHT, VIEW_WIDTH } from '@/shared/table-layout.ts';

export default class GameScene extends RenderKit.Scene {
  protected override readonly bounds = { width: VIEW_WIDTH, height: VIEW_HEIGHT };
  protected override readonly preload = assets;

  private readonly onPointerDown = (): void => {
    const { x, y } = this.app.input.pointer.viewport;
    const id = handCardAt(match.snapshot, x, y);
    if (id !== null) match.toggleCard(id);
  };

  public override onReady(): void {
    this.app.input.pointer.on('down', this.onPointerDown);
  }

  public override onDestroy(): void {
    this.app.input.pointer.off('down', this.onPointerDown);
    super.onDestroy();
  }
}
