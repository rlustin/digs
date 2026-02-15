import { View, Text } from "react-native";

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
      <Text className="text-white text-lg font-semibold mb-2 px-4">
        Tracklist
      </Text>
      {tracks.map((track, i) => (
        <View
          key={`${track.position}-${i}`}
          className="flex-row items-center px-4 py-2 border-b border-white/5"
        >
          <Text className="text-gray-500 text-sm w-10">{track.position}</Text>
          <Text className="text-white text-sm flex-1" numberOfLines={1}>
            {track.title}
          </Text>
          {track.duration ? (
            <Text className="text-gray-500 text-sm ml-2">
              {track.duration}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
