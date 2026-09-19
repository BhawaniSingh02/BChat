export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  ChooseUsername: undefined;
  Main: undefined;
  Conversation: { roomId: string; name: string; kind: 'room' | 'dm'; highlightMessageId?: string };
  UserSearch: undefined;
  GlobalSearch: undefined;
  EditProfile: undefined;
  MediaGallery: { roomId: string; name: string };
  UserProfile: { username: string; roomId: string; name: string };
  GroupInfo: { roomId: string; name: string };
  CreateGroup: undefined;
  Account: undefined;
  ChangePassword: undefined;
  Privacy: undefined;
  BlockedUsers: undefined;
  Notifications: undefined;
  Help: undefined;
  StoryComposer: undefined;
  StoryViewer: { startAuthorId: string };
  CameraCapture: undefined;
};

export type MainTabParamList = {
  Chats: undefined;
  Calls: undefined;
  Settings: undefined;
};
