import { ScrollView, useWindowDimensions } from "react-native";
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

export function ImageGallery({ images }: ImageGalleryProps) {
  const { width } = useWindowDimensions();
  const imageSize = width * 0.85;
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
            width: imageSize,
            height: imageSize,
            borderRadius: 8,
          }}
          contentFit="cover"
          transition={300}
        />
      ))}
    </ScrollView>
  );
}
