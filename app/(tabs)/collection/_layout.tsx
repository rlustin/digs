import { Stack } from "expo-router";

export default function CollectionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#111",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Collection" }} />
    </Stack>
  );
}
