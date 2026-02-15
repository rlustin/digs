import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useState } from "react";
import { login } from "@/lib/discogs/oauth";
import { useAuthStore } from "@/stores/auth-store";

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
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black items-center justify-center px-8">
      <Text className="text-white text-3xl font-bold mb-2">Vinyl Browser</Text>
      <Text className="text-gray-400 text-base mb-10 text-center">
        Browse your Discogs collection offline
      </Text>

      <Pressable
        onPress={handleLogin}
        disabled={loading}
        className="bg-accent rounded-xl px-8 py-4 w-full items-center active:opacity-80"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-lg font-semibold">
            Sign in with Discogs
          </Text>
        )}
      </Pressable>

      {error && (
        <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>
      )}
    </View>
  );
}
