import { View, TextInput, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import Animated, {
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  interpolate,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import { searchReleases } from "@/db/queries/releases";
import { ReleaseCard } from "@/components/release/release-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Search } from "lucide-react-native";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

const ITEM_HEIGHT = 104;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const focusProgress = useSharedValue(0);
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();

  useEffect(() => {
    return navigation.addListener("tabPress", () => {
      if (navigation.isFocused()) {
        inputRef.current?.focus();
      }
    });
  }, [navigation]);

  const handleFocus = useCallback(() => {
    focusProgress.value = withTiming(1, { duration: 200 });
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    focusProgress.value = withTiming(0, { duration: 200 });
  }, [focusProgress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ["rgba(0,0,0,0.06)", "rgba(249,115,22,0.3)"]
    ),
    shadowOpacity: interpolate(focusProgress.value, [0, 1], [0, 0.15]),
  }));

  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (debouncedQuery.trim().length < 2) return [];
    try {
      return searchReleases(debouncedQuery);
    } catch {
      return [];
    }
  }, [debouncedQuery]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View style={styles.searchWrapper}>
        <Animated.View
          style={[styles.inputContainer, animatedContainerStyle]}
        >
          <BlurView intensity={60} tint="light" style={styles.blur}>
            <View style={styles.backdrop} />
            <View style={styles.inputRow}>
              <AnimatedSearchIcon size={20} progress={focusProgress} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={t("search.placeholder")}
                placeholderTextColor={Colors.gray400}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                clearButtonMode="while-editing"
                style={styles.input}
              />
            </View>
          </BlurView>
        </Animated.View>
      </View>

      {debouncedQuery.trim().length >= 2 && results.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("search.noResults")}
          message={t("search.nothingFoundFor", { query })}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.instanceId)}
          getItemLayout={getItemLayout}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 90 }}
          renderItem={({ item }) => (
            <ReleaseCard
              releaseId={item.releaseId}
              title={item.title}
              artists={item.artists}
              year={item.year}
              formats={item.formats}
              thumbUrl={item.thumbUrl}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AnimatedSearchIcon({
  size,
  progress,
}: {
  size: number;
  progress: SharedValue<number>;
}) {
  // Since we can't directly animate the color prop of Lucide icons,
  // we render two icons and crossfade them
  const unfocusedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    position: "absolute" as const,
  }));

  const focusedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    position: "absolute" as const,
  }));

  return (
    <View style={{ width: size, height: size, marginRight: 10 }}>
      <Animated.View style={unfocusedStyle}>
        <Search size={size} color={Colors.gray400} />
      </Animated.View>
      <Animated.View style={focusedStyle}>
        <Search size={size} color={Colors.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0,
    elevation: 0,
  },
  blur: {
    overflow: "hidden",
    borderRadius: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter-Regular",
    color: Colors.gray900,
    paddingVertical: 14,
  },
});
