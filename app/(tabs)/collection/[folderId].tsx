import { View, Text, FlatList, RefreshControl } from "react-native";
import { useLocalSearchParams , Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { getReleasesByFolder } from "@/db/queries/releases";
import { getAllFolders } from "@/db/queries/folders";
import { useSyncStore } from "@/stores/sync-store";
import { ReleaseCard } from "@/components/release/release-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CircleAlert, Music } from "lucide-react-native";
import { ListSkeleton } from "@/components/ui/skeleton";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

const ITEM_HEIGHT = 104;

export default function FolderReleasesScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const id = Number(folderId);
  const isSyncing = useSyncStore((s) => s.isSyncing);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  const folderName = folders.find((f) => f.id === id)?.name ?? "Releases";

  const {
    data: releases = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["releases", "folder", id],
    queryFn: () => getReleasesByFolder(id),
  });

  if (Number.isNaN(id)) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-gray-400 text-base font-sans">{t("common.error")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: true, title: folderName }} />
      {isLoading ? (
        <ListSkeleton type="release" />
      ) : isError ? (
        <EmptyState
          icon={CircleAlert}
          title={t("common.error")}
          message={t("common.errorLoading")}
        />
      ) : releases.length === 0 ? (
        <EmptyState
          icon={Music}
          title={t("folder.noReleases")}
          message={t("folder.folderEmpty")}
        />
      ) : (
        <FlatList
          data={releases}
          keyExtractor={(item) => String(item.instanceId)}
          contentContainerStyle={{ paddingBottom: 90 }}
          initialNumToRender={15}
          maxToRenderPerBatch={20}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={() => refetch()}
              tintColor={Colors.accent}
            />
          }
          renderItem={({ item }) => (
            <ReleaseCard
              releaseId={item.releaseId}
              title={item.title}
              artists={item.artists}
              year={item.year}
              formats={item.formats}
              thumbUrl={item.thumbUrl}
            />
          )}
        />
      )}
    </View>
  );
}
