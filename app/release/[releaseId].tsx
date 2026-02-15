import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";

import { getReleaseByReleaseId } from "@/db/queries/releases";
import { fetchReleaseDetail } from "@/lib/discogs/endpoints";
import { TrackList } from "@/components/release/track-list";
import { CommunityRating } from "@/components/release/community-rating";
import { ImageGallery } from "@/components/release/image-gallery";
import { DetailSkeleton } from "@/components/ui/detail-skeleton";
import { db } from "@/db/client";
import { releases } from "@/db/schema";
import { eq } from "drizzle-orm";

export default function ReleaseDetailScreen() {
  const { releaseId } = useLocalSearchParams<{ releaseId: string }>();
  const id = Number(releaseId);

  const { data: release, refetch } = useQuery({
    queryKey: ["release", id],
    queryFn: () => getReleaseByReleaseId(id),
  });

  // On-demand detail fetch if not yet synced
  const { isLoading: fetchingDetail } = useQuery({
    queryKey: ["release-detail-fetch", id],
    queryFn: async () => {
      const detail = await fetchReleaseDetail(id);
      db.update(releases)
        .set({
          tracklist: detail.tracklist.map((t) => ({
            position: t.position,
            title: t.title,
            duration: t.duration,
          })),
          images: detail.images?.map((img) => ({
            type: img.type,
            uri: img.uri,
            width: img.width,
            height: img.height,
          })),
          communityRating: detail.community?.rating?.average ?? null,
          communityHave: detail.community?.have ?? null,
          communityWant: detail.community?.want ?? null,
          videos: detail.videos?.map((v) => ({
            uri: v.uri,
            title: v.title,
            duration: v.duration,
          })),
          detailSyncedAt: new Date().toISOString(),
        })
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

  const artistNames =
    release.artists?.map((a: { name: string }) => a.name).join(", ") ??
    "Unknown Artist";

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

  const tracklist = (release.tracklist as { position: string; title: string; duration: string }[]) ?? [];
  const images = (release.images as { type: string; uri: string; width: number; height: number }[]) ?? [];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-10">
      {/* Hero image */}
      <Image
        source={{ uri: release.coverUrl || release.thumbUrl || undefined }}
        style={{ width: "100%", aspectRatio: 1 }}
        contentFit="cover"
        transition={300}
      />

      {/* Title block */}
      <View className="px-4 mt-4">
        <Text className="text-gray-900 text-2xl font-bold">{release.title}</Text>
        <Text className="text-gray-400 text-base mt-1">{artistNames}</Text>
        <View className="flex-row items-center mt-2">
          {release.year ? (
            <Text className="text-gray-500 text-sm">{release.year}</Text>
          ) : null}
          {release.year && formatDesc ? (
            <Text className="text-gray-600 text-sm mx-2">·</Text>
          ) : null}
          {formatDesc ? (
            <Text className="text-gray-500 text-sm">{formatDesc}</Text>
          ) : null}
        </View>
        {release.labels && release.labels.length > 0 && (
          <Text className="text-gray-500 text-sm mt-1">
            {release.labels
              .map(
                (l: { name: string; catno: string }) =>
                  `${l.name}${l.catno ? ` — ${l.catno}` : ""}`
              )
              .join(", ")}
          </Text>
        )}
        {genresAndStyles ? (
          <Text className="text-gray-500 text-sm mt-1">{genresAndStyles}</Text>
        ) : null}
      </View>

      {/* Community rating */}
      <CommunityRating
        rating={release.communityRating}
        have={release.communityHave}
        want={release.communityWant}
      />

      {/* Loading indicator for on-demand detail fetch */}
      {fetchingDetail && (
        <View className="flex-row items-center justify-center mt-4">
          <ActivityIndicator color="#F97316" size="small" />
          <Text className="text-gray-400 text-sm ml-2">
            Loading details...
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
