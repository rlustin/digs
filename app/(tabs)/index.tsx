import { View, Text, FlatList, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { getAllFolders } from "@/db/queries/folders";
import { EmptyState } from "@/components/ui/empty-state";

export default function CollectionScreen() {
  const router = useRouter();
  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  if (folders.length === 0) {
    return (
      <View className="flex-1 bg-black">
        <EmptyState
          icon="folder-open-o"
          title="No folders yet"
          message="Your collection will appear here after syncing"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <FlatList
        data={folders}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(tabs)/folder/${item.id}`)}
            className="flex-row items-center px-4 py-4 border-b border-white/5 active:bg-white/5"
          >
            <FontAwesome name="folder" size={20} color="#4CAF50" />
            <Text className="text-white text-base flex-1 ml-3">
              {item.name}
            </Text>
            <View className="bg-white/10 rounded-full px-2.5 py-0.5">
              <Text className="text-gray-400 text-sm">{item.count}</Text>
            </View>
            <FontAwesome
              name="chevron-right"
              size={12}
              color="#555"
              style={{ marginLeft: 12 }}
            />
          </Pressable>
        )}
      />
    </View>
  );
}
