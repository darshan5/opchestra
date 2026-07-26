import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-imports': ['error', { type: 'alphabetical', order: 'asc' }],
      'perfectionist/sort-named-imports': ['error', { type: 'alphabetical', order: 'asc' }],
      'perfectionist/sort-named-exports': ['error', { type: 'alphabetical', order: 'asc' }],
      'no-console': 'warn',
      eqeqeq: 'error',
      curly: 'error',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
