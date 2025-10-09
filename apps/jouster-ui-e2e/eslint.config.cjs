const cypress = require('eslint-plugin-cypress/flat');
const nx = require('@nx/eslint-plugin');

module.exports = [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  cypress.configs['recommended'],
  {
    // Override or add rules here
    rules: {},
  },
];
