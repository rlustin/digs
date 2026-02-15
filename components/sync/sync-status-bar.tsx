import { View, Text, Pressable } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSyncStore } from "@/stores/sync-store";

const phaseLabels: Record<string, string> = {
  folders: "Syncing folders",
  "basic-releases": "Syncing collection",
  details: "Syncing release details",
  error: "Sync failed",
};

export function SyncStatusCard() {
  const phase = useSyncStore((s) => s.phase);
  const progress = useSyncStore((s) => s.progress);
  const error = useSyncStore((s) => s.error);
  const reset = useSyncStore((s) => s.reset);

  if (phase === "idle") return null;

  const isError = phase === "error";
  const label = phaseLabels[phase] ?? "Syncing";
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <View
      className={`mx-4 mt-3 rounded-xl overflow-hidden ${
        isError ? "bg-red-950 border border-red-800/40" : "bg-white/5 border border-white/10"
      }`}
    >
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {isError ? (
              <FontAwesome name="exclamation-circle" size={14} color="#f87171" />
            ) : (
              <FontAwesome name="refresh" size={12} color="#4CAF50" />
            )}
            <Text
              className={`text-sm font-medium ml-2 ${
                isError ? "text-red-400" : "text-white"
              }`}
              numberOfLines={1}
            >
              {isError ? error : label}
            </Text>
          </View>

          {isError ? (
            <Pressable onPress={reset} hitSlop={8}>
              <FontAwesome name="times" size={14} color="#666" />
            </Pressable>
          ) : progress ? (
            <Text className="text-gray-500 text-xs ml-2">{pct}%</Text>
          ) : null}
        </View>

        {/* Progress bar */}
        {!isError && progress && progress.total > 0 && (
          <View className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${pct}%` }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
