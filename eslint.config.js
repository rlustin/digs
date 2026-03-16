// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/__tests__/**"],
    rules: {
      "no-console": "off",
    },
  },
]);
