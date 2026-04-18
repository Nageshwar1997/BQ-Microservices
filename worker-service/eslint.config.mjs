import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (modern setup)
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // uses tsconfig.json automatically
      },
    },

    rules: {
      // 🔥 Important rules (production level)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      // Code quality
      'no-console': 'warn',
      'no-debugger': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Imports cleanliness
      'sort-imports': [
        'warn',
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },

  // ❌ Disable formatting conflicts (Prettier handles formatting)
  prettier,
];
