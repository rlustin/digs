import { Disc3, Dices, Search, Settings, type LucideIcon } from "lucide-react-native";
import { Tabs } from "expo-router";

import { useInitialSync } from "@/hooks/use-sync";
import { FloatingTabBar } from "@/components/ui/tab-bar";

export const unstable_settings = {
  initialRouteName: "collection",
};

function TabBarIcon({ Icon, color }: { Icon: LucideIcon; color: string }) {
  return <Icon size={25} color={color} strokeWidth={1.75} />;
}

export default function TabLayout() {
  useInitialSync();

  return (
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#F97316",
          tabBarInactiveTintColor: "#AAAAAA",
          tabBarStyle: { position: "absolute" },
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerTintColor: "#111",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: "Collection",
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Disc3} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Search} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="random"
          options={{
            title: "Random",
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Dices} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <TabBarIcon Icon={Settings} color={color} />,
          }}
        />
      </Tabs>
  );
}
