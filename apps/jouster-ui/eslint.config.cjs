// eslint-disable-next-line @typescript-eslint/no-var-requires
const { join } = require('path');

module.exports = {
  root: true,
  extends: ['@nrwl/nx', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    // Add or modify rules to fix linting warnings
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};