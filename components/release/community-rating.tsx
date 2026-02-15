import { View, Text } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface CommunityRatingProps {
  rating: number | null;
  have: number | null;
  want: number | null;
}

export function CommunityRating({ rating, have, want }: CommunityRatingProps) {
  if (rating == null && have == null && want == null) return null;

  const stars = rating ? Math.round(rating * 2) / 2 : 0;

  return (
    <View className="flex-row items-center px-4 mt-3">
      {rating != null && (
        <View className="flex-row items-center mr-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <FontAwesome
              key={n}
              name={n <= stars ? "star" : n - 0.5 <= stars ? "star-half-o" : "star-o"}
              size={14}
              color="#4CAF50"
              style={{ marginRight: 2 }}
            />
          ))}
          <Text className="text-gray-400 text-xs ml-1">
            {rating.toFixed(1)}
          </Text>
        </View>
      )}
      {have != null && (
        <Text className="text-gray-500 text-xs mr-3">
          {have.toLocaleString()} have
        </Text>
      )}
      {want != null && (
        <Text className="text-gray-500 text-xs">
          {want.toLocaleString()} want
        </Text>
      )}
    </View>
  );
}
