import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AccountScreen from '../screens/AccountScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ChooseUsernameScreen from '../screens/ChooseUsernameScreen';
import ConversationScreen from '../screens/ConversationScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import GlobalSearchScreen from '../screens/GlobalSearchScreen';
import GroupInfoScreen from '../screens/GroupInfoScreen';
import HelpScreen from '../screens/HelpScreen';
import MediaGalleryScreen from '../screens/MediaGalleryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import StoryComposerScreen from '../screens/StoryComposerScreen';
import StoryViewerScreen from '../screens/StoryViewerScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import { useAuthStore } from '../store/authStore';
import MainTabs from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((state) => state.token);
  const hasHandle = useAuthStore((state) => !!state.user?.uniqueHandle);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token && hasHandle ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="UserSearch" component={UserSearchScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="GlobalSearch" component={GlobalSearchScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="MediaGallery" component={MediaGalleryScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="GroupInfo" component={GroupInfoScreen} />
          <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="StoryComposer" component={StoryComposerScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
          <Stack.Screen name="CameraCapture" component={CameraCaptureScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        </>
      ) : token ? (
        // Verified but hasn't claimed a public @handle yet — one-time onboarding gate.
        <Stack.Screen name="ChooseUsername" component={ChooseUsernameScreen} />
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
