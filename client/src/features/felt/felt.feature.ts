import * as ECS from '@horizon/ecs';
import { EngineFeature, RenderKit } from '@horizon/engine';

import { FeltSystem } from './felt.system.ts';

export const FeltFeature = ECS.defineFeature({
  name: 'felt',
  dependsOn: [EngineFeature, RenderKit.RenderKitFeature],
  groups: [
    ECS.group({
      name: 'felt.look',
      phase: ECS.Phase.View,
      target: 'client',
      before: ['render-kit.view'],
      systems: [FeltSystem],
    }),
  ],
});
