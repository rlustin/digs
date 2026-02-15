import { View } from "react-native";

export function ReleaseCardSkeleton() {
  return (
    <View className="flex-row px-4 py-3">
      <View className="w-14 h-14 rounded bg-white/10" />
      <View className="flex-1 ml-3 justify-center">
        <View className="h-4 w-3/4 rounded bg-white/10 mb-2" />
        <View className="h-3 w-1/2 rounded bg-white/10 mb-1.5" />
        <View className="h-3 w-1/4 rounded bg-white/10" />
      </View>
    </View>
  );
}

export function FolderSkeleton() {
  return (
    <View className="flex-row items-center px-4 py-4 border-b border-white/5">
      <View className="w-5 h-5 rounded bg-white/10" />
      <View className="h-4 w-1/3 rounded bg-white/10 ml-3 flex-1" />
      <View className="w-8 h-5 rounded-full bg-white/10" />
    </View>
  );
}

export function ListSkeleton({ count = 6, type = "release" }: { count?: number; type?: "release" | "folder" }) {
  const Item = type === "folder" ? FolderSkeleton : ReleaseCardSkeleton;
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
}
