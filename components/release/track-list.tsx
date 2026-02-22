import { View, Text } from "react-native";
import { t } from "@/lib/i18n";

interface Track {
  position: string;
  title: string;
  duration: string;
}

interface TrackListProps {
  tracks: Track[];
}

export function TrackList({ tracks }: TrackListProps) {
  if (!tracks.length) return null;

  return (
    <View className="mt-4">
      <Text className="text-gray-900 text-lg font-mono mb-2 px-4">
        {t("release.tracklist")}
      </Text>
      {tracks.map((track, i) => (
        <View
          key={`${track.position}-${i}`}
          className="flex-row items-center px-4 py-2 border-b border-gray-100"
        >
          <Text className="text-gray-500 text-sm w-10 font-mono">{track.position}</Text>
          <Text className="text-gray-900 text-sm flex-1 font-sans" numberOfLines={1}>
            {track.title}
          </Text>
          {track.duration ? (
            <Text className="text-gray-500 text-sm ml-2 font-mono">
              {track.duration}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
