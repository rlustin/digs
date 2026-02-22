import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo } from "react";

interface ReleaseCardProps {
  releaseId: number;
  title: string;
  artists: { name: string; id: number }[] | null;
  year: number | null;
  formats: { name: string; qty: string; descriptions?: string[] }[] | null;
  thumbUrl: string | null;
}

export const ReleaseCard = memo(function ReleaseCard({
  releaseId,
  title,
  artists,
  year,
  formats,
  thumbUrl,
}: ReleaseCardProps) {
  const router = useRouter();

  const artistNames = artists?.map((a) => a.name).join(", ") ?? "Unknown Artist";
  const formatDesc =
    formats?.[0]?.descriptions?.join(", ") ?? formats?.[0]?.name ?? "";

  return (
    <Pressable
      onPress={() => router.push(`/release/${releaseId}`)}
      className="flex-row px-4 py-3 active:bg-gray-50"
    >
      <View
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <Image
          source={{ uri: thumbUrl || undefined }}
          style={{ width: 80, height: 80, borderRadius: 8 }}
          contentFit="cover"
          placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
          transition={200}
        />
      </View>
      <View className="flex-1 ml-4 justify-center">
        <Text className="text-gray-900 text-lg font-mono-bold" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-gray-400 text-sm mt-0.5 font-sans" numberOfLines={1}>
          {artistNames}
        </Text>
        <View className="flex-row items-center mt-0.5">
          {year ? (
            <Text className="text-gray-500 text-xs font-mono">{year}</Text>
          ) : null}
          {year && formatDesc ? (
            <Text className="text-gray-600 text-xs mx-1 font-mono">·</Text>
          ) : null}
          {formatDesc ? (
            <Text className="text-gray-500 text-xs font-mono" numberOfLines={1}>
              {formatDesc}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});
