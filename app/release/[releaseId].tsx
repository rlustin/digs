import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CommunityRating } from "@/components/release/community-rating";
import { ImageGallery } from "@/components/release/image-gallery";
import { TrackList } from "@/components/release/track-list";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { db } from "@/db/client";
import { getFolderById } from "@/db/queries/folders";
import { getReleaseByReleaseId } from "@/db/queries/releases";
import { releases } from "@/db/schema";
import { fetchReleaseDetail } from "@/lib/discogs/endpoints";
import { mapReleaseDetailToRow } from "@/lib/sync/detail-mapper";
import { Colors } from "@/constants/Colors";
import { eq } from "drizzle-orm";
import { t } from "@/lib/i18n";

const COVER_WIDTH_RATIO = 0.88;
const COVER_TOP_SPACING = 20;
const BACKDROP_EXTRA = 20;

export default function ReleaseDetailScreen() {
  const { releaseId } = useLocalSearchParams<{ releaseId: string }>();
  const router = useRouter();
  const id = Number(releaseId);
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const coverSize = screenWidth * COVER_WIDTH_RATIO;
  const backdropHeight = insets.top + 44 + COVER_TOP_SPACING + coverSize + BACKDROP_EXTRA;

  const { data: release, refetch } = useQuery({
    queryKey: ["release", id],
    queryFn: () => getReleaseByReleaseId(id),
  });

  const { data: folder } = useQuery({
    queryKey: ["folder", release?.folderId],
    queryFn: () => getFolderById(release!.folderId),
    enabled: !!release && release.folderId !== 0,
  });

  // On-demand detail fetch if not yet synced
  const { isLoading: fetchingDetail } = useQuery({
    queryKey: ["release-detail-fetch", id],
    queryFn: async () => {
      const detail = await fetchReleaseDetail(id);
      db.update(releases)
        .set(mapReleaseDetailToRow(detail))
        .where(eq(releases.releaseId, id))
        .run();
      refetch();
      return true;
    },
    enabled: !!release && !release.detailSyncedAt,
  });

  if (!release) {
    return <DetailSkeleton />;
  }

  const coverUrl = release.coverUrl || release.thumbUrl || undefined;

  const artistNames =
    release.artists?.map((a: { name: string }) => a.name).join(", ") ??
    t("release.unknownArtist");

  const formatDesc = release.formats
    ?.map(
      (f: { name: string; descriptions?: string[] }) =>
        f.descriptions?.join(", ") ?? f.name
    )
    .join(" / ");

  const genresAndStyles = [
    ...(release.genres ?? []),
    ...(release.styles ?? []),
  ].join(", ");

  const tracklist =
    (release.tracklist as {
      position: string;
      title: string;
      duration: string;
    }[]) ?? [];
  const images =
    (release.images as {
      type: string;
      uri: string;
      width: number;
      height: number;
    }[]) ?? [];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-10">
      {/* Immersive header */}
      <View style={{ height: backdropHeight }}>
        {/* Blurred backdrop */}
        <Image
          source={{ uri: coverUrl }}
          style={{ width: screenWidth, height: backdropHeight }}
          contentFit="cover"
          blurRadius={25}
          transition={300}
        />

        {/* Gradient fade to white */}
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.6)", "#fff"]}
          locations={[0.3, 0.7, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: backdropHeight * 0.5,
          }}
        />

        {/* Floating cover art */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 44 + COVER_TOP_SPACING,
            left: (screenWidth - coverSize) / 2,
            width: coverSize,
            height: coverSize,
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 10,
          }}
        >
          <Image
            source={{ uri: coverUrl }}
            style={{
              width: coverSize,
              height: coverSize,
              borderRadius: 12,
            }}
            contentFit="cover"
            transition={300}
          />
        </View>
      </View>

      {/* Title block */}
      <View className="px-4 mt-3">
        <Text className="text-gray-900 text-2xl font-mono-bold">
          {release.title}
        </Text>
        <Text className="text-gray-400 text-base mt-1 font-sans">{artistNames}</Text>
        <View className="flex-row items-center mt-2">
          {release.year ? (
            <Text className="text-gray-500 text-sm font-mono">{release.year}</Text>
          ) : null}
          {release.year && formatDesc ? (
            <Text className="text-gray-600 text-sm mx-2 font-mono">·</Text>
          ) : null}
          {formatDesc ? (
            <Text className="text-gray-500 text-sm font-mono">{formatDesc}</Text>
          ) : null}
        </View>
        {release.labels && release.labels.length > 0 && (
          <Text className="text-gray-500 text-sm mt-1">
            {release.labels.map(
              (l: { name: string; catno: string }, i: number) => (
                <Text key={i}>
                  {i > 0 && ", "}
                  <Text className="font-sans">{l.name}</Text>
                  {l.catno ? (
                    <Text className="font-mono"> — {l.catno}</Text>
                  ) : null}
                </Text>
              )
            )}
          </Text>
        )}
        {genresAndStyles ? (
          <Text className="text-gray-500 text-sm mt-1">{genresAndStyles}</Text>
        ) : null}

        {/* Folder badge + community rating on same row */}
        <View className="flex-row items-center mt-2">
          {folder ? (
            <Pressable
              onPress={() => router.navigate(`/(tabs)/collection/${folder.id}`)}
              className="bg-accent rounded-full px-3 py-1 mr-3 active:opacity-70"
            >
              <Text className="text-white text-sm font-mono">
                {folder.name}
              </Text>
            </Pressable>
          ) : null}
          <CommunityRating
            rating={release.communityRating}
            have={release.communityHave}
            want={release.communityWant}
          />
        </View>
      </View>

      {/* Loading indicator for on-demand detail fetch */}
      {fetchingDetail && (
        <View className="flex-row items-center justify-center mt-4">
          <ActivityIndicator color={Colors.accent} size="small" />
          <Text className="text-gray-400 text-sm ml-2 font-sans">
            {t("release.loadingDetails")}
          </Text>
        </View>
      )}

      {/* Tracklist */}
      {tracklist.length > 0 && <TrackList tracks={tracklist} />}

      {/* Image gallery */}
      {images.length > 1 && <ImageGallery images={images} />}
    </ScrollView>
  );
}
