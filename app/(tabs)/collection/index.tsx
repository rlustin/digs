import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FolderOpen, ChevronRight, RefreshCw } from "lucide-react-native";

import { getAllFolders, getFolderThumbnails } from "@/db/queries/folders";
import { getCollectionStats } from "@/db/queries/releases";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SyncStatusCard } from "@/components/sync/sync-status-bar";
import { CollectionStatsHeader } from "@/components/collection/collection-stats-header";
import { FolderCoverCollage } from "@/components/collection/folder-cover-collage";
import { useAuthStore } from "@/stores/auth-store";
import { runFullSync } from "@/lib/sync/engine";
import { useSyncStore } from "@/stores/sync-store";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

export default function CollectionScreen() {
  const router = useRouter();
  const username = useAuthStore((s) => s.username);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const {
    data: folders = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  const { data: thumbnails = {} } = useQuery({
    queryKey: ["folder-thumbnails"],
    queryFn: getFolderThumbnails,
  });

  const { data: stats } = useQuery({
    queryKey: ["collection-stats"],
    queryFn: getCollectionStats,
  });

  const onRefresh = () => {
    if (username && !isSyncing) {
      runFullSync(username);
    }
    refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <ListSkeleton type="folder" count={4} />
      </SafeAreaView>
    );
  }

  if (folders.length === 0 && isSyncing) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <EmptyState
          icon={RefreshCw}
          title={t("collection.syncing")}
          message={t("collection.syncingMessage")}
        />
      </SafeAreaView>
    );
  }

  if (folders.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <EmptyState
          icon={FolderOpen}
          title={t("collection.noFolders")}
          message={t("collection.noFoldersMessage")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <FlatList
        data={folders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 90 }}
        ListHeaderComponent={
          <>
            <SyncStatusCard />
            {stats && (
              <CollectionStatsHeader
                totalReleases={stats.totalReleases}
                totalArtists={stats.totalArtists}
              />
            )}
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/collection/${item.id}`)}
            className="flex-row items-center px-4 py-3 active:bg-gray-50"
          >
            <FolderCoverCollage thumbnails={thumbnails[item.id] ?? []} />
            <View className="flex-1 ml-4 justify-center">
              <Text
                className="text-gray-900 text-base font-mono"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text className="text-gray-400 text-sm mt-1 font-sans">
                {item.count} {t("stats.release", { count: item.count })}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.gray300} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
