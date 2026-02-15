import { View } from "react-native";

export function DetailSkeleton() {
  return (
    <View className="flex-1 bg-black">
      {/* Hero image placeholder */}
      <View className="w-full" style={{ aspectRatio: 1, backgroundColor: "#1a1a1a" }} />

      <View className="px-4 mt-4">
        {/* Title */}
        <View className="h-6 w-3/4 rounded bg-white/10 mb-2" />
        {/* Artist */}
        <View className="h-4 w-1/2 rounded bg-white/10 mb-3" />
        {/* Year / format */}
        <View className="h-3 w-1/3 rounded bg-white/10 mb-2" />
        {/* Label */}
        <View className="h-3 w-2/3 rounded bg-white/10" />
      </View>

      {/* Rating placeholder */}
      <View className="flex-row items-center px-4 mt-4">
        <View className="h-3 w-24 rounded bg-white/10 mr-4" />
        <View className="h-3 w-16 rounded bg-white/10" />
      </View>

      {/* Tracklist placeholder */}
      <View className="mt-6 px-4">
        <View className="h-5 w-24 rounded bg-white/10 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} className="flex-row items-center py-2 border-b border-white/5">
            <View className="h-3 w-6 rounded bg-white/10" />
            <View className="h-3 flex-1 mx-3 rounded bg-white/10" />
            <View className="h-3 w-10 rounded bg-white/10" />
          </View>
        ))}
      </View>
    </View>
  );
}
