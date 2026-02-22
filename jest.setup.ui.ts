/* eslint-disable @typescript-eslint/no-require-imports */

// ── react-native-reanimated ────────────────────────────────
jest.mock("react-native-reanimated", () => {
  const { View, Text, Image } = require("react-native");
  return {
    __esModule: true,
    default: {
      View,
      Text,
      Image,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: unknown) => val,
    withRepeat: (val: unknown) => val,
    withSpring: (val: unknown) => val,
    withSequence: (...vals: unknown[]) => vals[vals.length - 1],
    Easing: {
      linear: (x: unknown) => x,
      in: (fn: unknown) => fn,
      ease: (x: unknown) => x,
      inOut: (fn: unknown) => fn,
    },
    interpolateColor: () => "transparent",
    interpolate: () => 0,
    runOnJS: (fn: Function) => fn,
  };
});

// ── expo-image ─────────────────────────────────────────────
jest.mock("expo-image", () => {
  const { Image } = require("react-native");
  return { Image };
});

// ── expo-blur ──────────────────────────────────────────────
jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { BlurView: View };
});

// ── expo-linear-gradient ───────────────────────────────────
jest.mock("expo-linear-gradient", () => {
  const { View } = require("react-native");
  return { LinearGradient: View };
});

// ── expo-router ────────────────────────────────────────────
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

jest.mock("expo-router", () => {
  const { View } = require("react-native");
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: jest.fn().mockReturnValue({}),
    Stack: { Screen: View },
    Link: View,
  };
});

// ── react-native-safe-area-context ─────────────────────────
jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// ── expo-localization ──────────────────────────────────────
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en" }],
}));

// ── lucide-react-native ────────────────────────────────────
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const icon = (name: string) => {
    const component = (props: Record<string, unknown>) =>
      React.createElement(Text, { testID: `icon-${name}`, ...props });
    component.displayName = name;
    return component;
  };
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        return icon(prop);
      },
    },
  );
});

// ── expo-secure-store ──────────────────────────────────────
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── expo-splash-screen ─────────────────────────────────────
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

// ── drizzle-orm ────────────────────────────────────────────
jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  sql: jest.fn(),
}));

// ── db/client ──────────────────────────────────────────────
jest.mock("@/db/client", () => ({
  db: {},
  expo: { withTransactionSync: jest.fn() },
}));

export { mockRouter };
