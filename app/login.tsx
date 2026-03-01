import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { login } from "@/lib/discogs/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { Colors } from "@/constants/Colors";
import { CoverMosaic } from "@/components/login/cover-mosaic";
import { t } from "@/lib/i18n";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { username } = await login();
      setAuthenticated(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <CoverMosaic />

      <View style={styles.content}>
        <Text style={styles.title}>{t("login.title")}</Text>
        <Text style={styles.tagline}>{t("login.tagline")}</Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>{t("login.signIn")}</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 52,
    fontFamily: "GeistMono-ExtraBold",
    color: Colors.white,
    marginTop: 28,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 17,
    fontFamily: "Inter-Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 56,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: "GeistMono-Bold",
    textAlign: "center",
  },
  error: {
    color: Colors.red400,
    fontSize: 14,
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginTop: 16,
  },
});
