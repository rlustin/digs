import { View, Text, Pressable, Alert } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import { logout } from "@/lib/discogs/oauth";
import { clearClientCredentials } from "@/lib/discogs/client";
import { runFullSync } from "@/lib/sync/engine";

export default function SettingsScreen() {
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastFullSyncAt = useSyncStore((s) => s.lastFullSyncAt);

  const handleSyncNow = () => {
    if (username && !isSyncing) {
      runFullSync(username);
    }
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          clearClientCredentials();
          clearAuth();
        },
      },
    ]);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  };

  return (
    <View className="flex-1 bg-black">
      {/* User info */}
      <View className="flex-row items-center px-4 py-5 border-b border-white/5">
        <FontAwesome name="user-circle" size={40} color="#4CAF50" />
        <View className="ml-3">
          <Text className="text-white text-lg font-semibold">{username}</Text>
          <Text className="text-gray-500 text-sm">Discogs account</Text>
        </View>
      </View>

      {/* Sync info */}
      <View className="px-4 py-4 border-b border-white/5">
        <Text className="text-gray-400 text-xs uppercase tracking-wider mb-3">
          Sync
        </Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-400 text-sm">Last full sync</Text>
          <Text className="text-white text-sm">
            {formatDate(lastFullSyncAt)}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-400 text-sm">Status</Text>
          <Text className="text-white text-sm">
            {isSyncing ? "Syncing..." : "Idle"}
          </Text>
        </View>
      </View>

      {/* Sync Now button */}
      <View className="px-4 py-4 border-b border-white/5">
        <Pressable
          onPress={handleSyncNow}
          disabled={isSyncing}
          className={`rounded-xl py-3 items-center ${
            isSyncing ? "bg-white/5" : "bg-accent active:opacity-80"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              isSyncing ? "text-gray-500" : "text-white"
            }`}
          >
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Text>
        </Pressable>
      </View>

      {/* Logout */}
      <View className="px-4 py-4">
        <Pressable
          onPress={handleLogout}
          className="rounded-xl py-3 items-center border border-red-500/30 active:bg-red-500/10"
        >
          <Text className="text-red-400 text-base font-semibold">Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}
