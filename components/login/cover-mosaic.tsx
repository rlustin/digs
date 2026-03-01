import { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COVER_IMAGES } from "@/constants/covers";
import {
  MosaicColumn,
  ColumnHandle,
  STAGGER_PER_TILE,
  STAGGER_PER_COLUMN,
} from "./mosaic-column";

const GAP = 6;
const COLUMN_COUNT = 4;

export function CoverMosaic() {
  const { width, height } = useWindowDimensions();
  const tileSize = (width - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;
  const visibleCount = Math.ceil(height / (tileSize + GAP));

  const columnRefs = useRef<(ColumnHandle | null)[]>([]);
  const displayedSet = useRef(new Set<number>());

  const pickImage = useCallback((currentImg: number): number => {
    displayedSet.current.delete(currentImg);

    const available = COVER_IMAGES.filter((img) => !displayedSet.current.has(img));
    const next =
      available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : COVER_IMAGES[Math.floor(Math.random() * COVER_IMAGES.length)];

    displayedSet.current.add(next);
    return next;
  }, []);

  const pickInitialImage = useCallback((index: number): number => {
    const img = COVER_IMAGES[index % COVER_IMAGES.length];
    displayedSet.current.add(img);
    return img;
  }, []);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleSwap = () => {
      if (!active) return;
      const delay = 800 + Math.random() * 1500;
      timeout = setTimeout(() => {
        if (!active) return;
        const colIdx = Math.floor(Math.random() * COLUMN_COUNT);
        const col = columnRefs.current[colIdx];
        if (col) {
          col.swapRandomTile(() => scheduleSwap());
        } else {
          scheduleSwap();
        }
      }, delay);
    };

    const lastTileDelay =
      (visibleCount - 1) * STAGGER_PER_TILE +
      (COLUMN_COUNT - 1) * STAGGER_PER_COLUMN +
      400;
    timeout = setTimeout(scheduleSwap, lastTileDelay + 1000);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [visibleCount]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={styles.columnsContainer}>
        {Array.from({ length: COLUMN_COUNT }, (_, i) => (
          <MosaicColumn
            key={i}
            ref={(el) => {
              columnRefs.current[i] = el;
            }}
            visibleCount={visibleCount}
            tileSize={tileSize}
            gap={GAP}
            columnIndex={i}
            pickImage={pickImage}
            pickInitialImage={pickInitialImage}
          />
        ))}
      </View>
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.75)",
          "rgba(0,0,0,0.6)",
          "rgba(0,0,0,0.6)",
          "rgba(0,0,0,0.88)",
        ]}
        locations={[0, 0.35, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  columnsContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
});
