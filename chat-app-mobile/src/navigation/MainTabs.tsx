import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CallsScreen from '../screens/CallsScreen';
import ChatsScreen from '../screens/ChatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeContext';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
  Chats: 'message-square',
  Calls: 'phone',
  Settings: 'settings',
};

export default function MainTabs() {
  const { tokens } = useTheme();
  // Setting a fixed `height` on tabBarStyle opts out of react-navigation's automatic
  // safe-area handling, so on phones with on-screen nav buttons the bar was rendering
  // flush against (or under) them. Add the bottom inset back in ourselves — on phones
  // with no on-screen buttons (gesture nav / physical buttons) this inset is ~0, so the
  // bar still sits at the true bottom edge instead of leaving a dead gap.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: tokens.background,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingTop: 10,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ focused }) => (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Feather
              name={tabIcon[route.name as keyof MainTabParamList]}
              size={22}
              color={focused ? tokens.text : tokens.tabInactive}
            />
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: focused ? tokens.accent : 'transparent',
              }}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
