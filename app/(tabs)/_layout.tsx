import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { FontFamily, FontSize } from "../../constants/typography";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons name={name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.sansMedium,
          fontSize: FontSize.xs,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="analyze"
        options={{
          title: "Score",
          tabBarIcon: ({ color }) => (
            <TabIcon name="speedometer-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: "Generate",
          tabBarIcon: ({ color }) => (
            <TabIcon name="create-outline" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="trends"
        options={{
          title: "Trends",
          tabBarIcon: ({ color }) => (
            <TabIcon name="trending-up-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <TabIcon name="calendar-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <TabIcon name="settings-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="leads" options={{ href: null }} />
    </Tabs>
  );
}
