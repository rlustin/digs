import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 bg-white items-center justify-center p-5">
        <Text className="text-gray-900 text-xl font-bold">
          This screen doesn't exist.
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-accent text-sm">Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}
