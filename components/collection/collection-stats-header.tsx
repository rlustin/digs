import { View, Text } from "react-native";
import { Disc3, Users } from "lucide-react-native";

interface CollectionStatsHeaderProps {
  totalReleases: number;
  totalArtists: number;
}

export function CollectionStatsHeader({
  totalReleases,
  totalArtists,
}: CollectionStatsHeaderProps) {
  if (totalReleases === 0) return null;

  return (
    <View className="flex-row items-center px-5 pt-4 pb-2">
      <View className="flex-row items-center">
        <Disc3 size={14} color="#9CA3AF" />
        <Text className="text-gray-400 text-sm ml-1.5 font-sans">
          <Text className="font-mono">{totalReleases}</Text> {totalReleases === 1 ? "release" : "releases"}
        </Text>
      </View>
      <Text className="text-gray-300 text-sm mx-2 font-sans">·</Text>
      <View className="flex-row items-center">
        <Users size={14} color="#9CA3AF" />
        <Text className="text-gray-400 text-sm ml-1.5 font-sans">
          <Text className="font-mono">{totalArtists}</Text> {totalArtists === 1 ? "artist" : "artists"}
        </Text>
      </View>
    </View>
  );
}
