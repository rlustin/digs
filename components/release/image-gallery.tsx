import { ScrollView, Dimensions } from "react-native";
import { Image } from "expo-image";

interface ReleaseImage {
  type: string;
  uri: string;
  width: number;
  height: number;
}

interface ImageGalleryProps {
  images: ReleaseImage[];
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_SIZE = SCREEN_WIDTH * 0.85;

export function ImageGallery({ images }: ImageGalleryProps) {
  if (!images.length) return null;

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      className="mt-4"
    >
      {images.map((img, i) => (
        <Image
          key={`${img.uri}-${i}`}
          source={{ uri: img.uri }}
          style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: 8,
          }}
          contentFit="cover"
          transition={300}
        />
      ))}
    </ScrollView>
  );
}
