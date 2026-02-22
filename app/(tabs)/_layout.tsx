import { Disc3, Dices, Search, Settings, type LucideIcon } from "lucide-react-native";
import { Tabs } from "expo-router";

import { useInitialSync } from "@/hooks/use-sync";
import { FloatingTabBar } from "@/components/ui/tab-bar";
import { Colors } from "@/constants/Colors";
import { t } from "@/lib/i18n";

export const unstable_settings = {
  initialRouteName: "collection",
};

function TabBarIcon({ Icon, color }: { Icon: LucideIcon; color: string }) {
  return <Icon size={22} color={color} strokeWidth={1.75} />;
}

export default function TabLayout() {
  useInitialSync();

  return (
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.gray400,
          tabBarStyle: { position: "absolute" },
          headerStyle: { backgroundColor: Colors.white },
          headerTintColor: Colors.gray900,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="collection"
          options={{
            title: t("tabs.collection"),
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Disc3} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t("tabs.search"),
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Search} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="random"
          options={{
            title: t("tabs.random"),
            headerShown: false,
            tabBarIcon: ({ color }) => (
              <TabBarIcon Icon={Dices} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t("tabs.settings"),
            headerShown: false,
            tabBarIcon: ({ color }) => <TabBarIcon Icon={Settings} color={color} />,
          }}
        />
      </Tabs>
  );
}
