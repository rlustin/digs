import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { getAllFolders } from "@/db/queries/folders";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/skeleton";
import { SyncStatusCard } from "@/components/sync/sync-status-bar";
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

  const onRefresh = () => {
    if (username && !isSyncing) {
      runFullSync(username);
    }
    refetch();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <ListSkeleton type="folder" />
      </View>
    );
  }

  if (folders.length === 0) {
    return (
      <View className="flex-1 bg-white">
        <EmptyState
          icon="folder-open-o"
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
        ListHeaderComponent={<SyncStatusCard />}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={onRefresh}
            tintColor="#F97316"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/folder/${item.id}`)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100 active:bg-gray-50"
          >
            <FontAwesome name="folder" size={20} color="#F97316" />
            <Text className="text-gray-900 text-base flex-1 ml-3">
              {item.name}
            </Text>
            <View className="bg-gray-100 rounded-full px-2.5 py-0.5">
              <Text className="text-gray-500 text-sm">{item.count}</Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={12}
              color="#D1D5DB"
              style={{ marginLeft: 12 }}
            />
          </Pressable>
        )}
      />
    </View>
  );
}
