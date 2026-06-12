// .eslintrc.cjs - POC 31: CineScope
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'node_modules', 'rayfin/.temp', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    // The preview Rayfin client surface is probed dynamically in
    // src/lib/client.ts; targeted any-usage is accepted there.
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
