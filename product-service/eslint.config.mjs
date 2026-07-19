import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  /* Global configuration */
  {
    linterOptions: {
      /* Flags stale `// eslint-disable` comments that no longer suppress anything. */
      reportUnusedDisableDirectives: 'error',
    },

    ignores: [
      'node_modules',
      'dist',
      'dist-ssr',
      'coverage',
      '*.d.ts',
      '*.min.js',
      '*.tsbuildinfo',
    ],
  },

  /* JavaScript recommended rules */
  js.configs.recommended,

  /* TypeScript recommended rules */
  ...tseslint.configs.recommended,

  /* Additional TypeScript strict rules */
  ...tseslint.configs.strict,

  /* TypeScript stylistic rules */
  ...tseslint.configs.stylistic,

  /* Type-aware TypeScript rules */
  {
    files: ['**/*.{ts,mts,cts}'],

    languageOptions: { parserOptions: { projectService: true } },

    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],

    plugins: { 'simple-import-sort': simpleImportSort },

    rules: {
      /* Import & Export sorting */
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      'sort-imports': 'off',

      /* TypeScript */
      '@typescript-eslint/consistent-type-imports': 'error',

      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',

      /* Async */
      '@typescript-eslint/await-thenable': 'error',

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/no-misused-promises': 'error',

      '@typescript-eslint/require-await': 'error',

      /* JavaScript */
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'no-debugger': 'error',

      /* Best Practices */
      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],
    },
  },

  /* Disable formatting rules handled by Prettier */
  prettier,
);
