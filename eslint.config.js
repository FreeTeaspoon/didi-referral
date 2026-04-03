import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['app.js'],
    languageOptions: {
      globals: {
        CITIES: 'readonly',
      },
    },
  },
  {
    ignores: ['node_modules/', 'eslint.config.js', 'cities.js'],
  },
];
