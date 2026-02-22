import { View, Text, Pressable } from "react-native";
import { CircleAlert, RefreshCw, X } from "lucide-react-native";
import { useSyncStore } from "@/stores/sync-store";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

const syncPhaseKeys: Record<string, string> = {
  folders: "sync.folders",
  "basic-releases": "sync.basicReleases",
  details: "sync.details",
  error: "sync.error",
};

export function SyncStatusCard() {
  const phase = useSyncStore((s) => s.phase);
  const progress = useSyncStore((s) => s.progress);
  const error = useSyncStore((s) => s.error);
  const reset = useSyncStore((s) => s.reset);

  if (phase === "idle") return null;

  const isError = phase === "error";
  const label = t(syncPhaseKeys[phase] ?? "sync.syncing");
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <View
      className={`mx-4 mt-3 rounded-2xl overflow-hidden ${
        isError ? "bg-red-50" : "bg-orange-50"
      }`}
    >
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            {isError ? (
              <CircleAlert size={14} color={Colors.red400} />
            ) : (
              <RefreshCw size={12} color={Colors.accent} />
            )}
            <Text
              className={`text-sm font-sans-medium ml-2 ${
                isError ? "text-red-600" : "text-gray-900"
              }`}
              numberOfLines={1}
            >
              {isError ? error : label}
            </Text>
          </View>

          {isError ? (
            <Pressable onPress={reset} hitSlop={8}>
              <X size={14} color={Colors.gray400} />
            </Pressable>
          ) : progress ? (
            <Text className="text-gray-500 text-xs ml-2 font-mono">{pct}%</Text>
          ) : null}
        </View>

        {/* Progress bar */}
        {!isError && progress && progress.total > 0 && (
          <View className="mt-2 h-1 rounded-full bg-gray-200 overflow-hidden">
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
