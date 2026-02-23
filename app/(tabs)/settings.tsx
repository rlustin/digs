import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleAlert, RefreshCw, X } from "lucide-react-native";

import { useAuthStore } from "@/stores/auth-store";
import { useSyncStore } from "@/stores/sync-store";
import { logout } from "@/lib/discogs/oauth";
import { clearClientCredentials } from "@/lib/discogs/client";
import { runFullSync, runIncrementalSync } from "@/lib/sync/engine";
import { clearAllReleases, getDetailSyncCounts } from "@/db/queries/releases";
import { clearAllFolders } from "@/db/queries/folders";
import { queryClient } from "@/lib/query-client";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

const syncPhaseKeys: Record<string, string> = {
  folders: "sync.folders",
  "basic-releases": "sync.basicReleases",
  details: "sync.details",
  error: "sync.error",
};

export default function SettingsScreen() {
  const username = useAuthStore((s) => s.username);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const cancelSync = useSyncStore((s) => s.cancelSync);
  const clearLastFullSyncAt = useSyncStore((s) => s.clearLastFullSyncAt);
  const lastFullSyncAt = useSyncStore((s) => s.lastFullSyncAt);
  const phase = useSyncStore((s) => s.phase);
  const progress = useSyncStore((s) => s.progress);
  const error = useSyncStore((s) => s.error);
  const reset = useSyncStore((s) => s.reset);

  const [detailCounts, setDetailCounts] = useState({ synced: 0, total: 0 });

  const refreshCounts = useCallback(() => {
    setDetailCounts(getDetailSyncCounts());
  }, []);

  useEffect(() => {
    refreshCounts();
    if (!isSyncing) return;
    const id = setInterval(refreshCounts, 5000);
    return () => clearInterval(id);
  }, [refreshCounts, isSyncing]);

  const detailPending = detailCounts.total > 0 && detailCounts.synced < detailCounts.total;

  const handleSyncNow = () => {
    if (!username || isSyncing) return;
    if (lastFullSyncAt) {
      runIncrementalSync(username);
    } else {
      runFullSync(username);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("settings.logOut"), t("settings.logOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logOut"),
        style: "destructive",
        onPress: async () => {
          try {
            cancelSync();
            clearLastFullSyncAt();
            clearAllFolders();
            clearAllReleases();
            queryClient.invalidateQueries();
          } catch (e) {
            console.warn("Logout: DB cleanup failed", e);
          }
          try {
            await logout();
          } catch (e) {
            console.warn("Logout: credential removal failed", e);
          }
          try {
            clearClientCredentials();
          } catch (e) {
            console.warn("Logout: client credentials clear failed", e);
          }
          clearAuth();
        },
      },
    ]);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return t("settings.never");
    return new Date(iso).toLocaleString();
  };

  const isError = phase === "error";
  const syncActive = phase !== "idle";
  const syncLabel = t(syncPhaseKeys[phase] ?? "sync.syncing");
  const syncPct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const initial = username ? username.charAt(0).toUpperCase() : "?";

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
    <ScrollView className="flex-1">
      {/* Profile area */}
      <View className="items-center pt-8 pb-6">
        <View className="w-16 h-16 rounded-full bg-accent items-center justify-center mb-3">
          <Text className="text-white text-2xl font-sans-bold">{initial}</Text>
        </View>
        <Text className="text-gray-900 text-lg font-mono-bold">{username}</Text>
        <Text className="text-gray-400 text-sm font-sans">{t("settings.discogsAccount")}</Text>
      </View>

      {/* SYNC section */}
      <Text className="text-gray-400 text-xs uppercase tracking-wider mx-4 mb-2 ml-8 font-mono">
        {t("settings.syncSection")}
      </Text>
      <View className="mx-4 rounded-2xl bg-white overflow-hidden">
        {/* Last full sync */}
        <View className="flex-row justify-between px-4 py-3 border-b border-gray-100">
          <Text className="text-gray-500 text-sm font-sans">{t("settings.lastFullSync")}</Text>
          <Text className="text-gray-900 text-sm font-sans">{formatDate(lastFullSyncAt)}</Text>
        </View>

        {/* Collection status */}
        <View className={`flex-row justify-between px-4 py-3 ${syncActive || detailPending ? "border-b border-gray-100" : ""}`}>
          <Text className="text-gray-500 text-sm font-sans">{t("settings.collection")}</Text>
          <Text className="text-gray-900 text-sm font-sans">
            {isSyncing ? t("settings.syncing") : t("settings.idle")}
          </Text>
        </View>

        {/* Release details */}
        {(detailCounts.total > 0 || !syncActive) && (
          <View className={`flex-row justify-between px-4 py-3 ${syncActive || detailPending ? "border-b border-gray-100" : ""}`}>
            <Text className="text-gray-500 text-sm font-sans">{t("settings.releaseDetails")}</Text>
            <Text className="text-gray-900 text-sm font-sans">
              {detailCounts.total === 0
                ? t("settings.noReleases")
                : detailPending
                  ? `${detailCounts.synced}/${detailCounts.total}`
                  : t("settings.allSynced")}
            </Text>
          </View>
        )}

        {/* Active sync status (inline) */}
        {syncActive && !isError && (
          <View className={`px-4 py-3 ${detailPending ? "border-b border-gray-100" : ""}`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <RefreshCw size={12} color={Colors.accent} />
                <Text className="text-sm font-sans-medium ml-2 text-gray-900" numberOfLines={1}>
                  {syncLabel}
                </Text>
              </View>
              {progress ? (
                <Text className="text-gray-500 text-xs ml-2 font-mono">{syncPct}%</Text>
              ) : null}
            </View>
            {progress && progress.total > 0 && (
              <View className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
                <View
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${syncPct}%` }}
                />
              </View>
            )}
          </View>
        )}

        {/* Error state (inline) */}
        {isError && (
          <View className="px-4 py-3 bg-red-50">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <CircleAlert size={14} color={Colors.red400} />
                <Text className="text-sm font-sans-medium ml-2 text-red-600" numberOfLines={1}>
                  {error}
                </Text>
              </View>
              <Pressable onPress={reset} hitSlop={8} accessibilityLabel={t("common.dismiss")} accessibilityRole="button">
                <X size={14} color={Colors.gray400} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Detail sync progress */}
        {detailPending && (
          <View className="px-4 py-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <RefreshCw size={12} color={Colors.accent} />
                <Text className="text-gray-900 text-sm font-sans-medium ml-2">
                  {t("settings.syncingReleaseDetails")}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs font-mono">
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
      </View>

      {/* Sync Now */}
      <Pressable
        onPress={handleSyncNow}
        disabled={isSyncing}
        className="mx-4 mt-3 rounded-2xl bg-white overflow-hidden active:opacity-80"
      >
        <Text
          className={`text-center py-3 text-base font-mono-bold ${
            isSyncing ? "text-gray-300" : "text-accent"
          }`}
        >
          {isSyncing ? t("settings.syncing") : t("settings.syncNow")}
        </Text>
      </Pressable>

      {/* ACCOUNT section */}
      <Text className="text-gray-400 text-xs uppercase tracking-wider mx-4 mt-8 mb-2 ml-8 font-mono">
        {t("settings.accountSection")}
      </Text>
      <View className="mx-4 rounded-2xl bg-white overflow-hidden">
        <Pressable onPress={handleLogout} className="active:opacity-80">
          <Text className="text-red-500 text-base font-mono-bold text-center py-3">
            {t("settings.logOut")}
          </Text>
        </Pressable>
      </View>

      {/* Bottom padding */}
      <View className="h-24" />
    </ScrollView>
    </SafeAreaView>
  );
}
