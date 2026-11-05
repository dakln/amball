import * as ECS from '@horizon/ecs';
import { EngineFeature, RenderKit } from '@horizon/engine';

import { CardViewSystem } from './card-view.system.ts';
import { JokerFxSystem } from './joker-fx.system.ts';

export const GameFeature = ECS.defineFeature({
  name: 'game',
  dependsOn: [EngineFeature, RenderKit.RenderKitFeature],
  groups: [
    ECS.group({
      name: 'game.cards',
      phase: ECS.Phase.View,
      target: 'client',
      before: ['render-kit.view'],
      systems: [CardViewSystem, JokerFxSystem],
    }),
  ],
});
