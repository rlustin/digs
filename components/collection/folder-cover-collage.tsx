import { View } from "react-native";
import { Image } from "expo-image";
import { Disc3 } from "lucide-react-native";

const COLLAGE_SIZE = 80;
const HALF = COLLAGE_SIZE / 2;
const GAP = 1.5;

interface FolderCoverCollageProps {
  thumbnails: string[];
}

export function FolderCoverCollage({ thumbnails }: FolderCoverCollageProps) {
  if (thumbnails.length === 0) {
    return (
      <View
        style={{
          width: COLLAGE_SIZE,
          height: COLLAGE_SIZE,
          borderRadius: 12,
          backgroundColor: "#F3F4F6",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Disc3 size={28} color="#D1D5DB" />
      </View>
    );
  }

  if (thumbnails.length === 1) {
    return (
      <Image
        source={{ uri: thumbnails[0] }}
        style={{ width: COLLAGE_SIZE, height: COLLAGE_SIZE, borderRadius: 12 }}
        contentFit="cover"
        placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
        transition={200}
      />
    );
  }

  // 2x2 grid (fills remaining slots with first images if < 4)
  const urls = [
    thumbnails[0],
    thumbnails[1] ?? thumbnails[0],
    thumbnails[2] ?? thumbnails[0],
    thumbnails[3] ?? thumbnails[1] ?? thumbnails[0],
  ];

  return (
    <View
      style={{
        width: COLLAGE_SIZE,
        height: COLLAGE_SIZE,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <View style={{ flexDirection: "row", height: HALF - GAP / 2 }}>
        <Image
          source={{ uri: urls[0] }}
          style={{ width: HALF - GAP / 2, height: HALF - GAP / 2 }}
          contentFit="cover"
        />
        <View style={{ width: GAP }} />
        <Image
          source={{ uri: urls[1] }}
          style={{ width: HALF - GAP / 2, height: HALF - GAP / 2 }}
          contentFit="cover"
        />
      </View>
      <View style={{ height: GAP }} />
      <View style={{ flexDirection: "row", height: HALF - GAP / 2 }}>
        <Image
          source={{ uri: urls[2] }}
          style={{ width: HALF - GAP / 2, height: HALF - GAP / 2 }}
          contentFit="cover"
        />
        <View style={{ width: GAP }} />
        <Image
          source={{ uri: urls[3] }}
          style={{ width: HALF - GAP / 2, height: HALF - GAP / 2 }}
          contentFit="cover"
        />
      </View>
    </View>
  );
}
