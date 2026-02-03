import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

const ignores = [
  'node_modules', // Ignore node_modules
  'build', // Ignore build directory
  'dist', // Ignore dist directory
  '**/*.test.ts', // Ignore all test files
  '**/*.test.js', // Ignore all test files
  'migrations/*', // Example of ignoring a specific file
  'eslint.config.mjs',
  'jest.config.js',
  'knexfile.ts',
];

export default [
  {
    files: ['*.test.ts', '*.test.js'], // Apply different rules for test files
    env: {
      jest: true, // Set Jest environment for test files
    },
    rules: {
      'no-console': 'off', // Allow console statements in test files
    },
  },
  {
    // Lint both JavaScript and TypeScript files
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
      parser: parser, // Use the TypeScript parser
      parserOptions: {
        ecmaVersion: 2020, // Support ECMAScript 2020 features
        sourceType: 'module', // Use ECMAScript modules (import/export)
        project: './tsconfig.json', // Path to your TypeScript config file
      },
    },
    rules: {
      'prettier/prettier': 'error', // Force Prettier formatting to be an error
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ], // Ignore unused variables that start with '_'
      'no-console': 'warn', // Warn on console.log usage
      'no-debugger': 'warn', // Warn on debugger statements
      eqeqeq: 'off', // Enforce strict equality (=== instead of ==)
    },
    ignores,
  },
  {
    // Adding plugin configurations directly instead of using "extends"
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
      parser: parser, // Use the TypeScript parser
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      // Use recommended rules for TypeScript and JavaScript
      ...pluginJs.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      'prettier/prettier': 'error', // Force Prettier formatting to be an error
    },
    ignores,
  },
];
