// jest-expo's preset already mocks the standard Expo native modules (expo-av,
// expo-notifications, etc.) and React Native's own native surface. react-native-webrtc
// isn't an Expo module, so it gets its own manual mock at __mocks__/react-native-webrtc.js
// instead, which Jest picks up automatically for every test.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

export {};
