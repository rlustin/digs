import { View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface EmptyStateProps {
  icon?: React.ComponentProps<typeof FontAwesome>["name"];
  title: string;
  message?: string;
}

export function EmptyState({ icon = "inbox", title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <FontAwesome name={icon} size={48} color="#D1D5DB" />
      <Text className="text-gray-400 text-lg font-semibold mt-4">{title}</Text>
      {message && (
        <Text className="text-gray-500 text-sm mt-2 text-center">
          {message}
        </Text>
      )}
    </View>
  );
}
