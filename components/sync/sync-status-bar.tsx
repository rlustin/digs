import { View, Text } from "react-native";
import { useSyncStore } from "@/stores/sync-store";

const phaseLabels: Record<string, string> = {
  folders: "Syncing folders...",
  "basic-releases": "Syncing collection...",
  details: "Syncing details...",
  error: "Sync error",
};

export function SyncStatusBar() {
  const phase = useSyncStore((s) => s.phase);
  const progress = useSyncStore((s) => s.progress);
  const error = useSyncStore((s) => s.error);

  if (phase === "idle") return null;

  const label = phaseLabels[phase] ?? "Syncing...";
  const progressText =
    progress && phase !== "error"
      ? ` (${progress.current}/${progress.total})`
      : "";

  return (
    <View
      className={`px-4 py-1.5 ${phase === "error" ? "bg-red-900" : "bg-accent"}`}
    >
      <Text className="text-white text-xs text-center font-medium">
        {phase === "error" ? error : `${label}${progressText}`}
      </Text>
    </View>
  );
}
