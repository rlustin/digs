import { View, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { getReleasesByFolder } from "@/db/queries/releases";
import { getAllFolders } from "@/db/queries/folders";
import { ReleaseCard } from "@/components/release/release-card";
import { EmptyState } from "@/components/ui/empty-state";

export default function FolderReleasesScreen() {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  const id = Number(folderId);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  const folderName = folders.find((f) => f.id === id)?.name ?? "Releases";

  const { data: releases = [] } = useQuery({
    queryKey: ["releases", "folder", id],
    queryFn: () => getReleasesByFolder(id),
  });

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: true, title: folderName }} />
      {releases.length === 0 ? (
        <EmptyState
          icon="music"
          title="No releases"
          message="This folder is empty"
        />
      ) : (
        <FlatList
          data={releases}
          keyExtractor={(item) => String(item.instanceId)}
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
