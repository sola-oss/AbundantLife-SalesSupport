import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SalesScreen from "@/screens/SalesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";

export type RootStackParamList = {
  Sales: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          headerTitle: () => <HeaderTitle title="売上管理" />,
        }}
      />
    </Stack.Navigator>
  );
}
