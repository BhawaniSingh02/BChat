import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { View } from 'react-native';
import ChatsScreen from '../screens/ChatsScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useTheme } from '../theme/ThemeContext';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabIcon: Record<keyof MainTabParamList, keyof typeof Feather.glyphMap> = {
  Chats: 'message-square',
  Calls: 'phone',
  Contacts: 'users',
  Settings: 'settings',
};

export default function MainTabs() {
  const { tokens } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: tokens.background, borderTopWidth: 0, height: 64, paddingTop: 10 },
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
      <Tab.Screen name="Calls">{() => <PlaceholderScreen title="Calls" />}</Tab.Screen>
      <Tab.Screen name="Contacts">{() => <PlaceholderScreen title="Contacts" />}</Tab.Screen>
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
