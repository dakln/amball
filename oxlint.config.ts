import { defineConfig } from 'oxlint';

import { base } from './oxlint.base.ts';

export default defineConfig({
  ignorePatterns: ['c3'],
  extends: [base],
  /** Типы для `no-floating-promises` и `no-misused-promises` — только здесь: Oxlint читает это поле лишь у корневого конфига. */
  options: { typeAware: true },
});
