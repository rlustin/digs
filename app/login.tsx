import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Disc3 } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { login } from "@/lib/discogs/oauth";
import { useAuthStore } from "@/stores/auth-store";
import { t } from "@/lib/i18n";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
    <LinearGradient colors={["#FFFFFF", "#F3F4F6"]} style={{ flex: 1 }}>
      <View style={styles.content}>
        <Animated.View style={spinStyle}>
          <Disc3 size={160} color="rgba(249,115,22,0.12)" strokeWidth={1} />
        </Animated.View>

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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t("login.signIn")}</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </LinearGradient>
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
    color: "#111111",
    marginTop: 28,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 17,
    fontFamily: "Inter-Regular",
    color: "#9CA3AF",
    marginTop: 8,
  },
  bottom: {
    paddingHorizontal: 32,
    paddingBottom: 56,
  },
  button: {
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "GeistMono-Bold",
    textAlign: "center",
  },
  error: {
    color: "#f87171",
    fontSize: 14,
    fontFamily: "Inter-Regular",
    textAlign: "center",
    marginTop: 16,
  },
});
