import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { CircleUserRound, RefreshCw } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import { logout } from "@/lib/discogs/oauth";
import { clearClientCredentials } from "@/lib/discogs/client";
import { runFullSync } from "@/lib/sync/engine";
import { getDetailSyncCounts } from "@/db/queries/releases";
import { SyncStatusCard } from "@/components/sync/sync-status-bar";

export default function SettingsScreen() {
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const lastFullSyncAt = useSyncStore((s) => s.lastFullSyncAt);

  const [detailCounts, setDetailCounts] = useState({ synced: 0, total: 0 });

  const refreshCounts = useCallback(() => {
    setDetailCounts(getDetailSyncCounts());
  }, []);

  useEffect(() => {
    refreshCounts();
    const id = setInterval(refreshCounts, 5000);
    return () => clearInterval(id);
  }, [refreshCounts]);

  const detailPending = detailCounts.total > 0 && detailCounts.synced < detailCounts.total;

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
    <View className="flex-1 bg-white">
      {/* User info */}
      <View className="flex-row items-center px-4 py-5 border-b border-gray-100">
        <CircleUserRound size={40} color="#F97316" strokeWidth={1.5} />
        <View className="ml-3">
          <Text className="text-gray-900 text-lg font-semibold">{username}</Text>
          <Text className="text-gray-500 text-sm">Discogs account</Text>
        </View>
      </View>

      {/* Sync info */}
      <View className="px-4 py-4 border-b border-gray-100">
        <Text className="text-gray-400 text-xs uppercase tracking-wider mb-3">
          Sync
        </Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-500 text-sm">Last full sync</Text>
          <Text className="text-gray-900 text-sm">
            {formatDate(lastFullSyncAt)}
          </Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-500 text-sm">Collection</Text>
          <Text className="text-gray-900 text-sm">
            {isSyncing ? "Syncing..." : "Idle"}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-500 text-sm">Release details</Text>
          <Text className="text-gray-900 text-sm">
            {detailCounts.total === 0
              ? "No releases"
              : detailPending
                ? `${detailCounts.synced}/${detailCounts.total}`
                : "All synced"}
          </Text>
        </View>
      </View>

      {/* Collection sync (folders + basic releases) */}
      <SyncStatusCard />

      {/* Detail sync progress bar */}
      {detailPending && (
        <View className="px-4 py-4 border-b border-gray-100">
          <View className="flex-row items-center mb-2">
            <RefreshCw size={12} color="#F97316" />
            <Text className="text-gray-900 text-sm font-medium ml-2">
              Syncing release details
            </Text>
            <Text className="text-gray-500 text-xs ml-auto">
              {Math.round((detailCounts.synced / detailCounts.total) * 100)}%
            </Text>
          </View>
          <View className="h-1 rounded-full bg-gray-200 overflow-hidden">
            <View
              className="h-full rounded-full bg-accent"
              style={{
                width: `${Math.round((detailCounts.synced / detailCounts.total) * 100)}%`,
              }}
            />
          </View>
        </View>
      )}

      {/* Sync Now button */}
      <View className="px-4 py-4 border-b border-gray-100">
        <Pressable
          onPress={handleSyncNow}
          disabled={isSyncing}
          className={`rounded-xl py-3 items-center ${
            isSyncing ? "bg-gray-100" : "bg-accent active:opacity-80"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              isSyncing ? "text-gray-400" : "text-white"
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
