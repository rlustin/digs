import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useRef } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Dices } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { getRandomRelease } from "@/db/queries/releases";
import { getAllFolders } from "@/db/queries/folders";
import { t } from "@/lib/i18n";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SWIPE_THRESHOLD = 80;

export default function RandomScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>();
  const [pickCount, setPickCount] = useState(0);

  const coverSize = screenWidth - 48;

  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: getAllFolders,
  });

  const { data: release, dataUpdatedAt } = useQuery({
    queryKey: ["random", selectedFolder, pickCount],
    queryFn: () => getRandomRelease(selectedFolder),
    placeholderData: keepPreviousData,
  });

  // Reveal new release only after data has actually changed
  const pendingReveal = useRef(false);
  useEffect(() => {
    if (pendingReveal.current) {
      pendingReveal.current = false;
      cardOpacity.value = withTiming(1, { duration: 100 }, () => {
        cardScale.value = withTiming(1, { duration: 300 });
      });
    }
  }, [dataUpdatedAt, cardOpacity, cardScale]);

  // ── Swipe gesture ──

  const screenWidthRef = useRef(screenWidth);
  screenWidthRef.current = screenWidth;

  const onSwipeOff = useCallback(
    (direction: number) => {
      pendingReveal.current = true;
      setPickCount((c) => c + 1);
      const sw = screenWidthRef.current;
      translateX.value = -direction * sw;
      translateX.value = withTiming(0, { duration: 300 });
      cardOpacity.value = 0;
      cardScale.value = 0.95;
    },
    [translateX, cardOpacity, cardScale],
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 12,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gs) => {
        translateX.value = gs.dx;
      },
      onPanResponderRelease: (_, gs) => {
        const sw = screenWidthRef.current;
        if (Math.abs(gs.dx) > SWIPE_THRESHOLD || Math.abs(gs.vx) > 0.5) {
          const dir = gs.dx > 0 ? 1 : -1;
          translateX.value = withTiming(
            dir * sw,
            { duration: 200, easing: Easing.in(Easing.ease) },
            (finished) => {
              if (finished) runOnJS(onSwipeOff)(dir);
            },
          );
        } else {
          translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      },
    }),
  ).current;

  // ── Button press ──

  const incrementPick = useCallback(() => {
    setPickCount((c) => c + 1);
  }, []);

  const startPick = useCallback(() => {
    pendingReveal.current = true;
    incrementPick();
  }, [incrementPick]);

  const pick = useCallback(() => {
    cardScale.value = withTiming(0.96, { duration: 120 });
    cardOpacity.value = withTiming(0, { duration: 120 }, () => {
      runOnJS(startPick)();
    });
  }, [cardScale, cardOpacity, startPick]);

  // ── Animated styles ──

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: cardScale.value },
    ],
    opacity: cardOpacity.value,
  }));

  const artistNames =
    release?.artists?.map((a: { name: string }) => a.name).join(", ") ??
    t("release.unknownArtist");

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        {/* Folder filter chips — frosted glass pills */}
        <View style={styles.chipBar}>
          <BlurView intensity={50} tint="light" style={styles.chipBlur}>
            <View style={styles.chipBackdrop} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              <Pressable
                onPress={() => setSelectedFolder(undefined)}
                style={[
                  styles.chip,
                  selectedFolder === undefined && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedFolder === undefined && styles.chipTextActive,
                  ]}
                >
                  {t("random.all")}
                </Text>
              </Pressable>
              {folders
                .filter((f) => f.id !== 0)
                .map((folder) => (
                  <Pressable
                    key={folder.id}
                    onPress={() => setSelectedFolder(folder.id)}
                    style={[
                      styles.chip,
                      selectedFolder === folder.id && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedFolder === folder.id && styles.chipTextActive,
                      ]}
                    >
                      {folder.name}
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>
          </BlurView>
        </View>

        {/* Release display */}
        {release ? (
          <View {...panResponder.panHandlers}>
            <Animated.View style={[styles.releaseContainer, cardAnimStyle]}>
              <Pressable
                onPress={() => router.push(`/release/${release.releaseId}`)}
                style={styles.releaseInner}
              >
                <View
                  style={[
                    styles.artworkShadow,
                    { width: coverSize, height: coverSize },
                  ]}
                >
                  <Image
                    source={{
                      uri: release.coverUrl || release.thumbUrl || undefined,
                    }}
                    style={{
                      width: coverSize,
                      height: coverSize,
                      borderRadius: 16,
                    }}
                    contentFit="cover"
                    transition={300}
                  />
                </View>
                <Text style={styles.title}>{release.title}</Text>
                <Text style={styles.artist}>{artistNames}</Text>
                {release.year ? (
                  <Text style={styles.year}>{release.year}</Text>
                ) : null}
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyDiceCircle}>
              <Dices size={56} color="#F97316" strokeWidth={1.2} />
            </View>
            <Text style={styles.emptyTitle}>{t("random.feelingLucky")}</Text>
            <Text style={styles.emptyMessage}>
              {t("random.feelingLuckyMessage")}
            </Text>
          </View>
        )}

        {/* Pick button */}
        <View style={styles.buttonWrapper}>
          <AnimatedPressable onPress={pick} style={styles.buttonOuter}>
            <BlurView intensity={70} tint="light" style={styles.buttonBlur}>
              <View style={styles.buttonFill} />
              <View style={styles.buttonContent}>
                <Dices size={20} color="#fff" strokeWidth={2} />
                <Text style={styles.buttonText}>{t("random.pickRandom")}</Text>
              </View>
            </BlurView>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Folder chips ── */
  chipBar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipBlur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  chipBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  chipScroll: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  chipActive: {
    backgroundColor: "#F97316",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "GeistMono-Regular",
    color: "#9CA3AF",
  },
  chipTextActive: {
    fontFamily: "GeistMono-Bold",
    color: "#FFFFFF",
  },

  /* ── Release display ── */
  releaseContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  releaseInner: {
    alignItems: "center",
  },
  artworkShadow: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontFamily: "GeistMono-Bold",
    fontSize: 20,
    color: "#111827",
    textAlign: "center",
  },
  artist: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  year: {
    fontFamily: "GeistMono-Regular",
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },

  /* ── Empty state ── */
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 72,
    paddingHorizontal: 32,
  },
  emptyDiceCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(249,115,22,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "GeistMono-Bold",
    fontSize: 22,
    color: "#111827",
  },
  emptyMessage: {
    fontFamily: "Inter-Regular",
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },

  /* ── Pick button ── */
  buttonWrapper: {
    paddingHorizontal: 24,
    marginTop: 28,
  },
  buttonOuter: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonBlur: {
    borderRadius: 18,
    overflow: "hidden",
  },
  buttonFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F97316",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  buttonText: {
    fontFamily: "GeistMono-Bold",
    fontSize: 17,
    color: "#FFFFFF",
  },
});
