import { RenderKit } from '@horizon/engine';

import { FeltFeature } from '@/features/felt';
import { GameFeature } from '@/features/game';

export const plans = {
  menu: [FeltFeature, RenderKit.RenderKitFeature],
  game: [FeltFeature, GameFeature, RenderKit.RenderKitFeature],
} as const;
