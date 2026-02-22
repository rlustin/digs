import { View, Text } from "react-native";
import { Star, StarHalf } from "lucide-react-native";
import { t } from "@/lib/i18n";

interface CommunityRatingProps {
  rating: number | null;
  have: number | null;
  want: number | null;
}

export function CommunityRating({ rating, have, want }: CommunityRatingProps) {
  if (rating == null && have == null && want == null) return null;

  const stars = rating ? Math.round(rating * 2) / 2 : 0;

  return (
    <View className="flex-row items-center">
      {rating != null && (
        <View className="flex-row items-center mr-4">
          {[1, 2, 3, 4, 5].map((n) => {
            const isFull = n <= stars;
            const isHalf = !isFull && n - 0.5 <= stars;
            return isFull ? (
              <Star key={n} size={14} color="#F97316" fill="#F97316" style={{ marginRight: 2 }} />
            ) : isHalf ? (
              <StarHalf key={n} size={14} color="#F97316" fill="#F97316" style={{ marginRight: 2 }} />
            ) : (
              <Star key={n} size={14} color="#F97316" style={{ marginRight: 2 }} />
            );
          })}
          <Text className="text-gray-400 text-xs ml-1 font-mono">
            {rating.toFixed(1)}
          </Text>
        </View>
      )}
      {have != null && (
        <Text className="text-gray-500 text-xs mr-3 font-sans">
          <Text className="font-mono">{have.toLocaleString()}</Text> {t("release.have")}
        </Text>
      )}
      {want != null && (
        <Text className="text-gray-500 text-xs font-sans">
          <Text className="font-mono">{want.toLocaleString()}</Text> {t("release.want")}
        </Text>
      )}
    </View>
  );
}
