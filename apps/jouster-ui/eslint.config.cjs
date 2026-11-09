// eslint.config.cjs
module.exports = {
  // existing configurations...
  'rules': {
    'no-unused-vars': 'error',
    'react/react-in-jsx-scope': 'off',
    'import/order': ['error', { 'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'] }]
  }
};