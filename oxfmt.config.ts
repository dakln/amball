import { defineConfig } from 'oxfmt';

export default defineConfig({
  semi: true,
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  printWidth: 100,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  ignorePatterns: ['node_modules', 'c3', 'dist', 'src-tauri', 'docs', '*.json'],
});
