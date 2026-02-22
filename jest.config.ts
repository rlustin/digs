import type { Config } from "jest";

const moduleNameMapper = {
  "^@/(.*)$": "<rootDir>/$1",
};

const config: Config = {
  projects: [
    {
      displayName: "logic",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/lib", "<rootDir>/stores"],
      moduleNameMapper,
    },
    {
      displayName: "ui",
      preset: "react-native",
      roots: ["<rootDir>/app", "<rootDir>/components"],
      moduleNameMapper,
      transform: {
        "^.+\\.[jt]sx?$": [
          "babel-jest",
          { configFile: "./babel.config.test.js" },
        ],
      },
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-.*|@testing-library|nativewind|react-native-css-interop|i18n-js|lucide-react-native|@tanstack|@react-navigation|react-native-svg|zustand)/)",
      ],
      setupFiles: [
        "<rootDir>/node_modules/react-native/jest/setup.js",
        "<rootDir>/jest.setup.ui.ts",
      ],
    },
  ],
};

export default config;
