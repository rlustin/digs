import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

import { useInitialSync } from "@/hooks/use-sync";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  useInitialSync();

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: "#888",
          tabBarStyle: {
            backgroundColor: "#111111",
            borderTopColor: "#222",
          },
          headerStyle: { backgroundColor: "#111111" },
          headerTintColor: "#fff",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Collection",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="th-list" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="folder/[folderId]"
          options={{
            href: null, // Hidden from tab bar, navigated to from Collection
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="search" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="random"
          options={{
            title: "Random",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="random" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
          }}
        />
      </Tabs>
  );
}
