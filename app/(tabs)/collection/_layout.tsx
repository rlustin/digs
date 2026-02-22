import { Stack } from "expo-router";
import { Colors } from "@/constants/Colors";

export default function CollectionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.gray900,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "GeistMono-Regular" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Collection", headerShown: false }} />
    </Stack>
  );
}
