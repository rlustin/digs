import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { FolderOpen, ChevronRight } from "lucide-react-native";

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
      <View className="flex-1 bg-white">
        <ListSkeleton type="folder" count={4} />
      </View>
    );
  }

  if (folders.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <EmptyState
          icon={FolderOpen}
          title="No folders yet"
          message="Your collection will appear here after syncing"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
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
            tintColor="#F97316"
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
                className="text-gray-900 text-base font-semibold"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {item.count} {item.count === 1 ? "release" : "releases"}
              </Text>
            </View>
            <ChevronRight size={18} color="#D1D5DB" />
          </Pressable>
        )}
      />
    </View>
  );
}
