import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";
import { t } from "@/lib/i18n";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("notFound.title") }} />
      <View className="flex-1 bg-white items-center justify-center p-5">
        <Text className="text-gray-900 text-xl font-mono-bold">
          {t("notFound.message")}
        </Text>
        <Link href="/" className="mt-4 py-4">
          <Text className="text-accent text-sm font-sans">{t("notFound.goHome")}</Text>
        </Link>
      </View>
    </>
  );
}
