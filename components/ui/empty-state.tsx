import { View, Text } from "react-native";
import { Inbox, type LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Icon size={48} color="#D1D5DB" strokeWidth={1.5} />
      <Text className="text-gray-400 text-lg font-sans-semibold mt-4">{title}</Text>
      {message && (
        <Text className="text-gray-500 text-sm mt-2 text-center font-sans">
          {message}
        </Text>
      )}
    </View>
  );
}
