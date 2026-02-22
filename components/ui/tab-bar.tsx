import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { CommonActions } from "@react-navigation/native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 8 }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={80} tint="light" style={styles.blur}>
        <View style={styles.backdrop} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];

            // Skip routes hidden from the tab bar (no icon defined)
            if (!options.tabBarIcon) return null;

            const isFocused = state.index === index;
            const color = isFocused ? "#F97316" : "#AAAAAA";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                if (isFocused) {
                  navigation.dispatch({
                    ...CommonActions.reset({
                      index: 0,
                      routes: [{ name: route.name, params: route.params }],
                    }),
                    target: state.routes[index].state?.key,
                  });
                } else {
                  navigation.navigate(route.name, route.params);
                }
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const label = options.title ?? route.name;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.tab}
              >
                {options.tabBarIcon?.({ color, focused: isFocused, size: 22 })}
                <Text style={[styles.label, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  blur: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    paddingVertical: 12,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  label: {
    fontFamily: "GeistMono-Regular",
    fontSize: 10,
    marginTop: 3,
  },
});
