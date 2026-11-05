import { defineConfig, type OxlintOverride } from 'oxlint';

import { base } from '../oxlint.base.ts';

type Rules = NonNullable<OxlintOverride['rules']>;

const SERVER_CODE = 'Import server code only with `import type`';

const BANNED_PACKAGES = [
  {
    name: 'pixi.js',
    message: 'Not allowed, use @horizon/engine features.',
  },
  {
    name: 'pixi-filters',
    message: 'Use RenderKit.Effects from @horizon/engine.',
  },
  {
    name: '@amball/server',
    allowTypeImports: true,
    message: SERVER_CODE,
  },
];

const BANNED_PATTERNS: Pattern[] = [
  {
    group: ['@amball/server/*'],
    allowTypeImports: true,
    message: SERVER_CODE,
  },
  {
    group: ['@horizon/engine/internal', '@horizon/engine/lib/*'],
    message: 'Engine internals - only for tools.',
  },
];

const LAYERS = ['app', 'scenes', 'features', 'shared'] as const;

type Pattern = { group?: string[]; regex?: string; allowTypeImports?: boolean; message: string };

function restricted(patterns: Pattern[], { assetFiles = false } = {}): Rules {
  return {
    'no-restricted-imports': [
      'error',
      {
        paths: BANNED_PACKAGES,
        patterns: [...BANNED_PATTERNS, ...(assetFiles ? [] : [ASSET_FILES]), ...patterns],
      },
    ],
  };
}

const ASSET_FILES: Pattern = {
  group: ['@assets/*'],
  message: 'Assets allowed for import only from src/shared/assets.',
};

const FEATURE_ENTRIES: Pattern = {
  group: ['@/features/*/**', '!@/features/*/ui'],
  message:
    'Feature can be used only by import @/features/<feature> (ECS) OR @/features/<feature>/ui (HUD) without using nested files.',
};

function boundaries(index: number): Pattern[] {
  const layer = LAYERS[index]!;
  const above = LAYERS.slice(0, index).map((upper) => ({
    group: [`@/${upper}/*`, `@/${upper}`],
    message: `Layer ${layer} can not depend on ${upper}: (app → scenes → features → shared).`,
  }));

  return LAYERS.indexOf('features') > index ? [...above, FEATURE_ENTRIES] : above;
}

const layerBoundaries = LAYERS.map((layer, index): OxlintOverride => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: restricted(boundaries(index)),
}));

export default defineConfig({
  extends: [base],
  overrides: [
    {
      files: ['src/*.{ts,tsx}'],
      rules: restricted([]),
    },
    ...layerBoundaries,
    {
      files: ['src/shared/assets/**/*.{ts,tsx}'],
      rules: restricted(boundaries(LAYERS.indexOf('shared')), { assetFiles: true }),
    },
  ],
});
