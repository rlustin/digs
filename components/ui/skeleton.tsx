import { View } from "react-native";

import { Shimmer } from "@/components/ui/shimmer";

export function ReleaseCardSkeleton() {
  return (
    <View className="flex-row px-4 py-3">
      <Shimmer>
        <View className="w-20 h-20 rounded-lg bg-gray-100" />
      </Shimmer>
      <View className="flex-1 ml-4 justify-center">
        <Shimmer>
          <View className="h-4 w-3/4 rounded bg-gray-100 mb-2" />
        </Shimmer>
        <Shimmer>
          <View className="h-3 w-1/2 rounded bg-gray-100 mb-1.5" />
        </Shimmer>
        <Shimmer>
          <View className="h-3 w-1/4 rounded bg-gray-100" />
        </Shimmer>
      </View>
    </View>
  );
}

export function FolderSkeleton() {
  return (
    <View className="flex-row items-center px-4 py-3">
      <Shimmer>
        <View className="rounded-xl bg-gray-100" style={{ width: 80, height: 80 }} />
      </Shimmer>
      <View className="flex-1 ml-4 justify-center">
        <Shimmer>
          <View className="h-4 w-2/3 rounded bg-gray-100 mb-2" />
        </Shimmer>
        <Shimmer>
          <View className="h-3 w-1/4 rounded bg-gray-100" />
        </Shimmer>
      </View>
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
