import "@/global.css";
import "@/lib/sync/background-task";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

import { queryClient } from "@/lib/query-client";
import { runMigrations } from "@/db/migrations";
import { restoreSession } from "@/lib/discogs/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { t } from "@/lib/i18n";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

// Light theme with orange accent
const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#F97316",
    background: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
    "GeistMono-Regular": require("../assets/fonts/GeistMono-Regular.ttf"),
    "GeistMono-Bold": require("../assets/fonts/GeistMono-Bold.ttf"),
    "GeistMono-ExtraBold": require("../assets/fonts/GeistMono-ExtraBold.ttf"),
  });
  const [dbReady, setDbReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  // Run migrations on startup
  useEffect(() => {
    try {
      runMigrations();
      setDbReady(true);
    } catch (e) {
      console.error("Migration failed:", e);
    }
  }, []);

  // Restore session from SecureStore
  useEffect(() => {
    if (!dbReady) return;
    restoreSession().then((username) => {
      if (username) setAuthenticated(username);
      setAuthChecked(true);
    });
  }, [dbReady]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && dbReady && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [loaded, dbReady, authChecked]);

  if (!loaded || !dbReady || !authChecked) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={appTheme}>
        <StatusBar style="dark" />
        <AuthGate />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === "login";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="release/[releaseId]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: t("common.back"),
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#fff",
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
