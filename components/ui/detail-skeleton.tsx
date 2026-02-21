import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COVER_WIDTH_RATIO = 0.75;
const COVER_TOP_SPACING = 20;
const BACKDROP_EXTRA = 20;

export function DetailSkeleton() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const coverSize = screenWidth * COVER_WIDTH_RATIO;
  const backdropHeight = insets.top + 44 + COVER_TOP_SPACING + coverSize + BACKDROP_EXTRA;

  return (
    <View className="flex-1 bg-white">
      {/* Blurred backdrop placeholder */}
      <View style={{ height: backdropHeight, backgroundColor: "#E5E7EB" }}>
        {/* Floating cover art placeholder */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 44 + COVER_TOP_SPACING,
            left: (screenWidth - coverSize) / 2,
            width: coverSize,
            height: coverSize,
            borderRadius: 12,
            backgroundColor: "#D1D5DB",
          }}
        />
      </View>

      <View className="px-4 mt-3">
        {/* Title */}
        <View className="h-6 w-3/4 rounded bg-gray-200 mb-2" />
        {/* Artist */}
        <View className="h-4 w-1/2 rounded bg-gray-200 mb-3" />
        {/* Year / format */}
        <View className="h-3 w-1/3 rounded bg-gray-200 mb-2" />
        {/* Label */}
        <View className="h-3 w-2/3 rounded bg-gray-200 mb-2" />
        {/* Folder + rating row */}
        <View className="flex-row items-center mt-1">
          <View className="h-6 w-20 rounded-full bg-gray-200 mr-3" />
          <View className="h-3 w-24 rounded bg-gray-200" />
        </View>
      </View>

      {/* Tracklist placeholder */}
      <View className="mt-6 px-4">
        <View className="h-5 w-24 rounded bg-gray-200 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            className="flex-row items-center py-2 border-b border-gray-100"
          >
            <View className="h-3 w-6 rounded bg-gray-200" />
            <View className="h-3 flex-1 mx-3 rounded bg-gray-200" />
            <View className="h-3 w-10 rounded bg-gray-200" />
          </View>
        ))}
      </View>
    </View>
  );
}
