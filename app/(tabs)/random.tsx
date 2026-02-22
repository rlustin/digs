import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Dices } from "lucide-react-native";

import { getRandomRelease } from "@/db/queries/releases";
import { getAllFolders } from "@/db/queries/folders";

export default function RandomScreen() {
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>();
  const [pickCount, setPickCount] = useState(0);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  const { data: release } = useQuery({
    queryKey: ["random", selectedFolder, pickCount],
    queryFn: () => getRandomRelease(selectedFolder),
  });

  const pick = useCallback(() => {
    setPickCount((c) => c + 1);
  }, []);

  const artistNames =
    release?.artists?.map((a: { name: string }) => a.name).join(", ") ??
    "Unknown Artist";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
    <ScrollView className="flex-1" contentContainerClassName="pb-24">
      {/* Folder chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        className="mt-4 mb-4"
      >
        <Pressable
          onPress={() => setSelectedFolder(undefined)}
          className={`px-3 py-1.5 rounded-full ${
            selectedFolder === undefined ? "bg-accent" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm ${
              selectedFolder === undefined ? "text-white font-mono-bold" : "text-gray-500 font-mono"
            }`}
          >
            All
          </Text>
        </Pressable>
        {folders
          .filter((f) => f.id !== 0)
          .map((folder) => (
            <Pressable
              key={folder.id}
              onPress={() => setSelectedFolder(folder.id)}
              className={`px-3 py-1.5 rounded-full ${
                selectedFolder === folder.id ? "bg-accent" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-sm ${
                  selectedFolder === folder.id
                    ? "text-white font-mono-bold"
                    : "text-gray-500 font-mono"
                }`}
              >
                {folder.name}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

      {/* Release display */}
      {release ? (
        <Pressable
          onPress={() => router.push(`/release/${release.releaseId}`)}
          className="items-center px-4"
        >
          <Image
            source={{ uri: release.coverUrl || release.thumbUrl || undefined }}
            style={{ width: 300, height: 300, borderRadius: 12 }}
            contentFit="cover"
            transition={300}
          />
          <Text className="text-gray-900 text-xl font-mono-bold mt-4 text-center">
            {release.title}
          </Text>
          <Text className="text-gray-500 text-base mt-1 text-center font-sans">
            {artistNames}
          </Text>
          {release.year ? (
            <Text className="text-gray-500 text-sm mt-1 font-mono">{release.year}</Text>
          ) : null}
        </Pressable>
      ) : (
        <View className="items-center justify-center py-20">
          <Dices size={48} color="#D1D5DB" strokeWidth={1.5} />
          <Text className="text-gray-400 text-lg mt-4 font-sans">
            Tap the button to pick a random release
          </Text>
        </View>
      )}

      {/* Pick button */}
      <View className="items-center mt-8 px-4">
        <Pressable
          onPress={pick}
          className="bg-accent rounded-xl px-8 py-4 w-full items-center active:opacity-80"
        >
          <Text className="text-white text-lg font-mono-bold">
            <Dices size={18} color="#fff" /> Pick Random
          </Text>
        </Pressable>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
