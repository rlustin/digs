import { useEffect, useState, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from "react-native-reanimated";

export const STAGGER_PER_TILE = 60;
export const STAGGER_PER_COLUMN = 150;

export interface ColumnHandle {
  swapRandomTile: (onComplete: () => void) => void;
}

interface MosaicColumnProps {
  visibleCount: number;
  tileSize: number;
  gap: number;
  columnIndex: number;
  pickImage: (currentImg: number) => number;
  pickInitialImage: (index: number) => number;
}

interface TileHandle {
  swap: (onComplete: () => void) => void;
}

interface TileProps {
  initialImage: number;
  tileSize: number;
  gap: number;
  entranceDelay: number;
  pickImage: (currentImg: number) => number;
}

const Tile = forwardRef<TileHandle, TileProps>(function Tile(
  { initialImage, tileSize, gap, entranceDelay, pickImage },
  ref,
) {
  const [img, setImg] = useState(initialImage);
  const progress = useSharedValue(0);
  const onSwapDone = useRef<(() => void) | null>(null);

  useEffect(() => {
    progress.value = withDelay(
      entranceDelay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );
  }, [progress, entranceDelay]);

  const handleFadeInComplete = useCallback(() => {
    const cb = onSwapDone.current;
    onSwapDone.current = null;
    if (cb) cb();
  }, []);

  const imgRef = useRef(img);
  imgRef.current = img;

  const fadeInNewImage = useCallback(() => {
    const next = pickImage(imgRef.current);
    setImg(next);
    progress.value = withTiming(
      1,
      { duration: 400, easing: Easing.out(Easing.ease) },
      (finished) => {
        if (finished) runOnJS(handleFadeInComplete)();
      },
    );
  }, [pickImage, progress, handleFadeInComplete]);

  useImperativeHandle(
    ref,
    () => ({
      swap: (onComplete: () => void) => {
        onSwapDone.current = onComplete;
        progress.value = withTiming(
          0,
          { duration: 300, easing: Easing.in(Easing.ease) },
          (finished) => {
            if (finished) runOnJS(fadeInNewImage)();
          },
        );
      },
    }),
    [fadeInNewImage, progress],
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.85 + 0.15 * progress.value }],
  }));

  return (
    <Animated.View style={style}>
      <Image
        source={img}
        style={{
          width: tileSize,
          height: tileSize,
          borderRadius: 8,
          marginBottom: gap,
        }}
        contentFit="cover"
      />
    </Animated.View>
  );
});

export const MosaicColumn = forwardRef<ColumnHandle, MosaicColumnProps>(
  function MosaicColumn(
    { visibleCount, tileSize, gap, columnIndex, pickImage, pickInitialImage },
    ref,
  ) {
    const count = visibleCount;

    const tileRefs = useRef<(TileHandle | null)[]>([]);

    useImperativeHandle(ref, () => ({
      swapRandomTile: (onComplete: () => void) => {
        const idx = Math.floor(Math.random() * count);
        const tile = tileRefs.current[idx];
        if (tile) {
          tile.swap(onComplete);
        } else {
          onComplete();
        }
      },
    }));

    const initialImages = useMemo(
      () =>
        Array.from({ length: count }, (_, i) =>
          pickInitialImage(columnIndex * count + i),
        ),
      [count, columnIndex, pickInitialImage],
    );

    return (
      <View style={{ width: tileSize, height: "100%", overflow: "hidden" }}>
        <View style={{ width: tileSize }}>
          {initialImages.map((img, i) => (
            <Tile
              key={i}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              initialImage={img}
              tileSize={tileSize}
              gap={gap}
              entranceDelay={i * STAGGER_PER_TILE + columnIndex * STAGGER_PER_COLUMN}
              pickImage={pickImage}
            />
          ))}
        </View>
      </View>
    );
  },
);
