import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import SalesScreen from "@/screens/SalesScreen";
import ReportsScreen from "@/screens/ReportsScreen";
import CashBookScreen from "@/screens/CashBookScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { Colors } from "@/constants/theme";

export type RootTabParamList = {
  Sales: undefined;
  CashBook: undefined;
  Reports: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function RootStackNavigator() {
  const theme = Colors.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerTransparent: true,
        headerTintColor: theme.text,
        headerStyle: {
          backgroundColor: theme.backgroundRoot,
        },
        tabBarActiveTintColor: theme.warmBrown,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.backgroundDefault,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          headerTitle: () => <HeaderTitle title="売上管理" />,
          tabBarLabel: "売上",
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CashBook"
        component={CashBookScreen}
        options={{
          headerTitle: () => <HeaderTitle title="出納帳" />,
          tabBarLabel: "出納帳",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="レポート" />,
          tabBarLabel: "レポート",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
