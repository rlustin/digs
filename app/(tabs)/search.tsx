import { View, TextInput, FlatList } from "react-native";
import { useState, useMemo, useCallback } from "react";

import { searchReleases } from "@/db/queries/releases";
import { ReleaseCard } from "@/components/release/release-card";
import { EmptyState } from "@/components/ui/empty-state";

const ITEM_HEIGHT = 68;

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    try {
      return searchReleases(query);
    } catch {
      return [];
    }
  }, [query]);

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View className="flex-1 bg-black">
      <View className="px-4 pt-2 pb-3">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search artists, albums, labels..."
          placeholderTextColor="#666"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          className="bg-white/10 text-white rounded-xl px-4 py-3 text-base"
        />
      </View>

      {query.trim().length >= 2 && results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No results"
          message={`Nothing found for "${query}"`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.instance_id)}
          getItemLayout={getItemLayout}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <ReleaseCard
              releaseId={item.release_id}
              title={item.title}
              artists={
                typeof item.artists === "string"
                  ? JSON.parse(item.artists)
                  : item.artists
              }
              year={item.year}
              formats={
                typeof item.formats === "string"
                  ? JSON.parse(item.formats)
                  : item.formats
              }
              thumbUrl={item.thumb_url}
            />
          )}
        />
      )}
    </View>
  );
}
